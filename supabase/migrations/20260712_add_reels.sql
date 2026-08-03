-- ============ REELS ============
CREATE TABLE IF NOT EXISTS reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  title text,
  description text,
  likes_count int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_reels" ON reels;
CREATE POLICY "read_reels" ON reels FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_reels" ON reels;
CREATE POLICY "insert_reels" ON reels FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_reels" ON reels;
CREATE POLICY "update_reels" ON reels FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_reels" ON reels;
CREATE POLICY "delete_reels" ON reels FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_reels_product_id ON reels(product_id);
CREATE INDEX IF NOT EXISTS idx_reels_is_active ON reels(is_active);
CREATE INDEX IF NOT EXISTS idx_reels_sort_order ON reels(sort_order);

-- ============ REEL LIKES ============
CREATE TABLE IF NOT EXISTS reel_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reel_id, user_id)
);
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_reel_likes" ON reel_likes;
CREATE POLICY "read_reel_likes" ON reel_likes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_reel_like" ON reel_likes;
CREATE POLICY "insert_own_reel_like" ON reel_likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reel_like" ON reel_likes;
CREATE POLICY "delete_own_reel_like" ON reel_likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_id ON reel_likes(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_likes_user_id ON reel_likes(user_id);

-- ============ REEL COMMENTS ============
CREATE TABLE IF NOT EXISTS reel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_reel_comments" ON reel_comments;
CREATE POLICY "read_reel_comments" ON reel_comments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_reel_comment" ON reel_comments;
CREATE POLICY "insert_own_reel_comment" ON reel_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reel_comment" ON reel_comments;
CREATE POLICY "delete_own_reel_comment" ON reel_comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reel_comments_reel_id ON reel_comments(reel_id);
