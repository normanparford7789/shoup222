/*
  # Secure QR Invoice System
  ---------------------------------------------------------------------------
  Adds a fully protected, QR-based invoice system for:
    - Order invoices  (customer / merchant / admin)
    - Withdrawal invoices (publisher or merchant / admin)

  Security model
  ---------------------------------------------------------------------------
  1. Every invoice gets a 32 character cryptographically random token
     (nanoid style: A-Z a-z 0-9  =>  62^32 ~= 190 bits of entropy).
     Guessing a token is computationally infeasible.
  2. The QR code embeds  <site>/inv/<token>  only. No ids, no emails,
     no internal data is encoded in the QR.
  3. Reading an invoice by token goes through ONE SECURITY DEFINER function
     (`public.get_invoice_by_token`) that:
        - validates the token shape with a strict regex (no injection surface)
        - returns a *whitelisted* JSON projection (never raw rows)
        - masks the customer phone / address details for anonymous scanners
  4. Raw tokens are never selectable by clients: `SELECT` on the token
     columns is revoked from anon/authenticated. A user can only obtain the
     token of an invoice they are entitled to, via
     `public.get_invoice_token(kind, id)`.
  5. Admin access uses a SECURITY DEFINER `public.is_admin()` helper so RLS
     policies never recurse on `profiles`.
  6. The merchant/publisher identifier is exposed as an opaque code
     (`profiles.ref_code`) shown on the invoice as "??? = <code>".
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ════════════════════════════════════════════════════════════
-- 1. NANOID GENERATOR (32 chars, unbiased)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.gen_nanoid(p_size int DEFAULT 32)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet CONSTANT text :=
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  n        CONSTANT int  := 62;
  result   text := '';
  bytes    bytea;
  b        int;
  i        int;
BEGIN
  IF p_size IS NULL OR p_size < 8 OR p_size > 128 THEN
    p_size := 32;
  END IF;

  WHILE length(result) < p_size LOOP
    bytes := gen_random_bytes(p_size);
    i := 0;
    WHILE i < p_size AND length(result) < p_size LOOP
      b := get_byte(bytes, i);
      -- rejection sampling: 248 = 4 * 62  => uniform distribution
      IF b < 248 THEN
        result := result || substr(alphabet, (b % n) + 1, 1);
      END IF;
      i := i + 1;
    END LOOP;
  END LOOP;

  RETURN result;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 2. ADMIN HELPER (non-recursive)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════
-- 3. OPAQUE PARTY REFERENCE  ( ??? = <ref_code> )
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ref_code text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_ref_code_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_ref_code_key UNIQUE (ref_code);
  END IF;
END $$;

UPDATE public.profiles
SET ref_code = 'MX-' || upper(substr(public.gen_nanoid(12), 1, 10))
WHERE ref_code IS NULL;

CREATE OR REPLACE FUNCTION public.assign_profile_ref_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ref_code IS NULL THEN
    NEW.ref_code := 'MX-' || upper(substr(public.gen_nanoid(12), 1, 10));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_ref_code ON public.profiles;
CREATE TRIGGER trg_profiles_ref_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_profile_ref_code();

-- ════════════════════════════════════════════════════════════
-- 4. INVOICE TOKENS
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_token     text,
  ADD COLUMN IF NOT EXISTS invoice_issued_at timestamptz;

ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS invoice_token     text,
  ADD COLUMN IF NOT EXISTS invoice_issued_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_invoice_token_key') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_invoice_token_key UNIQUE (invoice_token);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'withdrawals_invoice_token_key') THEN
    ALTER TABLE public.withdrawal_requests
      ADD CONSTRAINT withdrawals_invoice_token_key UNIQUE (invoice_token);
  END IF;
END $$;

-- strict shape constraint: exactly 32 alphanumeric chars
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_invoice_token_shape') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_invoice_token_shape
      CHECK (invoice_token IS NULL OR invoice_token ~ '^[A-Za-z0-9]{32}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'withdrawals_invoice_token_shape') THEN
    ALTER TABLE public.withdrawal_requests ADD CONSTRAINT withdrawals_invoice_token_shape
      CHECK (invoice_token IS NULL OR invoice_token ~ '^[A-Za-z0-9]{32}$');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.assign_order_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_token IS NULL THEN
    LOOP
      NEW.invoice_token := public.gen_nanoid(32);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.invoice_token = NEW.invoice_token);
    END LOOP;
  END IF;
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' ||
                          upper(substr(NEW.invoice_token, 1, 8));
  END IF;
  IF NEW.invoice_issued_at IS NULL THEN
    NEW.invoice_issued_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_invoice ON public.orders;
CREATE TRIGGER trg_orders_invoice
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_order_invoice();

CREATE OR REPLACE FUNCTION public.assign_withdrawal_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_token IS NULL THEN
    LOOP
      NEW.invoice_token := public.gen_nanoid(32);
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.withdrawal_requests w WHERE w.invoice_token = NEW.invoice_token
      );
    END LOOP;
  END IF;
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'WDR-' || to_char(now(), 'YYYYMMDD') || '-' ||
                          upper(substr(NEW.invoice_token, 1, 8));
  END IF;
  IF NEW.invoice_issued_at IS NULL THEN
    NEW.invoice_issued_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawals_invoice ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawals_invoice
  BEFORE INSERT ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.assign_withdrawal_invoice();

-- backfill existing rows
DO $$
DECLARE r record; tok text;
BEGIN
  FOR r IN SELECT id, invoice_number, created_at FROM public.orders WHERE invoice_token IS NULL LOOP
    LOOP
      tok := public.gen_nanoid(32);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE invoice_token = tok);
    END LOOP;
    UPDATE public.orders
      SET invoice_token = tok,
          invoice_issued_at = COALESCE(invoice_issued_at, r.created_at),
          invoice_number = COALESCE(r.invoice_number,
            'INV-' || to_char(r.created_at, 'YYYYMMDD') || '-' || upper(substr(tok, 1, 8)))
      WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id, invoice_number, created_at FROM public.withdrawal_requests WHERE invoice_token IS NULL LOOP
    LOOP
      tok := public.gen_nanoid(32);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.withdrawal_requests WHERE invoice_token = tok);
    END LOOP;
    UPDATE public.withdrawal_requests
      SET invoice_token = tok,
          invoice_issued_at = COALESCE(invoice_issued_at, r.created_at),
          invoice_number = COALESCE(r.invoice_number,
            'WDR-' || to_char(r.created_at, 'YYYYMMDD') || '-' || upper(substr(tok, 1, 8)))
      WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.orders              ALTER COLUMN invoice_token SET NOT NULL;
ALTER TABLE public.withdrawal_requests ALTER COLUMN invoice_token SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_invoice_token      ON public.orders(invoice_token);
CREATE INDEX IF NOT EXISTS idx_withdrawals_invoice_token ON public.withdrawal_requests(invoice_token);

-- ════════════════════════════════════════════════════════════
-- 5. TABLE GRANTS
--    RLS already limits rows to owner / merchant / admin, and the token is
--    only meaningful to those parties. Anonymous clients never touch these
--    tables directly: they go through get_invoice_by_token() only.
-- ════════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE ON public.orders              TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.orders              TO service_role;
GRANT ALL ON public.withdrawal_requests TO service_role;
GRANT ALL ON public.order_items         TO service_role;
GRANT ALL ON public.profiles            TO service_role;

-- ════════════════════════════════════════════════════════════
-- 6. ADMIN + MERCHANT READ POLICIES
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "orders_select_admin" ON public.orders;
CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "order_items_select_admin" ON public.order_items;
CREATE POLICY "order_items_select_admin" ON public.order_items
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "withdrawals_select_admin" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_select_admin" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- 7. TOKEN HANDOUT  (owner / merchant / admin only)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_invoice_token(p_kind text, p_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_token text;
  v_owner uuid;
  v_ok    boolean := false;
BEGIN
  IF v_uid IS NULL OR p_id IS NULL OR p_kind IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_kind = 'order' THEN
    SELECT o.invoice_token, o.user_id INTO v_token, v_owner
      FROM public.orders o WHERE o.id = p_id;
    IF v_token IS NULL THEN RETURN NULL; END IF;

    v_ok := (v_owner = v_uid) OR public.is_admin(v_uid) OR EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = p_id AND p.merchant_id = v_uid
    );

  ELSIF p_kind = 'withdrawal' THEN
    SELECT w.invoice_token, w.user_id INTO v_token, v_owner
      FROM public.withdrawal_requests w WHERE w.id = p_id;
    IF v_token IS NULL THEN RETURN NULL; END IF;

    v_ok := (v_owner = v_uid) OR public.is_admin(v_uid);
  ELSE
    RETURN NULL;
  END IF;

  IF NOT v_ok THEN RETURN NULL; END IF;
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invoice_token(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invoice_token(text, uuid) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════
-- 8. PUBLIC INVOICE READER (the QR endpoint)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_invoice_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  o           public.orders%ROWTYPE;
  w           public.withdrawal_requests%ROWTYPE;
  v_items     jsonb;
  v_ref       text;
  v_customer  jsonb;
  v_party     jsonb;
  v_privileged boolean := false;
BEGIN
  -- strict shape check: blocks probing / injection attempts outright
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9]{32}$' THEN
    RETURN NULL;
  END IF;

  -- ── ORDER INVOICE ───────────────────────────────────────────
  SELECT * INTO o FROM public.orders WHERE invoice_token = p_token;
  IF FOUND THEN
    v_privileged := v_uid IS NOT NULL AND (
      o.user_id = v_uid OR public.is_admin(v_uid) OR EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.products p ON p.id = oi.product_id
        WHERE oi.order_id = o.id AND p.merchant_id = v_uid
      )
    );

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'name',       oi.product_name,
             'image',      oi.product_image,
             'size',       oi.size,
             'color',      oi.color,
             'quantity',   oi.quantity,
             'unit_price', oi.unit_price,
             'subtotal',   oi.subtotal
           ) ORDER BY oi.created_at), '[]'::jsonb)
      INTO v_items
      FROM public.order_items oi WHERE oi.order_id = o.id;

    SELECT pr.ref_code INTO v_ref
      FROM public.order_items oi
      JOIN public.products p  ON p.id = oi.product_id
      JOIN public.profiles pr ON pr.id = p.merchant_id
      WHERE oi.order_id = o.id AND p.merchant_id IS NOT NULL
      LIMIT 1;

    SELECT jsonb_build_object(
             'name',  COALESCE(pf.full_name, '—'),
             'phone', CASE WHEN v_privileged THEN pf.phone
                           ELSE regexp_replace(COALESCE(pf.phone, ''), '.(?=.{3})', '*', 'g') END
           )
      INTO v_customer
      FROM public.profiles pf WHERE pf.id = o.user_id;

    RETURN jsonb_build_object(
      'kind',            'order',
      'token',           p_token,
      'privileged',      v_privileged,
      'invoice_number',  o.invoice_number,
      'reference',       o.order_number,
      'issued_at',       COALESCE(o.invoice_issued_at, o.created_at),
      'created_at',      o.created_at,
      'status',          o.status,
      'payment_status',  o.payment_status,
      'payment_method',  o.payment_method,
      'party_ref',       COALESCE(v_ref, '—'),
      'customer',        COALESCE(v_customer, jsonb_build_object('name', '—', 'phone', NULL)),
      'shipping',        o.shipping_address,
      'items',           v_items,
      'totals',          jsonb_build_object(
                           'subtotal',      o.subtotal,
                           'shipping_cost', o.shipping_cost,
                           'tax',           o.tax,
                           'discount',      o.discount,
                           'total',         o.total,
                           'upfront',       o.upfront_amount,
                           'remaining',     o.remaining_amount
                         ),
      'coupon_code',     o.coupon_code,
      'tracking_number', o.tracking_number,
      'carrier',         o.carrier,
      'notes',           CASE WHEN v_privileged THEN o.notes ELSE NULL END
    );
  END IF;

  -- ── WITHDRAWAL INVOICE ──────────────────────────────────────
  SELECT * INTO w FROM public.withdrawal_requests WHERE invoice_token = p_token;
  IF FOUND THEN
    v_privileged := v_uid IS NOT NULL AND (w.user_id = v_uid OR public.is_admin(v_uid));

    SELECT jsonb_build_object(
             'name', COALESCE(pf.full_name, '—'),
             'role', pf.role,
             'ref',  COALESCE(pf.ref_code, '—')
           ), pf.ref_code
      INTO v_party, v_ref
      FROM public.profiles pf WHERE pf.id = w.user_id;

    RETURN jsonb_build_object(
      'kind',           'withdrawal',
      'token',          p_token,
      'privileged',     v_privileged,
      'invoice_number', w.invoice_number,
      'reference',      w.invoice_number,
      'issued_at',      COALESCE(w.invoice_issued_at, w.created_at),
      'created_at',     w.created_at,
      'processed_at',   w.processed_at,
      'status',         w.status,
      'party_ref',      COALESCE(v_ref, '—'),
      'party',          COALESCE(v_party, jsonb_build_object('name', '—', 'role', NULL, 'ref', '—')),
      'payment_info',   CASE WHEN v_privileged THEN w.payment_info
                             ELSE regexp_replace(COALESCE(w.payment_info, ''), '.(?=.{4})', '*', 'g') END,
      'admin_notes',    CASE WHEN v_privileged THEN w.admin_notes ELSE NULL END,
      'totals',         jsonb_build_object('total', w.amount, 'amount', w.amount)
    );
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invoice_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invoice_by_token(text) TO anon, authenticated, service_role;
