/*
# Add Merchant Infrastructure, Wallets, Affiliate System, and Order Status Management

## Overview
Restores merchant/affiliate/wallet infrastructure removed by schema reset, and adds order-status management:

1. **Profiles**: adds role, is_banned, is_active, admin_notes columns.
2. **Products**: adds merchant_id column.
3. **Reels**: adds merchant_id column.
4. **Orders**: adds affiliate_code, affiliate_user_id columns.
5. **Order Items**: adds merchant_id, merchant_earnings, affiliate_earnings, hold_until columns.
6. **New Tables**: wallets, wallet_transactions, withdrawal_requests, affiliate_links, affiliate_clicks, merchant_restrictions, order_status_history.
7. **New Functions**: update_order_status (SECURITY DEFINER), process_order_merchant_earnings, release_pending_earnings, process_withdrawal, track_affiliate_click.
8. **New Views**: merchant_sales_summary, merchant_order_items_detail.
9. **Security**: RLS on all new tables. update_order_status verifies ownership before updating.

All column additions use IF NOT EXISTS guards. Columns are added before any policy that references them.
*/

-- ════════════════════════════════════════════════════════════
-- 1. ADD ALL COLUMNS FIRST (before any policy updates)
-- ════════════════════════════════════════════════════════════

-- Profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
    ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','publisher','merchant','admin'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_banned') THEN
    ALTER TABLE profiles ADD COLUMN is_banned boolean NOT NULL DEFAULT false;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_active') THEN
    ALTER TABLE profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='admin_notes') THEN
    ALTER TABLE profiles ADD COLUMN admin_notes text;
  END IF;
END $$;

-- Products
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='merchant_id') THEN
    ALTER TABLE products ADD COLUMN merchant_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);

-- Reels
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reels' AND column_name='merchant_id') THEN
    ALTER TABLE reels ADD COLUMN merchant_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_reels_merchant ON reels(merchant_id);

-- Orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='affiliate_code') THEN
    ALTER TABLE orders ADD COLUMN affiliate_code text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='affiliate_user_id') THEN
    ALTER TABLE orders ADD COLUMN affiliate_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Order Items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='merchant_id') THEN
    ALTER TABLE order_items ADD COLUMN merchant_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='merchant_earnings') THEN
    ALTER TABLE order_items ADD COLUMN merchant_earnings numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='affiliate_earnings') THEN
    ALTER TABLE order_items ADD COLUMN affiliate_earnings numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='hold_until') THEN
    ALTER TABLE order_items ADD COLUMN hold_until timestamptz;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_order_items_merchant ON order_items(merchant_id);

-- ════════════════════════════════════════════════════════════
-- 2. UPDATE POLICIES (now that columns exist)
-- ════════════════════════════════════════════════════════════

-- Profiles: allow anyone to read (needed for merchant/customer names)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Products: merchant ownership
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_insert_merchant" ON products;
CREATE POLICY "products_insert_merchant" ON products FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_update_merchant" ON products;
CREATE POLICY "products_update_merchant" ON products FOR UPDATE TO authenticated
  USING (merchant_id IS NULL OR auth.uid() = merchant_id) WITH CHECK (merchant_id IS NULL OR auth.uid() = merchant_id);
DROP POLICY IF EXISTS "products_delete" ON products;
DROP POLICY IF EXISTS "products_delete_merchant" ON products;
CREATE POLICY "products_delete_merchant" ON products FOR DELETE TO authenticated USING (merchant_id IS NULL OR auth.uid() = merchant_id);

-- Reels: merchant ownership
DROP POLICY IF EXISTS "reels_insert" ON reels;
DROP POLICY IF EXISTS "reels_insert_merchant" ON reels;
CREATE POLICY "reels_insert_merchant" ON reels FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "reels_update" ON reels;
DROP POLICY IF EXISTS "reels_update_merchant" ON reels;
CREATE POLICY "reels_update_merchant" ON reels FOR UPDATE TO authenticated
  USING (merchant_id IS NULL OR auth.uid() = merchant_id) WITH CHECK (merchant_id IS NULL OR auth.uid() = merchant_id);
DROP POLICY IF EXISTS "reels_delete" ON reels;
DROP POLICY IF EXISTS "reels_delete_merchant" ON reels;
CREATE POLICY "reels_delete_merchant" ON reels FOR DELETE TO authenticated USING (merchant_id IS NULL OR auth.uid() = merchant_id);

-- Orders: merchants can see orders containing their products
DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM order_items WHERE order_items.order_id = orders.id AND order_items.merchant_id = auth.uid()));

-- Order items: merchants can see their items
DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()) OR order_items.merchant_id = auth.uid());

-- ════════════════════════════════════════════════════════════
-- 3. WALLETS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance numeric(12,2) NOT NULL DEFAULT 0,
  pending_balance numeric(12,2) NOT NULL DEFAULT 0,
  total_earned numeric(12,2) NOT NULL DEFAULT 0,
  total_withdrawn numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallets_select_own" ON wallets;
CREATE POLICY "wallets_select_own" ON wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallets_update_own" ON wallets;
CREATE POLICY "wallets_update_own" ON wallets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallets_insert_own" ON wallets;
CREATE POLICY "wallets_insert_own" ON wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
DROP TRIGGER IF EXISTS trg_wallets_updated_at ON wallets;
CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ════════════════════════════════════════════════════════════
-- 4. WALLET TRANSACTIONS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit','debit','pending_credit','pending_release','withdrawal','adjustment')),
  amount numeric(12,2) NOT NULL,
  description text,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES order_items(id) ON DELETE SET NULL,
  withdrawal_id uuid,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_tx_select_own" ON wallet_transactions;
CREATE POLICY "wallet_tx_select_own" ON wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallet_tx_insert_own" ON wallet_transactions;
CREATE POLICY "wallet_tx_insert_own" ON wallet_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON wallet_transactions(created_at DESC);

-- ════════════════════════════════════════════════════════════
-- 5. WITHDRAWAL REQUESTS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_info text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid','cancelled')),
  admin_notes text,
  invoice_number text UNIQUE,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "withdrawals_select_own" ON withdrawal_requests;
CREATE POLICY "withdrawals_select_own" ON withdrawal_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "withdrawals_insert_own" ON withdrawal_requests;
CREATE POLICY "withdrawals_insert_own" ON withdrawal_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "withdrawals_update_own" ON withdrawal_requests;
CREATE POLICY "withdrawals_update_own" ON withdrawal_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created ON withdrawal_requests(created_at DESC);
DROP TRIGGER IF EXISTS trg_withdrawals_updated_at ON withdrawal_requests;
CREATE TRIGGER trg_withdrawals_updated_at BEFORE UPDATE ON withdrawal_requests FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ════════════════════════════════════════════════════════════
-- 6. AFFILIATE LINKS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  affiliate_code text UNIQUE NOT NULL,
  clicks_count int NOT NULL DEFAULT 0,
  purchases_count int NOT NULL DEFAULT 0,
  total_earnings numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "affiliate_links_select_own" ON affiliate_links;
CREATE POLICY "affiliate_links_select_own" ON affiliate_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "affiliate_links_insert_own" ON affiliate_links;
CREATE POLICY "affiliate_links_insert_own" ON affiliate_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "affiliate_links_update_own" ON affiliate_links;
CREATE POLICY "affiliate_links_update_own" ON affiliate_links FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "affiliate_links_delete_own" ON affiliate_links;
CREATE POLICY "affiliate_links_delete_own" ON affiliate_links FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "affiliate_links_read_by_code" ON affiliate_links;
CREATE POLICY "affiliate_links_read_by_code" ON affiliate_links FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_user ON affiliate_links(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_product ON affiliate_links(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_code ON affiliate_links(affiliate_code);

-- ════════════════════════════════════════════════════════════
-- 7. AFFILIATE CLICKS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id uuid NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "affiliate_clicks_insert_any" ON affiliate_clicks;
CREATE POLICY "affiliate_clicks_insert_any" ON affiliate_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "affiliate_clicks_select_own" ON affiliate_clicks;
CREATE POLICY "affiliate_clicks_select_own" ON affiliate_clicks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_link ON affiliate_clicks(affiliate_link_id);

-- ════════════════════════════════════════════════════════════
-- 8. MERCHANT RESTRICTIONS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS merchant_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  can_upload_products boolean NOT NULL DEFAULT true,
  can_upload_reels boolean NOT NULL DEFAULT true,
  can_edit_products boolean NOT NULL DEFAULT true,
  can_delete_products boolean NOT NULL DEFAULT true,
  restricted_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE merchant_restrictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "merchant_restrictions_select_own" ON merchant_restrictions;
CREATE POLICY "merchant_restrictions_select_own" ON merchant_restrictions FOR SELECT TO authenticated USING (auth.uid() = merchant_id);
DROP POLICY IF EXISTS "merchant_restrictions_insert_own" ON merchant_restrictions;
CREATE POLICY "merchant_restrictions_insert_own" ON merchant_restrictions FOR INSERT TO authenticated WITH CHECK (auth.uid() = merchant_id);
DROP POLICY IF EXISTS "merchant_restrictions_update_own" ON merchant_restrictions;
CREATE POLICY "merchant_restrictions_update_own" ON merchant_restrictions FOR UPDATE TO authenticated USING (auth.uid() = merchant_id) WITH CHECK (auth.uid() = merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_restrictions_merchant ON merchant_restrictions(merchant_id);
DROP TRIGGER IF EXISTS trg_merchant_restrictions_updated_at ON merchant_restrictions;
CREATE TRIGGER trg_merchant_restrictions_updated_at BEFORE UPDATE ON merchant_restrictions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ════════════════════════════════════════════════════════════
-- 9. ORDER_STATUS_HISTORY
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status text NOT NULL,
  to_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_status_history_select_merchant" ON order_status_history;
CREATE POLICY "order_status_history_select_merchant" ON order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM order_items WHERE order_items.order_id = order_status_history.order_id AND order_items.merchant_id = auth.uid())
    OR EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.user_id = auth.uid()));
DROP POLICY IF EXISTS "order_status_history_insert_authed" ON order_status_history;
CREATE POLICY "order_status_history_insert_authed" ON order_status_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON order_status_history(changed_by);

-- ════════════════════════════════════════════════════════════
-- 10. AUTO-CREATE WALLET ON SIGNUP
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user_extended()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), COALESCE(NEW.raw_user_meta_data->>'role', 'customer'))
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') IN ('publisher', 'merchant') THEN
    INSERT INTO wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user_extended();

-- ════════════════════════════════════════════════════════════
-- 11. FUNCTIONS
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION process_order_merchant_earnings(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item record; merchant_earn numeric(12,2); affiliate_earn numeric(12,2); hold_date timestamptz; w_id uuid;
BEGIN
  hold_date := now() + interval '10 days';
  FOR item IN SELECT oi.id, oi.product_id, oi.subtotal, p.merchant_id, o.affiliate_user_id
    FROM order_items oi JOIN orders o ON o.id = oi.order_id LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
  LOOP
    merchant_earn := ROUND(item.subtotal * 0.75, 2);
    affiliate_earn := CASE WHEN item.affiliate_user_id IS NOT NULL THEN ROUND(item.subtotal * 0.10, 2) ELSE 0 END;
    UPDATE order_items SET merchant_id = item.merchant_id, merchant_earnings = merchant_earn, affiliate_earnings = affiliate_earn, hold_until = hold_date WHERE id = item.id;
    IF item.merchant_id IS NOT NULL THEN
      SELECT id INTO w_id FROM wallets WHERE user_id = item.merchant_id;
      IF w_id IS NULL THEN INSERT INTO wallets (user_id) VALUES (item.merchant_id) ON CONFLICT (user_id) DO NOTHING; SELECT id INTO w_id FROM wallets WHERE user_id = item.merchant_id; END IF;
      UPDATE wallets SET pending_balance = pending_balance + merchant_earn, total_earned = total_earned + merchant_earn, updated_at = now() WHERE user_id = item.merchant_id;
      INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, description, order_id, order_item_id, status) VALUES (w_id, item.merchant_id, 'pending_credit', merchant_earn, 'Earnings from order (10-day hold)', p_order_id, item.id, 'pending');
    END IF;
    IF item.affiliate_user_id IS NOT NULL THEN
      SELECT id INTO w_id FROM wallets WHERE user_id = item.affiliate_user_id;
      IF w_id IS NULL THEN INSERT INTO wallets (user_id) VALUES (item.affiliate_user_id) ON CONFLICT (user_id) DO NOTHING; SELECT id INTO w_id FROM wallets WHERE user_id = item.affiliate_user_id; END IF;
      UPDATE wallets SET pending_balance = pending_balance + affiliate_earn, total_earned = total_earned + affiliate_earn, updated_at = now() WHERE user_id = item.affiliate_user_id;
      INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, description, order_id, order_item_id, status) VALUES (w_id, item.affiliate_user_id, 'pending_credit', affiliate_earn, 'Affiliate commission (10-day hold)', p_order_id, item.id, 'pending');
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION release_pending_earnings()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item record; w_id uuid;
BEGIN
  FOR item IN SELECT oi.id, oi.merchant_id, oi.merchant_earnings, oi.affiliate_earnings, oi.order_id, o.affiliate_user_id
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE oi.hold_until IS NOT NULL AND oi.hold_until <= now() AND oi.merchant_earnings > 0
  LOOP
    IF item.merchant_id IS NOT NULL AND item.merchant_earnings > 0 THEN
      SELECT id INTO w_id FROM wallets WHERE user_id = item.merchant_id;
      IF w_id IS NOT NULL THEN
        UPDATE wallets SET pending_balance = GREATEST(pending_balance - item.merchant_earnings, 0), available_balance = available_balance + item.merchant_earnings, updated_at = now() WHERE user_id = item.merchant_id;
        INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, description, order_id, order_item_id, status) VALUES (w_id, item.merchant_id, 'pending_release', item.merchant_earnings, 'Pending earnings released', item.order_id, item.id, 'completed');
      END IF;
    END IF;
    IF item.affiliate_user_id IS NOT NULL AND item.affiliate_earnings > 0 THEN
      SELECT id INTO w_id FROM wallets WHERE user_id = item.affiliate_user_id;
      IF w_id IS NOT NULL THEN
        UPDATE wallets SET pending_balance = GREATEST(pending_balance - item.affiliate_earnings, 0), available_balance = available_balance + item.affiliate_earnings, updated_at = now() WHERE user_id = item.affiliate_user_id;
        INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, description, order_id, order_item_id, status) VALUES (w_id, item.affiliate_user_id, 'pending_release', item.affiliate_earnings, 'Affiliate earnings released', item.order_id, item.id, 'completed');
      END IF;
    END IF;
    UPDATE order_items SET hold_until = NULL WHERE id = item.id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION process_withdrawal(p_withdrawal_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record; w_id uuid;
BEGIN
  SELECT * INTO w FROM withdrawal_requests WHERE id = p_withdrawal_id;
  IF w IS NULL THEN RAISE EXCEPTION 'Withdrawal request not found'; END IF;
  IF p_status = 'paid' THEN
    SELECT id INTO w_id FROM wallets WHERE user_id = w.user_id;
    IF w_id IS NOT NULL THEN
      UPDATE wallets SET available_balance = GREATEST(available_balance - w.amount, 0), total_withdrawn = total_withdrawn + w.amount, updated_at = now() WHERE user_id = w.user_id;
      INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, description, withdrawal_id, status) VALUES (w_id, w.user_id, 'withdrawal', w.amount, 'Withdrawal paid: ' || COALESCE(w.invoice_number, 'N/A'), p_withdrawal_id, 'completed');
    END IF;
  END IF;
  UPDATE withdrawal_requests SET status = p_status, processed_at = now(), updated_at = now() WHERE id = p_withdrawal_id;
END;
$$;

CREATE OR REPLACE FUNCTION track_affiliate_click(p_affiliate_code text, p_user_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE link record;
BEGIN
  SELECT * INTO link FROM affiliate_links WHERE affiliate_code = p_affiliate_code AND is_active = true;
  IF link IS NOT NULL THEN
    UPDATE affiliate_links SET clicks_count = clicks_count + 1 WHERE id = link.id;
    INSERT INTO affiliate_clicks (affiliate_link_id, product_id, user_id) VALUES (link.id, link.product_id, p_user_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION update_order_status(p_order_id uuid, p_new_status text, p_note text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_current_status text; v_is_admin boolean := false; v_is_merchant_of_order boolean := false;
BEGIN
  IF p_new_status NOT IN ('pending','confirmed','processing','shipped','out_for_delivery','delivered','completed','cancelled','returned','refunded') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found: %', p_order_id; END IF;
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') INTO v_is_admin;
  SELECT EXISTS (SELECT 1 FROM order_items WHERE order_id = p_order_id AND merchant_id = auth.uid()) INTO v_is_merchant_of_order;
  IF NOT v_is_admin AND NOT v_is_merchant_of_order THEN RAISE EXCEPTION 'You are not authorized to update this order'; END IF;
  UPDATE orders SET status = p_new_status WHERE id = p_order_id;
  INSERT INTO order_status_history (order_id, changed_by, from_status, to_status, note) VALUES (p_order_id, auth.uid(), v_current_status, p_new_status, p_note);
  RETURN p_new_status;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- 12. VIEWS
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW merchant_sales_summary AS
SELECT p.merchant_id, pr.full_name, pr.is_active, pr.is_banned,
  COUNT(DISTINCT p.id) AS product_count, COUNT(DISTINCT oi.order_id) AS order_count,
  COALESCE(SUM(oi.subtotal), 0) AS total_sales, COALESCE(SUM(oi.merchant_earnings), 0) AS total_earnings,
  COALESCE(SUM(CASE WHEN oi.hold_until IS NOT NULL AND oi.hold_until > now() THEN oi.merchant_earnings ELSE 0 END), 0) AS pending_earnings,
  COALESCE(w.available_balance, 0) AS available_balance
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN profiles pr ON pr.id = p.merchant_id
LEFT JOIN wallets w ON w.user_id = p.merchant_id
WHERE p.merchant_id IS NOT NULL
GROUP BY p.merchant_id, pr.full_name, pr.is_active, pr.is_banned, w.available_balance;

CREATE OR REPLACE VIEW merchant_order_items_detail AS
SELECT oi.id AS order_item_id, oi.order_id, oi.product_id, oi.product_name, oi.product_image, oi.quantity, oi.unit_price, oi.subtotal,
  oi.merchant_id, oi.merchant_earnings, oi.affiliate_earnings, oi.hold_until,
  o.order_number, o.status AS order_status, o.total AS order_total, o.payment_status, o.payment_method, o.tracking_number, o.carrier, o.shipping_address, o.notes AS order_notes, o.created_at AS order_created_at,
  p.name AS product_name_full, p.price AS product_price, cust.full_name AS customer_name, cust.id AS customer_id
FROM order_items oi
LEFT JOIN orders o ON o.id = oi.order_id
LEFT JOIN products p ON p.id = oi.product_id
LEFT JOIN profiles cust ON cust.id = o.user_id;
