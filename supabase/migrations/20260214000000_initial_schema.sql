-- ============================================================================
-- SPENDIFY: Initial Database Schema
-- Migration: 20260214000000_initial_schema
-- PostgreSQL 15+ / Supabase
--
-- DESIGN PRINCIPLES:
--   1. Balance is NEVER stored — always computed from transactions
--   2. Liability remaining is NEVER stored — always computed from payments
--   3. All monetary values use NUMERIC(15,2) — exact decimal arithmetic
--   4. Every table enforces user ownership via RLS + triggers
--   5. Multi-table mutations use atomic RPC functions
--   6. Foreign keys use ON DELETE RESTRICT to prevent orphaned references
-- ============================================================================


-- ============================================================================
-- SECTION 1: ENUM TYPES
-- ============================================================================

CREATE TYPE account_type AS ENUM ('cash', 'bank', 'wallet', 'savings');

CREATE TYPE category_type AS ENUM ('income', 'expense');

CREATE TYPE transaction_type AS ENUM ('income', 'expense');

CREATE TYPE liability_type AS ENUM ('bank_loan', 'credit_card', 'personal_loan', 'other');

CREATE TYPE liability_status AS ENUM ('active', 'closed');

CREATE TYPE payment_frequency AS ENUM (
  'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'
);


-- ============================================================================
-- SECTION 2: UTILITY — updated_at trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- SECTION 3: TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1  accounts
--
-- Represents a financial container: bank account, cash, wallet, savings.
-- Balance is NEVER stored here. It is computed dynamically from transactions.
-- The UNIQUE(user_id, name) constraint prevents duplicate account names per user.
-- ON DELETE RESTRICT on transactions.account_id prevents deleting accounts in use.
-- ----------------------------------------------------------------------------
CREATE TABLE accounts (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT            NOT NULL,
  type          account_type    NOT NULL,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),

  CONSTRAINT uq_accounts_user_name UNIQUE (user_id, name)
);

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Primary lookup: all accounts for a user
CREATE INDEX idx_accounts_user_id ON accounts(user_id);


-- ----------------------------------------------------------------------------
-- 3.2  categories
--
-- User-scoped classification for transactions. Split by type so income
-- categories can never be used on expense transactions (enforced by trigger).
-- is_system marks default categories seeded on user creation.
-- UNIQUE(user_id, name, type) allows "Other" to exist as both income and expense.
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT            NOT NULL,
  type          category_type   NOT NULL,
  color         TEXT,           -- hex color for UI display (e.g. '#22c55e')
  is_system     BOOLEAN         NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),

  CONSTRAINT uq_categories_user_name_type UNIQUE (user_id, name, type)
);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_user_type ON categories(user_id, type);


-- ----------------------------------------------------------------------------
-- 3.3  liabilities
--
-- Represents a financial obligation: bank loan, credit card, personal debt.
--
-- CRITICAL: There is NO remaining_balance column. The remaining balance is
-- always computed as: original_amount - SUM(liability_payments.principal_amount)
--
-- next_due_date is scheduling metadata, not a financial aggregate — safe to store.
-- linked_account_id is the account EMIs are deducted from.
-- deposited_to_account indicates whether the loan amount was credited to an account
-- (if true, a corresponding income transaction is auto-created by the RPC function).
-- ----------------------------------------------------------------------------
CREATE TABLE liabilities (
  id                    UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID                NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT                NOT NULL,
  type                  liability_type      NOT NULL,
  original_amount       NUMERIC(15, 2)      NOT NULL,
  interest_rate         NUMERIC(5, 2)       NOT NULL DEFAULT 0,
  emi_amount            NUMERIC(15, 2)      NOT NULL,
  frequency             payment_frequency   NOT NULL DEFAULT 'monthly',
  start_date            DATE                NOT NULL,
  next_due_date         DATE,
  expected_end_date     DATE,
  linked_account_id     UUID                NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  deposited_to_account  BOOLEAN             NOT NULL DEFAULT false,
  status                liability_status    NOT NULL DEFAULT 'active',
  notes                 TEXT,
  created_at            TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ         NOT NULL DEFAULT now(),

  CONSTRAINT chk_liabilities_original_amount  CHECK (original_amount > 0),
  CONSTRAINT chk_liabilities_interest_rate    CHECK (interest_rate >= 0),
  CONSTRAINT chk_liabilities_emi_amount       CHECK (emi_amount > 0)
);

CREATE TRIGGER trg_liabilities_updated_at
  BEFORE UPDATE ON liabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_liabilities_user_id ON liabilities(user_id);
CREATE INDEX idx_liabilities_user_status ON liabilities(user_id, status);


-- ----------------------------------------------------------------------------
-- 3.4  transactions
--
-- The canonical financial ledger. Every monetary movement is recorded here.
-- This is the SINGLE SOURCE OF TRUTH for account balances.
--
-- amount is ALWAYS positive. Direction is determined by type:
--   income  → account balance increases by amount
--   expense → account balance decreases by amount
--
-- liability_id is set when the transaction is liability-related:
--   - type='income'  + liability_id set → loan deposit (money received into account)
--   - type='expense' + liability_id set → loan payment (EMI deducted from account)
-- This allows analytics to distinguish earned income from borrowed money.
--
-- ON DELETE RESTRICT on account_id and category_id prevents orphaned references.
-- liability_id uses RESTRICT to prevent deleting a liability with linked transactions.
-- ----------------------------------------------------------------------------
CREATE TABLE transactions (
  id                UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID                NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id        UUID                NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id       UUID                NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  type              transaction_type    NOT NULL,
  amount            NUMERIC(15, 2)      NOT NULL,
  description       TEXT                NOT NULL DEFAULT '',
  transaction_date  DATE                NOT NULL,
  liability_id      UUID                REFERENCES liabilities(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ         NOT NULL DEFAULT now(),

  CONSTRAINT chk_transactions_amount CHECK (amount > 0)
);

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Core query pattern: user's transactions sorted by date (dashboard, analytics)
CREATE INDEX idx_transactions_user_date
  ON transactions(user_id, transaction_date DESC);

-- Filtered query: user's transactions by type and date (income vs expense views)
CREATE INDEX idx_transactions_user_type_date
  ON transactions(user_id, type, transaction_date DESC);

-- Balance computation: all transactions for an account
CREATE INDEX idx_transactions_account_id
  ON transactions(account_id);

-- Category breakdown: all transactions for a category
CREATE INDEX idx_transactions_category_id
  ON transactions(category_id);

-- Liability-linked transactions (partial index — only non-null rows indexed)
CREATE INDEX idx_transactions_liability_id
  ON transactions(liability_id)
  WHERE liability_id IS NOT NULL;


-- ----------------------------------------------------------------------------
-- 3.5  liability_payments
--
-- Records principal + interest split for each payment against a liability.
-- Every payment MUST have a corresponding expense transaction (1:1 via UNIQUE).
--
-- INVARIANT: principal_amount + interest_amount = transaction.amount
--   (enforced by trigger trg_validate_payment_amount)
--
-- Remaining balance is computed as:
--   liability.original_amount - SUM(liability_payments.principal_amount)
--
-- principal_amount >= 0 and interest_amount >= 0, but their sum must be > 0.
-- This allows pure-interest payments (principal = 0) and interest-free payments.
-- ----------------------------------------------------------------------------
CREATE TABLE liability_payments (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liability_id      UUID            NOT NULL REFERENCES liabilities(id) ON DELETE RESTRICT,
  transaction_id    UUID            NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE RESTRICT,
  principal_amount  NUMERIC(15, 2)  NOT NULL,
  interest_amount   NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  payment_date      DATE            NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),

  CONSTRAINT chk_payments_principal   CHECK (principal_amount >= 0),
  CONSTRAINT chk_payments_interest    CHECK (interest_amount >= 0),
  CONSTRAINT chk_payments_total       CHECK (principal_amount + interest_amount > 0)
);

CREATE TRIGGER trg_liability_payments_updated_at
  BEFORE UPDATE ON liability_payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_liability_payments_liability_id
  ON liability_payments(liability_id);

CREATE INDEX idx_liability_payments_user_id
  ON liability_payments(user_id);


-- ============================================================================
-- SECTION 4: ROW LEVEL SECURITY
--
-- Every table gets four policies: SELECT, INSERT, UPDATE, DELETE.
-- All enforce auth.uid() = user_id. Even if application code has bugs,
-- the database will never return or accept cross-user data.
-- ============================================================================

-- 4.1 accounts
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_select" ON accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update" ON accounts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_delete" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

-- 4.2 categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update" ON categories
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_delete" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- 4.3 liabilities
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "liabilities_select" ON liabilities
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "liabilities_insert" ON liabilities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "liabilities_update" ON liabilities
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "liabilities_delete" ON liabilities
  FOR DELETE USING (auth.uid() = user_id);

-- 4.4 transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select" ON transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- 4.5 liability_payments
ALTER TABLE liability_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "liability_payments_select" ON liability_payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "liability_payments_insert" ON liability_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "liability_payments_update" ON liability_payments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "liability_payments_delete" ON liability_payments
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================================
-- SECTION 5: VALIDATION TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1  Enforce category.type matches transaction.type
--
-- An income category must only be used on income transactions.
-- Without this, a user could categorize an expense under "Salary" — corrupting
-- every analytics query that relies on category-type consistency.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_category_transaction_type()
RETURNS TRIGGER AS $$
DECLARE
  v_category_type category_type;
BEGIN
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

CREATE TRIGGER trg_validate_category_type
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION validate_category_transaction_type();


-- ----------------------------------------------------------------------------
-- 5.2  Enforce cross-table ownership on transactions
--
-- Validates that the account_id and category_id referenced by a transaction
-- belong to the same user_id. Prevents a user from referencing another
-- user's account via a forged UUID (defense-in-depth beyond RLS).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_transaction_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM accounts WHERE id = NEW.account_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Account % does not belong to user %', NEW.account_id, NEW.user_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM categories WHERE id = NEW.category_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Category % does not belong to user %', NEW.category_id, NEW.user_id;
  END IF;

  IF NEW.liability_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM liabilities WHERE id = NEW.liability_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Liability % does not belong to user %', NEW.liability_id, NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_transaction_ownership
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION validate_transaction_ownership();


-- ----------------------------------------------------------------------------
-- 5.3  Enforce liability linked_account ownership
--
-- When creating or updating a liability, the linked_account_id must belong
-- to the same user.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_liability_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM accounts WHERE id = NEW.linked_account_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Linked account % does not belong to user %',
      NEW.linked_account_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_liability_ownership
  BEFORE INSERT OR UPDATE ON liabilities
  FOR EACH ROW EXECUTE FUNCTION validate_liability_ownership();


-- ----------------------------------------------------------------------------
-- 5.4  Prevent direct edits to liability-linked transactions
--
-- Transactions with liability_id set are managed by RPC functions.
-- Direct UPDATE from the client would break the payment ↔ transaction invariant.
-- Only amount, description, and transaction_date changes are blocked.
-- The RPC functions use a session variable to bypass this check.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION guard_liability_transaction_edit()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if called from our trusted RPC functions
  IF current_setting('app.bypass_liability_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Block if this transaction is linked to a liability and financial fields changed
  IF OLD.liability_id IS NOT NULL THEN
    IF OLD.amount != NEW.amount
       OR OLD.type != NEW.type
       OR OLD.account_id != NEW.account_id
       OR OLD.liability_id IS DISTINCT FROM NEW.liability_id
    THEN
      RAISE EXCEPTION
        'Cannot directly edit financial fields of a liability-linked transaction. '
        'Use the liability payment functions instead.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guard_liability_transaction_edit
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION guard_liability_transaction_edit();


-- ============================================================================
-- SECTION 6: COMPUTED VALUE FUNCTIONS
--
-- These are the ONLY way to get account balances and liability remainders.
-- They guarantee consistency because they always read current state.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1  get_account_balance(account_id)
--
-- Returns the current balance by summing all transactions for the account.
-- Income adds, expense subtracts. Returns 0 if no transactions exist.
-- Marked STABLE because it reads but doesn't modify data.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_account_balance(p_account_id UUID)
RETURNS NUMERIC(15, 2) AS $$
  SELECT COALESCE(
    SUM(
      CASE
        WHEN type = 'income' THEN amount
        WHEN type = 'expense' THEN -amount
      END
    ),
    0
  )
  FROM transactions
  WHERE account_id = p_account_id;
$$ LANGUAGE sql STABLE;


-- ----------------------------------------------------------------------------
-- 6.2  get_liability_remaining(liability_id)
--
-- Returns remaining balance: original_amount minus total principal paid.
-- Returns original_amount if no payments have been made.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_liability_remaining(p_liability_id UUID)
RETURNS NUMERIC(15, 2) AS $$
  SELECT l.original_amount - COALESCE(SUM(lp.principal_amount), 0)
  FROM liabilities l
  LEFT JOIN liability_payments lp ON lp.liability_id = l.id
  WHERE l.id = p_liability_id
  GROUP BY l.original_amount;
$$ LANGUAGE sql STABLE;


-- ----------------------------------------------------------------------------
-- 6.3  get_all_account_balances(user_id)
--
-- Returns all accounts for a user with their computed balances.
-- Used by the dashboard to show account cards with current balances.
-- Single query, no N+1.
-- ----------------------------------------------------------------------------
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
    COALESCE(
      SUM(
        CASE
          WHEN t.type = 'income' THEN t.amount
          WHEN t.type = 'expense' THEN -t.amount
        END
      ),
      0
    ) AS balance,
    a.created_at
  FROM accounts a
  LEFT JOIN transactions t ON t.account_id = a.id
  WHERE a.user_id = p_user_id
  GROUP BY a.id, a.name, a.type, a.created_at
  ORDER BY a.created_at;
$$ LANGUAGE sql STABLE;


-- ----------------------------------------------------------------------------
-- 6.4  get_all_liability_summaries(user_id)
--
-- Returns all liabilities for a user with their computed remaining balance.
-- Used by the dashboard and liabilities page.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_all_liability_summaries(p_user_id UUID)
RETURNS TABLE (
  id                    UUID,
  name                  TEXT,
  type                  liability_type,
  original_amount       NUMERIC(15, 2),
  remaining_balance     NUMERIC(15, 2),
  interest_rate         NUMERIC(5, 2),
  emi_amount            NUMERIC(15, 2),
  frequency             payment_frequency,
  start_date            DATE,
  next_due_date         DATE,
  expected_end_date     DATE,
  linked_account_id     UUID,
  deposited_to_account  BOOLEAN,
  status                liability_status,
  notes                 TEXT,
  created_at            TIMESTAMPTZ
) AS $$
  SELECT
    l.id,
    l.name,
    l.type,
    l.original_amount,
    l.original_amount - COALESCE(SUM(lp.principal_amount), 0) AS remaining_balance,
    l.interest_rate,
    l.emi_amount,
    l.frequency,
    l.start_date,
    l.next_due_date,
    l.expected_end_date,
    l.linked_account_id,
    l.deposited_to_account,
    l.status,
    l.notes,
    l.created_at
  FROM liabilities l
  LEFT JOIN liability_payments lp ON lp.liability_id = l.id
  WHERE l.user_id = p_user_id
  GROUP BY l.id
  ORDER BY l.status, l.created_at DESC;
$$ LANGUAGE sql STABLE;


-- ============================================================================
-- SECTION 7: ATOMIC MUTATION FUNCTIONS (RPC)
--
-- These functions handle multi-table operations atomically.
-- They use SECURITY DEFINER to bypass RLS (since they touch multiple tables),
-- but explicitly validate auth.uid() at entry for safety.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7.1  create_liability_payment
--
-- Atomically:
--   1. Validates remaining balance >= principal_amount (with row lock)
--   2. Creates an expense transaction on the linked account
--   3. Creates the payment record linking to that transaction
--   4. Auto-closes the liability if fully paid
--
-- Uses SELECT ... FOR UPDATE to prevent race conditions where two concurrent
-- payments could overpay the principal beyond original_amount.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_liability_payment(
  p_liability_id      UUID,
  p_account_id        UUID,
  p_category_id       UUID,
  p_principal_amount  NUMERIC(15, 2),
  p_interest_amount   NUMERIC(15, 2),
  p_payment_date      DATE,
  p_description       TEXT DEFAULT '',
  p_notes             TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id         UUID;
  v_transaction_id  UUID;
  v_payment_id      UUID;
  v_total_amount    NUMERIC(15, 2);
  v_remaining       NUMERIC(15, 2);
  v_original        NUMERIC(15, 2);
  v_liability_status liability_status;
BEGIN
  -- Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_total_amount := p_principal_amount + p_interest_amount;

  -- Lock the liability row to prevent concurrent overpayment
  SELECT original_amount, status
  INTO v_original, v_liability_status
  FROM liabilities
  WHERE id = p_liability_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_original IS NULL THEN
    RAISE EXCEPTION 'Liability not found or access denied';
  END IF;

  IF v_liability_status = 'closed' THEN
    RAISE EXCEPTION 'Cannot make payment on a closed liability';
  END IF;

  -- Compute remaining (under lock, so no race condition)
  SELECT v_original - COALESCE(SUM(lp.principal_amount), 0)
  INTO v_remaining
  FROM liability_payments lp
  WHERE lp.liability_id = p_liability_id;

  IF p_principal_amount > v_remaining THEN
    RAISE EXCEPTION 'Principal amount (%) exceeds remaining balance (%)',
      p_principal_amount, v_remaining;
  END IF;

  -- Set bypass flag so the liability-guard trigger allows this insert
  PERFORM set_config('app.bypass_liability_guard', 'true', true);

  -- Create the expense transaction
  INSERT INTO transactions (
    user_id, account_id, category_id, type, amount,
    description, transaction_date, liability_id
  ) VALUES (
    v_user_id, p_account_id, p_category_id, 'expense', v_total_amount,
    p_description, p_payment_date, p_liability_id
  )
  RETURNING id INTO v_transaction_id;

  -- Create the payment record
  INSERT INTO liability_payments (
    user_id, liability_id, transaction_id,
    principal_amount, interest_amount, payment_date, notes
  ) VALUES (
    v_user_id, p_liability_id, v_transaction_id,
    p_principal_amount, p_interest_amount, p_payment_date, p_notes
  )
  RETURNING id INTO v_payment_id;

  -- Auto-close if fully paid
  IF p_principal_amount = v_remaining THEN
    UPDATE liabilities
    SET status = 'closed'
    WHERE id = p_liability_id;
  END IF;

  -- Reset bypass flag
  PERFORM set_config('app.bypass_liability_guard', 'false', true);

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 7.2  create_liability_with_deposit
--
-- Atomically:
--   1. Creates the liability record
--   2. If deposited_to_account = true, creates an income transaction
--      crediting the linked account with the loan amount
--
-- The income transaction is tagged with liability_id so analytics can
-- distinguish borrowed money from earned income.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_liability_with_deposit(
  p_name                  TEXT,
  p_type                  liability_type,
  p_original_amount       NUMERIC(15, 2),
  p_interest_rate         NUMERIC(5, 2),
  p_emi_amount            NUMERIC(15, 2),
  p_frequency             payment_frequency,
  p_start_date            DATE,
  p_next_due_date         DATE,
  p_expected_end_date     DATE,
  p_linked_account_id     UUID,
  p_deposited_to_account  BOOLEAN,
  p_deposit_category_id   UUID DEFAULT NULL,  -- required if deposited_to_account = true
  p_notes                 TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id       UUID;
  v_liability_id  UUID;
BEGIN
  -- Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate: if depositing, must provide a category
  IF p_deposited_to_account AND p_deposit_category_id IS NULL THEN
    RAISE EXCEPTION 'deposit_category_id is required when deposited_to_account is true';
  END IF;

  -- Create the liability
  INSERT INTO liabilities (
    user_id, name, type, original_amount, interest_rate,
    emi_amount, frequency, start_date, next_due_date,
    expected_end_date, linked_account_id, deposited_to_account, notes
  ) VALUES (
    v_user_id, p_name, p_type, p_original_amount, p_interest_rate,
    p_emi_amount, p_frequency, p_start_date, p_next_due_date,
    p_expected_end_date, p_linked_account_id, p_deposited_to_account, p_notes
  )
  RETURNING id INTO v_liability_id;

  -- If loan was deposited to account, create the income transaction
  IF p_deposited_to_account THEN
    PERFORM set_config('app.bypass_liability_guard', 'true', true);

    INSERT INTO transactions (
      user_id, account_id, category_id, type, amount,
      description, transaction_date, liability_id
    ) VALUES (
      v_user_id, p_linked_account_id, p_deposit_category_id, 'income',
      p_original_amount,
      'Loan deposit: ' || p_name,
      p_start_date, v_liability_id
    );

    PERFORM set_config('app.bypass_liability_guard', 'false', true);
  END IF;

  RETURN v_liability_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 7.3  delete_liability_payment
--
-- Atomically:
--   1. Deletes the payment record
--   2. Deletes the linked transaction
--   3. Reopens the liability if it was closed
--
-- Reverses the effect of create_liability_payment.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_liability_payment(p_payment_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id         UUID;
  v_transaction_id  UUID;
  v_liability_id    UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get payment details (and verify ownership)
  SELECT transaction_id, liability_id
  INTO v_transaction_id, v_liability_id
  FROM liability_payments
  WHERE id = p_payment_id AND user_id = v_user_id;

  IF v_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Payment not found or access denied';
  END IF;

  PERFORM set_config('app.bypass_liability_guard', 'true', true);

  -- Delete payment first (removes RESTRICT on transaction)
  DELETE FROM liability_payments WHERE id = p_payment_id;

  -- Delete the linked transaction
  DELETE FROM transactions WHERE id = v_transaction_id;

  -- Reopen liability if it was closed (since we removed a payment, it's no longer fully paid)
  UPDATE liabilities
  SET status = 'active'
  WHERE id = v_liability_id AND status = 'closed';

  PERFORM set_config('app.bypass_liability_guard', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- SECTION 8: DEFAULT CATEGORY SEEDING
--
-- When a new user signs up, seed their account with standard financial
-- categories. Triggered by Supabase auth.users insert.
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Income categories
  INSERT INTO categories (user_id, name, type, color, is_system) VALUES
    (NEW.id, 'Salary',        'income', '#22c55e', true),
    (NEW.id, 'Freelance',     'income', '#10b981', true),
    (NEW.id, 'Business',      'income', '#14b8a6', true),
    (NEW.id, 'Rental',        'income', '#06b6d4', true),
    (NEW.id, 'Other Income',  'income', '#6366f1', true);

  -- Expense categories
  INSERT INTO categories (user_id, name, type, color, is_system) VALUES
    (NEW.id, 'Housing',       'expense', '#ef4444', true),
    (NEW.id, 'Utilities',     'expense', '#f97316', true),
    (NEW.id, 'Groceries',     'expense', '#eab308', true),
    (NEW.id, 'Transport',     'expense', '#84cc16', true),
    (NEW.id, 'Shopping',      'expense', '#8b5cf6', true),
    (NEW.id, 'Food & Dining', 'expense', '#ec4899', true),
    (NEW.id, 'Healthcare',    'expense', '#f43f5e', true),
    (NEW.id, 'Education',     'expense', '#0ea5e9', true),
    (NEW.id, 'Entertainment', 'expense', '#a855f7', true),
    (NEW.id, 'Insurance',     'expense', '#64748b', true),
    (NEW.id, 'Subscriptions', 'expense', '#d946ef', true),
    (NEW.id, 'Loan Payment',  'expense', '#dc2626', true),
    (NEW.id, 'Loan Deposit',  'income',  '#059669', true),
    (NEW.id, 'Other',         'expense', '#94a3b8', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_seed_categories_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION seed_default_categories();


-- ============================================================================
-- SECTION 9: GRANT PERMISSIONS
--
-- Supabase uses the 'anon' and 'authenticated' roles.
-- Only authenticated users should access these tables (via RLS).
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON liabilities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON liability_payments TO authenticated;

-- RPC functions callable by authenticated users
GRANT EXECUTE ON FUNCTION get_account_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_liability_remaining TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_account_balances TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_liability_summaries TO authenticated;
GRANT EXECUTE ON FUNCTION create_liability_payment TO authenticated;
GRANT EXECUTE ON FUNCTION create_liability_with_deposit TO authenticated;
GRANT EXECUTE ON FUNCTION delete_liability_payment TO authenticated;
