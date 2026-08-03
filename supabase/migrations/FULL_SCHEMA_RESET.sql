-- ============================================================
--  STYLE APP — FULL SCHEMA RESET
--  نسخ هذا الكود كاملاً في Supabase → SQL Editor → Run
--  يحذف كل الجداول القديمة وينشئها من الصفر بشكل صحيح 100%
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  0. حذف كل الجداول القديمة (بالترتيب الصحيح لتجنب FK errors)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS reel_comments      CASCADE;
DROP TABLE IF EXISTS reel_likes         CASCADE;
DROP TABLE IF EXISTS reels              CASCADE;
DROP TABLE IF EXISTS support_tickets    CASCADE;
DROP TABLE IF EXISTS return_requests    CASCADE;
DROP TABLE IF EXISTS notifications      CASCADE;
DROP TABLE IF EXISTS order_items        CASCADE;
DROP TABLE IF EXISTS orders             CASCADE;
DROP TABLE IF EXISTS cart_items         CASCADE;
DROP TABLE IF EXISTS wishlist_items     CASCADE;
DROP TABLE IF EXISTS reviews            CASCADE;
DROP TABLE IF EXISTS product_images     CASCADE;
DROP TABLE IF EXISTS product_variants   CASCADE;
DROP TABLE IF EXISTS products           CASCADE;
DROP TABLE IF EXISTS categories         CASCADE;
DROP TABLE IF EXISTS addresses          CASCADE;
DROP TABLE IF EXISTS banners            CASCADE;
DROP TABLE IF EXISTS coupons            CASCADE;
DROP TABLE IF EXISTS profiles           CASCADE;

-- حذف triggers القديمة
DROP FUNCTION IF EXISTS handle_updated_at()           CASCADE;
DROP FUNCTION IF EXISTS handle_new_user()             CASCADE;
DROP FUNCTION IF EXISTS update_product_rating()       CASCADE;
DROP FUNCTION IF EXISTS update_reel_likes_count()     CASCADE;
DROP FUNCTION IF EXISTS update_reel_comments_count()  CASCADE;

-- ────────────────────────────────────────────────────────────
--  1. TRIGGER FUNCTION — auto update_at
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────
--  2. PROFILES
-- ────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        text,
  phone            text,
  avatar_url       text,
  default_currency text NOT NULL DEFAULT 'USD',
  default_language text NOT NULL DEFAULT 'en',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ────────────────────────────────────────────────────────────
--  3. CATEGORIES
-- ────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  description text,
  image_url   text,
  parent_id   uuid REFERENCES categories(id) ON DELETE SET NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_read"   ON categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories_insert" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "categories_update" ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "categories_delete" ON categories FOR DELETE TO authenticated USING (true);

-- ────────────────────────────────────────────────────────────
--  4. PRODUCTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  slug             text UNIQUE NOT NULL,
  description      text,
  price            numeric(10,2) NOT NULL,
  compare_at_price numeric(10,2),
  category_id      uuid REFERENCES categories(id) ON DELETE SET NULL,
  brand            text,
  sku              text UNIQUE,
  material         text,
  status           text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','draft','archived')),
  is_featured      boolean NOT NULL DEFAULT false,
  is_new           boolean NOT NULL DEFAULT false,
  rating           numeric(3,2) NOT NULL DEFAULT 0,
  review_count     int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_read"   ON products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "products_insert" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "products_update" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "products_delete" ON products FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_products_category  ON products(category_id);
CREATE INDEX idx_products_status    ON products(status);
CREATE INDEX idx_products_featured  ON products(is_featured);
CREATE INDEX idx_products_slug      ON products(slug);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ────────────────────────────────────────────────────────────
--  5. PRODUCT VARIANTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE product_variants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size       text NOT NULL,
  color      text NOT NULL,
  color_hex  text,
  stock      int NOT NULL DEFAULT 0,
  sku        text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "variants_read"   ON product_variants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "variants_insert" ON product_variants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "variants_update" ON product_variants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "variants_delete" ON product_variants FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_variants_product ON product_variants(product_id);

-- ────────────────────────────────────────────────────────────
--  6. PRODUCT IMAGES
-- ────────────────────────────────────────────────────────────
CREATE TABLE product_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url  text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_images_read"   ON product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "product_images_insert" ON product_images FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "product_images_update" ON product_images FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "product_images_delete" ON product_images FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ────────────────────────────────────────────────────────────
--  7. ADDRESSES
-- ────────────────────────────────────────────────────────────
CREATE TABLE addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  phone       text NOT NULL,
  country     text NOT NULL,
  city        text NOT NULL,
  street      text NOT NULL,
  postal_code text,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses_select" ON addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "addresses_insert" ON addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_update" ON addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_delete" ON addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_addresses_user ON addresses(user_id);

-- ────────────────────────────────────────────────────────────
--  8. WISHLIST
-- ────────────────────────────────────────────────────────────
CREATE TABLE wishlist_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlist_select" ON wishlist_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wishlist_insert" ON wishlist_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wishlist_delete" ON wishlist_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_wishlist_user    ON wishlist_items(user_id);
CREATE INDEX idx_wishlist_product ON wishlist_items(product_id);

-- ────────────────────────────────────────────────────────────
--  9. CART
-- ────────────────────────────────────────────────────────────
CREATE TABLE cart_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  size       text,
  color      text,
  quantity   int  NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cart_select" ON cart_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cart_insert" ON cart_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cart_update" ON cart_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cart_delete" ON cart_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_cart_user    ON cart_items(user_id);
CREATE INDEX idx_cart_product ON cart_items(product_id);

-- ────────────────────────────────────────────────────────────
--  10. ORDERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number     text UNIQUE NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','shipped','out_for_delivery','delivered','cancelled','returned')),
  subtotal         numeric(12,2) NOT NULL DEFAULT 0,
  shipping_cost    numeric(12,2) NOT NULL DEFAULT 0,
  tax              numeric(12,2) NOT NULL DEFAULT 0,
  discount         numeric(12,2) NOT NULL DEFAULT 0,
  total            numeric(12,2) NOT NULL DEFAULT 0,
  coupon_code      text,
  shipping_address jsonb,
  payment_method   text NOT NULL DEFAULT 'cash_on_delivery',
  payment_status   text NOT NULL DEFAULT 'unpaid'
                   CHECK (payment_status IN ('unpaid','paid','refunded','failed')),
  tracking_number  text,
  carrier          text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select" ON orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "orders_insert" ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_update" ON orders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_orders_user       ON orders(user_id);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ────────────────────────────────────────────────────────────
--  11. ORDER ITEMS
-- ────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name  text NOT NULL,
  product_image text,
  size          text,
  color         text,
  quantity      int  NOT NULL DEFAULT 1,
  unit_price    numeric(10,2) NOT NULL,
  subtotal      numeric(12,2) NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select" ON order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

CREATE POLICY "order_items_insert" ON order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ────────────────────────────────────────────────────────────
--  12. REVIEWS
-- ────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating        int  NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title         text,
  body          text,
  images        jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_approved   boolean NOT NULL DEFAULT true,
  helpful_count int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_read"   ON reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update" ON reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_delete" ON reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user    ON reviews(user_id);

-- Auto-update product rating after review insert/update/delete
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  pid uuid;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE products SET
    rating       = COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = pid AND is_approved = true), 0),
    review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = pid AND is_approved = true)
  WHERE id = pid;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_reviews_update_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- ────────────────────────────────────────────────────────────
--  13. COUPONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE coupons (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text UNIQUE NOT NULL,
  description    text,
  discount_type  text NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value numeric(10,2) NOT NULL,
  min_spend      numeric(10,2) NOT NULL DEFAULT 0,
  max_uses       int,
  used_count     int NOT NULL DEFAULT 0,
  valid_from     timestamptz NOT NULL DEFAULT now(),
  valid_until    timestamptz,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_read"   ON coupons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "coupons_insert" ON coupons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "coupons_update" ON coupons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "coupons_delete" ON coupons FOR DELETE TO authenticated USING (true);

-- ────────────────────────────────────────────────────────────
--  14. BANNERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE banners (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  subtitle   text,
  image_url  text NOT NULL,
  cta_text   text,
  cta_link   text,
  placement  text NOT NULL DEFAULT 'home_slider'
             CHECK (placement IN ('home_slider','home_secondary','category','promo')),
  sort_order int  NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  start_date timestamptz,
  end_date   timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners_read"   ON banners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "banners_insert" ON banners FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "banners_update" ON banners FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "banners_delete" ON banners FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_banners_active ON banners(is_active, sort_order);

-- ────────────────────────────────────────────────────────────
--  15. NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text NOT NULL,
  title      text NOT NULL,
  body       text,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user    ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

-- ────────────────────────────────────────────────────────────
--  16. RETURN REQUESTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE return_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  reason        text NOT NULL
                CHECK (reason IN ('size_issue','different_product','manufacturing_defect','changed_mind','other')),
  description   text,
  images        jsonb NOT NULL DEFAULT '[]'::jsonb,
  type          text NOT NULL DEFAULT 'refund' CHECK (type IN ('refund','exchange')),
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','completed','cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "returns_select" ON return_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "returns_insert" ON return_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "returns_update" ON return_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_returns_user  ON return_requests(user_id);
CREATE INDEX idx_returns_order ON return_requests(order_id);

CREATE TRIGGER trg_returns_updated_at
  BEFORE UPDATE ON return_requests
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ────────────────────────────────────────────────────────────
--  17. SUPPORT TICKETS
-- ────────────────────────────────────────────────────────────
CREATE TABLE support_tickets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject    text NOT NULL,
  message    text NOT NULL,
  category   text NOT NULL DEFAULT 'general'
             CHECK (category IN ('general','order','product','payment','shipping','return','other')),
  status     text NOT NULL DEFAULT 'open'
             CHECK (status IN ('open','pending','resolved','closed')),
  priority   text NOT NULL DEFAULT 'normal'
             CHECK (priority IN ('low','normal','high','urgent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_select" ON support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tickets_insert" ON support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tickets_update" ON support_tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_tickets_user ON support_tickets(user_id);

CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ────────────────────────────────────────────────────────────
--  18. REELS
-- ────────────────────────────────────────────────────────────
CREATE TABLE reels (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     uuid REFERENCES products(id) ON DELETE SET NULL,
  video_url      text NOT NULL,
  thumbnail_url  text,
  title          text,
  description    text,
  likes_count    int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  sort_order     int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reels_read"   ON reels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reels_insert" ON reels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "reels_update" ON reels FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "reels_delete" ON reels FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_reels_product    ON reels(product_id);
CREATE INDEX idx_reels_active     ON reels(is_active);
CREATE INDEX idx_reels_sort_order ON reels(sort_order);

-- ────────────────────────────────────────────────────────────
--  19. REEL LIKES
-- ────────────────────────────────────────────────────────────
CREATE TABLE reel_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id    uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reel_likes_read"   ON reel_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reel_likes_insert" ON reel_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reel_likes_delete" ON reel_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_reel_likes_reel ON reel_likes(reel_id);
CREATE INDEX idx_reel_likes_user ON reel_likes(user_id);

-- Auto-update reel likes_count
CREATE OR REPLACE FUNCTION update_reel_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET likes_count = likes_count + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_reel_likes_count
  AFTER INSERT OR DELETE ON reel_likes
  FOR EACH ROW EXECUTE FUNCTION update_reel_likes_count();

-- ────────────────────────────────────────────────────────────
--  20. REEL COMMENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE reel_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id    uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reel_comments_read"   ON reel_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reel_comments_insert" ON reel_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reel_comments_delete" ON reel_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_reel_comments_reel ON reel_comments(reel_id);
CREATE INDEX idx_reel_comments_user ON reel_comments(user_id);

-- Auto-update reel comments_count
CREATE OR REPLACE FUNCTION update_reel_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET comments_count = comments_count + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_reel_comments_count
  AFTER INSERT OR DELETE ON reel_comments
  FOR EACH ROW EXECUTE FUNCTION update_reel_comments_count();

-- ────────────────────────────────────────────────────────────
--  ✅ تم! كل الجداول جاهزة بشكل كامل
-- ────────────────────────────────────────────────────────────
