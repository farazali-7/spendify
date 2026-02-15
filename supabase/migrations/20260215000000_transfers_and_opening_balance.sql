-- ============================================================================
-- SPENDIFY: Transfers & Opening Balance Migration
-- Migration: 20260215000000_transfers_and_opening_balance
--
-- CHANGES:
--   1. Add 'transfer' transaction type
--   2. Add transfer_from_account_id / transfer_to_account_id columns
--   3. Add opening_balance column to accounts
--   4. Make category_id nullable (transfers don't use categories)
--   5. Update all computed balance functions
--   6. Update validation triggers
--
-- INVARIANTS PRESERVED:
--   - Transfers do NOT affect income/expense/savings analytics
--   - Opening balance does NOT count as income
--   - Both affect account balances only
--   - All existing liability logic unchanged
-- ============================================================================


-- ============================================================================
-- SECTION 1: EXTEND TRANSACTION TYPE ENUM
-- ============================================================================

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'transfer';


-- ============================================================================
-- SECTION 2: ADD TRANSFER COLUMNS TO TRANSACTIONS
-- ============================================================================

ALTER TABLE transactions
  ADD COLUMN transfer_from_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  ADD COLUMN transfer_to_account_id   UUID REFERENCES accounts(id) ON DELETE RESTRICT;

-- Transfer rows MUST have both from/to and they must differ.
-- Non-transfer rows MUST NOT have from/to set.
ALTER TABLE transactions ADD CONSTRAINT chk_transfer_fields CHECK (
  (
    type = 'transfer'
    AND transfer_from_account_id IS NOT NULL
    AND transfer_to_account_id IS NOT NULL
    AND transfer_from_account_id != transfer_to_account_id
  )
  OR
  (
    type != 'transfer'
    AND transfer_from_account_id IS NULL
    AND transfer_to_account_id IS NULL
  )
);

-- Indexes for balance computation on transfer accounts
CREATE INDEX idx_transactions_transfer_to
  ON transactions(transfer_to_account_id)
  WHERE transfer_to_account_id IS NOT NULL;

CREATE INDEX idx_transactions_transfer_from
  ON transactions(transfer_from_account_id)
  WHERE transfer_from_account_id IS NOT NULL;


-- ============================================================================
-- SECTION 3: MAKE CATEGORY_ID NULLABLE FOR TRANSFERS
--
-- Transfers are account-to-account movements with no category semantics.
-- Income/expense transactions still require a category.
-- ============================================================================

ALTER TABLE transactions ALTER COLUMN category_id DROP NOT NULL;

ALTER TABLE transactions ADD CONSTRAINT chk_category_required CHECK (
  (type = 'transfer' AND category_id IS NULL)
  OR
  (type != 'transfer' AND category_id IS NOT NULL)
);


-- ============================================================================
-- SECTION 4: ADD OPENING BALANCE TO ACCOUNTS
--
-- Represents the starting balance when an account is first tracked.
-- Included in balance computation but NEVER counted as income.
-- ============================================================================

ALTER TABLE accounts
  ADD COLUMN opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0;


-- ============================================================================
-- SECTION 5: UPDATE BALANCE COMPUTATION FUNCTIONS
--
-- Both functions now:
--   - Include opening_balance
--   - Handle transfer debits (from) and credits (to)
-- ============================================================================

-- 5.1  Single account balance
CREATE OR REPLACE FUNCTION get_account_balance(p_account_id UUID)
RETURNS NUMERIC(15, 2) AS $$
  SELECT
    a.opening_balance + COALESCE(
      (
        SELECT SUM(
          CASE
            WHEN t.type = 'income'   AND t.account_id = p_account_id THEN t.amount
            WHEN t.type = 'expense'  AND t.account_id = p_account_id THEN -t.amount
            WHEN t.type = 'transfer' AND t.transfer_from_account_id = p_account_id THEN -t.amount
            WHEN t.type = 'transfer' AND t.transfer_to_account_id   = p_account_id THEN  t.amount
            ELSE 0
          END
        )
        FROM transactions t
        WHERE t.account_id = p_account_id
           OR t.transfer_from_account_id = p_account_id
           OR t.transfer_to_account_id = p_account_id
      ),
      0
    )
  FROM accounts a
  WHERE a.id = p_account_id;
$$ LANGUAGE sql STABLE;


-- 5.2  All account balances for a user
CREATE OR REPLACE FUNCTION get_all_account_balances(p_user_id UUID)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  type        account_type,
  balance     NUMERIC(15, 2),
  created_at  TIMESTAMPTZ
) AS $$
  SELECT
    a.id,
    a.name,
    a.type,
    a.opening_balance + COALESCE(
      (
        SELECT SUM(
          CASE
            WHEN t.type = 'income'   AND t.account_id = a.id THEN t.amount
            WHEN t.type = 'expense'  AND t.account_id = a.id THEN -t.amount
            WHEN t.type = 'transfer' AND t.transfer_from_account_id = a.id THEN -t.amount
            WHEN t.type = 'transfer' AND t.transfer_to_account_id   = a.id THEN  t.amount
            ELSE 0
          END
        )
        FROM transactions t
        WHERE t.account_id = a.id
           OR t.transfer_from_account_id = a.id
           OR t.transfer_to_account_id = a.id
      ),
      0
    ) AS balance,
    a.created_at
  FROM accounts a
  WHERE a.user_id = p_user_id
  ORDER BY a.created_at;
$$ LANGUAGE sql STABLE;


-- ============================================================================
-- SECTION 6: UPDATE VALIDATION TRIGGERS
-- ============================================================================

-- 6.1  Skip category validation for transfers
CREATE OR REPLACE FUNCTION validate_category_transaction_type()
RETURNS TRIGGER AS $$
DECLARE
  v_category_type category_type;
BEGIN
  -- Transfers don't use categories
  IF NEW.type = 'transfer' THEN
    RETURN NEW;
  END IF;

  SELECT type INTO v_category_type
  FROM categories
  WHERE id = NEW.category_id;

  IF v_category_type IS NULL THEN
    RAISE EXCEPTION 'Category not found: %', NEW.category_id;
  END IF;

  IF v_category_type::TEXT != NEW.type::TEXT THEN
    RAISE EXCEPTION 'Category type "%" does not match transaction type "%"',
      v_category_type, NEW.type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 6.2  Handle transfer ownership validation
CREATE OR REPLACE FUNCTION validate_transaction_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- For transfers, validate both source and destination accounts
  IF NEW.type = 'transfer' THEN
    IF NOT EXISTS (
      SELECT 1 FROM accounts
      WHERE id = NEW.transfer_from_account_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Source account % does not belong to user %',
        NEW.transfer_from_account_id, NEW.user_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM accounts
      WHERE id = NEW.transfer_to_account_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Destination account % does not belong to user %',
        NEW.transfer_to_account_id, NEW.user_id;
    END IF;

    RETURN NEW;
  END IF;

  -- Regular income/expense: validate account ownership
  IF NOT EXISTS (
    SELECT 1 FROM accounts WHERE id = NEW.account_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Account % does not belong to user %',
      NEW.account_id, NEW.user_id;
  END IF;

  -- Validate category ownership (only for non-transfer types)
  IF NEW.category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM categories WHERE id = NEW.category_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Category % does not belong to user %',
      NEW.category_id, NEW.user_id;
  END IF;

  -- Validate liability ownership if referenced
  IF NEW.liability_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM liabilities WHERE id = NEW.liability_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Liability % does not belong to user %',
        NEW.liability_id, NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
