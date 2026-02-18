-- ============================================================================
-- SPENDIFY: Fix Signup Trigger RLS & search_path Hardening
-- Migration: 20260219000000_fix_signup_trigger_rls
--
-- ROOT CAUSE FIXED:
--   seed_default_categories() had no SET search_path. PostgreSQL 15+ sets
--   search_path = '' inside SECURITY DEFINER functions by default, so the
--   unqualified reference `categories` resolved to nothing and the INSERT
--   failed with "relation does not exist", rolling back the entire signup
--   transaction and surfacing as "Database error saving new user".
--
-- WHY SECURITY DEFINER + postgres IS SUFFICIENT FOR RLS:
--   Supabase internally configures the `postgres` role as a privileged role
--   with BYPASSRLS. This is why `ALTER ROLE postgres BYPASSRLS` is NOT needed
--   here (and is NOT permitted — Supabase blocks altering privileged roles
--   from the SQL editor). The SECURITY DEFINER + postgres ownership combination
--   already bypasses RLS correctly in all Supabase environments.
--
-- STRATEGY:
--   - Recreate seed_default_categories() with:
--       a. SET search_path = public   (fixes table resolution — the root cause)
--       b. SECURITY DEFINER           (runs as owner = postgres, bypasses RLS)
--       c. Schema-qualified table ref (belt-and-suspenders)
--   - Harden all other SECURITY DEFINER functions with SET search_path = public
--     to prevent the same class of failure in those code paths.
--
-- INVARIANTS PRESERVED:
--   - Strict RLS is untouched for all authenticated client operations.
--   - No policies are removed or weakened.
--   - No role permissions are changed.
-- ============================================================================


-- ============================================================================
-- STEP 1: Recreate seed_default_categories() with hardened security settings.
--
-- Changes vs original:
--   - Added: SET search_path = public
--     This is the fix. Prevents "relation does not exist" in PG15+
--     SECURITY DEFINER context where search_path defaults to ''.
--   - Added: Schema-qualified INSERT target (public.categories)
--     Belt-and-suspenders: unambiguous even if search_path were ever wrong.
--   - SECURITY DEFINER preserved (function runs as owner = postgres).
--     postgres has BYPASSRLS in Supabase's configuration, so the
--     categories_insert RLS policy is bypassed during trigger execution
--     (when auth.uid() is NULL — no JWT exists yet at signup time).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Income categories
  INSERT INTO public.categories (user_id, name, type, color, is_system) VALUES
    (NEW.id, 'Salary',        'income',  '#22c55e', true),
    (NEW.id, 'Freelance',     'income',  '#10b981', true),
    (NEW.id, 'Business',      'income',  '#14b8a6', true),
    (NEW.id, 'Rental',        'income',  '#06b6d4', true),
    (NEW.id, 'Other Income',  'income',  '#6366f1', true),
    (NEW.id, 'Loan Deposit',  'income',  '#059669', true);

  -- Expense categories
  INSERT INTO public.categories (user_id, name, type, color, is_system) VALUES
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
    (NEW.id, 'Other',         'expense', '#94a3b8', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- Explicit ownership: postgres has BYPASSRLS in Supabase, so this function
-- bypasses RLS correctly even when auth.uid() is NULL at signup time.
ALTER FUNCTION public.seed_default_categories() OWNER TO postgres;


-- ============================================================================
-- STEP 2: Harden all other SECURITY DEFINER functions.
--
-- These RPC functions currently rely on an implicit session search_path set
-- by the migration runner. In PG15+ SECURITY DEFINER functions that is an
-- empty string by default, which will break these functions the moment the
-- session search_path assumption stops holding. Fix it now before it becomes
-- a production incident.
-- ============================================================================

-- 2.1  create_liability_payment
CREATE OR REPLACE FUNCTION public.create_liability_payment(
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_total_amount := p_principal_amount + p_interest_amount;

  SELECT original_amount, status
  INTO v_original, v_liability_status
  FROM public.liabilities
  WHERE id = p_liability_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_original IS NULL THEN
    RAISE EXCEPTION 'Liability not found or access denied';
  END IF;

  IF v_liability_status = 'closed' THEN
    RAISE EXCEPTION 'Cannot make payment on a closed liability';
  END IF;

  SELECT v_original - COALESCE(SUM(lp.principal_amount), 0)
  INTO v_remaining
  FROM public.liability_payments lp
  WHERE lp.liability_id = p_liability_id;

  IF p_principal_amount > v_remaining THEN
    RAISE EXCEPTION 'Principal amount (%) exceeds remaining balance (%)',
      p_principal_amount, v_remaining;
  END IF;

  PERFORM set_config('app.bypass_liability_guard', 'true', true);

  INSERT INTO public.transactions (
    user_id, account_id, category_id, type, amount,
    description, transaction_date, liability_id
  ) VALUES (
    v_user_id, p_account_id, p_category_id, 'expense', v_total_amount,
    p_description, p_payment_date, p_liability_id
  )
  RETURNING id INTO v_transaction_id;

  INSERT INTO public.liability_payments (
    user_id, liability_id, transaction_id,
    principal_amount, interest_amount, payment_date, notes
  ) VALUES (
    v_user_id, p_liability_id, v_transaction_id,
    p_principal_amount, p_interest_amount, p_payment_date, p_notes
  )
  RETURNING id INTO v_payment_id;

  IF p_principal_amount = v_remaining THEN
    UPDATE public.liabilities
    SET status = 'closed'
    WHERE id = p_liability_id;
  END IF;

  PERFORM set_config('app.bypass_liability_guard', 'false', true);

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

ALTER FUNCTION public.create_liability_payment(UUID, UUID, UUID, NUMERIC, NUMERIC, DATE, TEXT, TEXT)
  OWNER TO postgres;


-- 2.2  create_liability_with_deposit
CREATE OR REPLACE FUNCTION public.create_liability_with_deposit(
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
  p_deposit_category_id   UUID DEFAULT NULL,
  p_notes                 TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id       UUID;
  v_liability_id  UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_deposited_to_account AND p_deposit_category_id IS NULL THEN
    RAISE EXCEPTION 'deposit_category_id is required when deposited_to_account is true';
  END IF;

  INSERT INTO public.liabilities (
    user_id, name, type, original_amount, interest_rate,
    emi_amount, frequency, start_date, next_due_date,
    expected_end_date, linked_account_id, deposited_to_account, notes
  ) VALUES (
    v_user_id, p_name, p_type, p_original_amount, p_interest_rate,
    p_emi_amount, p_frequency, p_start_date, p_next_due_date,
    p_expected_end_date, p_linked_account_id, p_deposited_to_account, p_notes
  )
  RETURNING id INTO v_liability_id;

  IF p_deposited_to_account THEN
    PERFORM set_config('app.bypass_liability_guard', 'true', true);

    INSERT INTO public.transactions (
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
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

ALTER FUNCTION public.create_liability_with_deposit(TEXT, liability_type, NUMERIC, NUMERIC, NUMERIC, payment_frequency, DATE, DATE, DATE, UUID, BOOLEAN, UUID, TEXT)
  OWNER TO postgres;


-- 2.3  delete_liability_payment
CREATE OR REPLACE FUNCTION public.delete_liability_payment(p_payment_id UUID)
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

  SELECT transaction_id, liability_id
  INTO v_transaction_id, v_liability_id
  FROM public.liability_payments
  WHERE id = p_payment_id AND user_id = v_user_id;

  IF v_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Payment not found or access denied';
  END IF;

  PERFORM set_config('app.bypass_liability_guard', 'true', true);

  DELETE FROM public.liability_payments WHERE id = p_payment_id;
  DELETE FROM public.transactions WHERE id = v_transaction_id;

  UPDATE public.liabilities
  SET status = 'active'
  WHERE id = v_liability_id AND status = 'closed';

  PERFORM set_config('app.bypass_liability_guard', 'false', true);
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

ALTER FUNCTION public.delete_liability_payment(UUID) OWNER TO postgres;


-- ============================================================================
-- STEP 3: Harden the transaction validation trigger functions.
--
-- These are NOT SECURITY DEFINER — they run as the caller's role. That is
-- correct for client-facing operations. However, they do internal SELECTs
-- on categories/accounts without schema qualification. Add SET search_path
-- so they are resilient regardless of the session environment.
-- ============================================================================

-- 3.1  validate_category_transaction_type (updated in migration 2)
CREATE OR REPLACE FUNCTION public.validate_category_transaction_type()
RETURNS TRIGGER AS $$
DECLARE
  v_category_type category_type;
BEGIN
  IF NEW.type = 'transfer' THEN
    RETURN NEW;
  END IF;

  SELECT type INTO v_category_type
  FROM public.categories
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
$$ LANGUAGE plpgsql
   SET search_path = public;


-- 3.2  validate_transaction_ownership (updated in migration 2)
CREATE OR REPLACE FUNCTION public.validate_transaction_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'transfer' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = NEW.transfer_from_account_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Source account % does not belong to user %',
        NEW.transfer_from_account_id, NEW.user_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = NEW.transfer_to_account_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Destination account % does not belong to user %',
        NEW.transfer_to_account_id, NEW.user_id;
    END IF;

    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.accounts WHERE id = NEW.account_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Account % does not belong to user %',
      NEW.account_id, NEW.user_id;
  END IF;

  IF NEW.category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.categories WHERE id = NEW.category_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Category % does not belong to user %',
      NEW.category_id, NEW.user_id;
  END IF;

  IF NEW.liability_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.liabilities WHERE id = NEW.liability_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Liability % does not belong to user %',
        NEW.liability_id, NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SET search_path = public;


-- 3.3  validate_liability_ownership (from migration 1, not updated in migration 2)
CREATE OR REPLACE FUNCTION public.validate_liability_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts WHERE id = NEW.linked_account_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Linked account % does not belong to user %',
      NEW.linked_account_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SET search_path = public;


-- 3.4  guard_liability_transaction_edit (from migration 1)
CREATE OR REPLACE FUNCTION public.guard_liability_transaction_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.bypass_liability_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

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
$$ LANGUAGE plpgsql
   SET search_path = public;
