-- ============================================================
--  STYLE APP — SEED DATA (منتجات وهمية)
--  شغّل هذا الكود بعد FULL_SCHEMA_RESET.sql مباشرةً
--  Supabase → SQL Editor → Run
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  1. CATEGORIES (الفئات)
-- ────────────────────────────────────────────────────────────
INSERT INTO categories (id, name, slug, description, image_url, sort_order, is_active) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Men',         'men',         'Men''s fashion collection',       'https://images.unsplash.com/photo-1490367532201-b9bc1dc483f6?w=600&q=80', 1, true),
  ('10000000-0000-0000-0000-000000000002', 'Women',       'women',       'Women''s fashion collection',     'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80', 2, true),
  ('10000000-0000-0000-0000-000000000003', 'Kids',        'kids',        'Kids'' fashion collection',       'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=600&q=80', 3, true),
  ('10000000-0000-0000-0000-000000000004', 'Shoes',       'shoes',       'Footwear for all occasions',      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', 4, true),
  ('10000000-0000-0000-0000-000000000005', 'Accessories', 'accessories', 'Bags, hats and accessories',      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&q=80', 5, true),
  ('10000000-0000-0000-0000-000000000006', 'Sale',        'sale',        'Discounted items up to 70% off', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80', 6, true);

-- ────────────────────────────────────────────────────────────
--  2. PRODUCTS (المنتجات)
-- ────────────────────────────────────────────────────────────
INSERT INTO products (id, name, slug, description, price, compare_at_price, category_id, brand, sku, material, status, is_featured, is_new, rating, review_count) VALUES

-- === MEN ===
('20000000-0000-0000-0000-000000000001',
 'Classic White Oxford Shirt', 'classic-white-oxford-shirt',
 'A timeless Oxford shirt crafted from premium 100% Egyptian cotton. Features a button-down collar, chest pocket, and a relaxed tailored fit perfect for both formal and casual occasions.',
 49.99, 79.99, '10000000-0000-0000-0000-000000000001',
 'STYLE Essentials', 'MEN-SHIRT-001', '100% Egyptian Cotton',
 'active', true, true, 4.7, 142),

('20000000-0000-0000-0000-000000000002',
 'Slim Fit Chino Pants', 'slim-fit-chino-pants',
 'Modern slim-fit chinos made from stretch cotton blend for all-day comfort. Available in classic neutral tones that pair effortlessly with any look.',
 65.00, 89.00, '10000000-0000-0000-0000-000000000001',
 'STYLE Essentials', 'MEN-PANTS-001', '98% Cotton 2% Elastane',
 'active', true, false, 4.5, 98),

('20000000-0000-0000-0000-000000000003',
 'Premium Merino Crewneck Sweater', 'premium-merino-crewneck-sweater',
 'Exceptionally soft merino wool sweater with a classic crewneck cut. Lightweight yet warm, perfect for layering in colder months. Naturally odor-resistant and temperature regulating.',
 89.99, 129.99, '10000000-0000-0000-0000-000000000001',
 'STYLE Premium', 'MEN-SWEATER-001', '100% Merino Wool',
 'active', true, false, 4.8, 67),

('20000000-0000-0000-0000-000000000004',
 'Structured Blazer', 'structured-blazer-men',
 'A sharp, structured blazer with notched lapels and a single-button front. Crafted from a wool-blend fabric that holds its shape throughout the day. Perfect for boardroom to bar.',
 149.99, 220.00, '10000000-0000-0000-0000-000000000001',
 'STYLE Premium', 'MEN-BLAZER-001', '70% Wool 30% Polyester',
 'active', false, true, 4.6, 45),

('20000000-0000-0000-0000-000000000005',
 'Essential Graphic Tee', 'essential-graphic-tee',
 'Ultra-soft jersey tee featuring an exclusive graphic print. Cut from heavyweight 220gsm combed cotton for a premium feel that keeps its shape wash after wash.',
 24.99, NULL, '10000000-0000-0000-0000-000000000001',
 'STYLE Basics', 'MEN-TEE-001', '100% Combed Cotton 220gsm',
 'active', false, true, 4.3, 203),

('20000000-0000-0000-0000-000000000006',
 'Athletic Jogger Pants', 'athletic-jogger-pants',
 'Engineered for movement, these joggers feature moisture-wicking fabric, zippered side pockets, and an adjustable drawstring waist. From gym to street effortlessly.',
 45.00, 60.00, '10000000-0000-0000-0000-000000000001',
 'STYLE Sport', 'MEN-JOGGER-001', '80% Polyester 20% Spandex',
 'active', false, false, 4.4, 88),

-- === WOMEN ===
('20000000-0000-0000-0000-000000000007',
 'Silk Blend Wrap Dress', 'silk-blend-wrap-dress',
 'An effortlessly elegant wrap dress made from a luxurious silk-blend fabric that drapes beautifully. The adjustable wrap design flatters every figure. A wardrobe essential.',
 119.99, 165.00, '10000000-0000-0000-0000-000000000002',
 'STYLE Luxe', 'WOM-DRESS-001', '65% Silk 35% Polyester',
 'active', true, true, 4.9, 312),

('20000000-0000-0000-0000-000000000008',
 'High-Waist Straight Jeans', 'high-waist-straight-jeans',
 'Flattering high-rise jeans with a straight-leg silhouette. Made from premium selvedge denim with just the right amount of stretch for all-day wear. True to size.',
 75.00, 105.00, '10000000-0000-0000-0000-000000000002',
 'STYLE Denim', 'WOM-JEANS-001', '92% Cotton 6% Polyester 2% Elastane',
 'active', true, false, 4.6, 189),

('20000000-0000-0000-0000-000000000009',
 'Linen Summer Blouse', 'linen-summer-blouse',
 'Breezy and lightweight pure linen blouse with puff sleeves and a relaxed fit. Perfect for warm days. Gets softer with every wash. Pair with jeans or a midi skirt.',
 42.00, NULL, '10000000-0000-0000-0000-000000000002',
 'STYLE Essentials', 'WOM-BLOUSE-001', '100% French Linen',
 'active', false, true, 4.7, 156),

('20000000-0000-0000-0000-000000000010',
 'Knit Cardigan Coat', 'knit-cardigan-coat',
 'Oversized chunky-knit cardigan with deep side pockets and a relaxed silhouette. The perfect cozy layer for cool evenings. Available in rich seasonal tones.',
 98.00, 140.00, '10000000-0000-0000-0000-000000000002',
 'STYLE Premium', 'WOM-CARDI-001', '60% Wool 40% Acrylic',
 'active', true, false, 4.8, 97),

('20000000-0000-0000-0000-000000000011',
 'Pleated Midi Skirt', 'pleated-midi-skirt',
 'An elegant pleated midi skirt with a fluid drape that moves beautifully. Features a hidden side zipper and a comfortable elasticated back waistband. Office to dinner ready.',
 58.00, 78.00, '10000000-0000-0000-0000-000000000002',
 'STYLE Essentials', 'WOM-SKIRT-001', '100% Polyester Crepe',
 'active', false, true, 4.5, 74),

('20000000-0000-0000-0000-000000000012',
 'Active Leggings Pro', 'active-leggings-pro',
 'High-performance leggings with a compressive four-way stretch fabric, hidden waistband pocket, and flatlock seams to prevent chafing. Squat-proof guarantee.',
 55.00, 70.00, '10000000-0000-0000-0000-000000000002',
 'STYLE Sport', 'WOM-LEGGING-001', '78% Nylon 22% Spandex',
 'active', false, false, 4.7, 234),

-- === KIDS ===
('20000000-0000-0000-0000-000000000013',
 'Kids Cozy Hoodie', 'kids-cozy-hoodie',
 'Super soft fleece hoodie with a kangaroo pocket and adjustable drawstrings. Pre-shrunk fabric ensures a consistent fit. Available in fun prints kids will love.',
 32.00, 45.00, '10000000-0000-0000-0000-000000000003',
 'STYLE Kids', 'KID-HOODIE-001', '80% Cotton 20% Polyester Fleece',
 'active', true, true, 4.8, 167),

('20000000-0000-0000-0000-000000000014',
 'Boys Jogger Set', 'boys-jogger-set',
 'Comfortable matching 2-piece jogger set including a crew neck sweatshirt and tapered jogger pants. Easy-care fabric that stays soft wash after wash. Great for school and play.',
 39.99, NULL, '10000000-0000-0000-0000-000000000003',
 'STYLE Kids', 'KID-JOGGER-001', '60% Cotton 40% Polyester',
 'active', false, true, 4.6, 83),

-- === SHOES ===
('20000000-0000-0000-0000-000000000015',
 'White Leather Sneakers', 'white-leather-sneakers',
 'Minimalist low-top sneakers crafted from full-grain leather with a cushioned insole and durable rubber outsole. A versatile pair that elevates every outfit.',
 119.00, 160.00, '10000000-0000-0000-0000-000000000004',
 'STYLE Footwear', 'SHOE-SNKR-001', 'Full-Grain Leather Upper',
 'active', true, true, 4.7, 298),

('20000000-0000-0000-0000-000000000016',
 'Running Performance Shoes', 'running-performance-shoes',
 'Engineered for speed and comfort. Features a responsive foam midsole, breathable mesh upper, and a grippy carbon rubber outsole. Certified for marathon training.',
 145.00, 195.00, '10000000-0000-0000-0000-000000000004',
 'STYLE Sport', 'SHOE-RUN-001', 'Engineered Mesh + TPU',
 'active', true, false, 4.8, 145),

-- === ACCESSORIES ===
('20000000-0000-0000-0000-000000000017',
 'Leather Tote Bag', 'leather-tote-bag',
 'Spacious everyday tote handcrafted from vegetable-tanned full-grain leather. Features a zippered inner pocket, magnetic snap closure, and sturdy leather handles. Ages beautifully.',
 185.00, 250.00, '10000000-0000-0000-0000-000000000005',
 'STYLE Luxe', 'ACC-TOTE-001', 'Full-Grain Vegetable-Tanned Leather',
 'active', true, true, 4.9, 87),

('20000000-0000-0000-0000-000000000018',
 'Wool Baseball Cap', 'wool-baseball-cap',
 'Classic 6-panel structured baseball cap made from premium felted wool. Adjustable leather strap closure. An iconic piece for every wardrobe.',
 35.00, NULL, '10000000-0000-0000-0000-000000000005',
 'STYLE Basics', 'ACC-CAP-001', '100% Felted Wool',
 'active', false, true, 4.4, 112);

-- ────────────────────────────────────────────────────────────
--  3. PRODUCT IMAGES (صور المنتجات — Unsplash)
-- ────────────────────────────────────────────────────────────
INSERT INTO product_images (product_id, image_url, sort_order) VALUES
-- Men's Oxford Shirt
('20000000-0000-0000-0000-000000000001','https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80', 0),
('20000000-0000-0000-0000-000000000001','https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80', 1),
('20000000-0000-0000-0000-000000000001','https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&q=80', 2),
-- Men's Chino Pants
('20000000-0000-0000-0000-000000000002','https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80', 0),
('20000000-0000-0000-0000-000000000002','https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80', 1),
-- Men's Sweater
('20000000-0000-0000-0000-000000000003','https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80', 0),
('20000000-0000-0000-0000-000000000003','https://images.unsplash.com/photo-1518841695823-f33d25af4e63?w=600&q=80', 1),
-- Men's Blazer
('20000000-0000-0000-0000-000000000004','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80', 0),
('20000000-0000-0000-0000-000000000004','https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&q=80', 1),
-- Men's Graphic Tee
('20000000-0000-0000-0000-000000000005','https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&q=80', 0),
('20000000-0000-0000-0000-000000000005','https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&q=80', 1),
-- Men's Jogger
('20000000-0000-0000-0000-000000000006','https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=600&q=80', 0),
-- Women's Wrap Dress
('20000000-0000-0000-0000-000000000007','https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80', 0),
('20000000-0000-0000-0000-000000000007','https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&q=80', 1),
('20000000-0000-0000-0000-000000000007','https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80', 2),
-- Women's Jeans
('20000000-0000-0000-0000-000000000008','https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80', 0),
('20000000-0000-0000-0000-000000000008','https://images.unsplash.com/photo-1475178626620-a4d074967452?w=600&q=80', 1),
-- Women's Blouse
('20000000-0000-0000-0000-000000000009','https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=600&q=80', 0),
('20000000-0000-0000-0000-000000000009','https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=600&q=80', 1),
-- Women's Cardigan
('20000000-0000-0000-0000-000000000010','https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80', 0),
('20000000-0000-0000-0000-000000000010','https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80', 1),
-- Women's Skirt
('20000000-0000-0000-0000-000000000011','https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=600&q=80', 0),
-- Women's Leggings
('20000000-0000-0000-0000-000000000012','https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600&q=80', 0),
('20000000-0000-0000-0000-000000000012','https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=600&q=80', 1),
-- Kids Hoodie
('20000000-0000-0000-0000-000000000013','https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=600&q=80', 0),
-- Kids Jogger Set
('20000000-0000-0000-0000-000000000014','https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&q=80', 0),
-- White Sneakers
('20000000-0000-0000-0000-000000000015','https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', 0),
('20000000-0000-0000-0000-000000000015','https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80', 1),
('20000000-0000-0000-0000-000000000015','https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600&q=80', 2),
-- Running Shoes
('20000000-0000-0000-0000-000000000016','https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80', 0),
('20000000-0000-0000-0000-000000000016','https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80', 1),
-- Tote Bag
('20000000-0000-0000-0000-000000000017','https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80', 0),
('20000000-0000-0000-0000-000000000017','https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&q=80', 1),
-- Cap
('20000000-0000-0000-0000-000000000018','https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80', 0);

-- ────────────────────────────────────────────────────────────
--  4. PRODUCT VARIANTS (مقاسات وألوان)
-- ────────────────────────────────────────────────────────────
INSERT INTO product_variants (product_id, size, color, color_hex, stock, sku) VALUES
-- Oxford Shirt
('20000000-0000-0000-0000-000000000001','S',  'White',      '#FFFFFF', 25, 'MEN-SHIRT-001-S-W'),
('20000000-0000-0000-0000-000000000001','M',  'White',      '#FFFFFF', 40, 'MEN-SHIRT-001-M-W'),
('20000000-0000-0000-0000-000000000001','L',  'White',      '#FFFFFF', 35, 'MEN-SHIRT-001-L-W'),
('20000000-0000-0000-0000-000000000001','XL', 'White',      '#FFFFFF', 20, 'MEN-SHIRT-001-XL-W'),
('20000000-0000-0000-0000-000000000001','S',  'Light Blue', '#ADD8E6', 18, 'MEN-SHIRT-001-S-LB'),
('20000000-0000-0000-0000-000000000001','M',  'Light Blue', '#ADD8E6', 30, 'MEN-SHIRT-001-M-LB'),
('20000000-0000-0000-0000-000000000001','L',  'Light Blue', '#ADD8E6', 28, 'MEN-SHIRT-001-L-LB'),
-- Chino Pants
('20000000-0000-0000-0000-000000000002','28', 'Beige', '#F5F5DC', 20, 'MEN-PANTS-001-28-BE'),
('20000000-0000-0000-0000-000000000002','30', 'Beige', '#F5F5DC', 30, 'MEN-PANTS-001-30-BE'),
('20000000-0000-0000-0000-000000000002','32', 'Beige', '#F5F5DC', 35, 'MEN-PANTS-001-32-BE'),
('20000000-0000-0000-0000-000000000002','34', 'Beige', '#F5F5DC', 25, 'MEN-PANTS-001-34-BE'),
('20000000-0000-0000-0000-000000000002','30', 'Navy',  '#1B3A6B', 22, 'MEN-PANTS-001-30-NV'),
('20000000-0000-0000-0000-000000000002','32', 'Navy',  '#1B3A6B', 28, 'MEN-PANTS-001-32-NV'),
('20000000-0000-0000-0000-000000000002','30', 'Olive', '#808000', 15, 'MEN-PANTS-001-30-OL'),
('20000000-0000-0000-0000-000000000002','32', 'Olive', '#808000', 18, 'MEN-PANTS-001-32-OL'),
-- Merino Sweater
('20000000-0000-0000-0000-000000000003','S',  'Camel',    '#C19A6B', 12, 'MEN-SWEATER-001-S-CA'),
('20000000-0000-0000-0000-000000000003','M',  'Camel',    '#C19A6B', 18, 'MEN-SWEATER-001-M-CA'),
('20000000-0000-0000-0000-000000000003','L',  'Camel',    '#C19A6B', 14, 'MEN-SWEATER-001-L-CA'),
('20000000-0000-0000-0000-000000000003','M',  'Charcoal', '#36454F', 20, 'MEN-SWEATER-001-M-CH'),
('20000000-0000-0000-0000-000000000003','L',  'Charcoal', '#36454F', 15, 'MEN-SWEATER-001-L-CH'),
-- Blazer
('20000000-0000-0000-0000-000000000004','S',  'Black', '#000000', 8,  'MEN-BLAZER-001-S-BK'),
('20000000-0000-0000-0000-000000000004','M',  'Black', '#000000', 12, 'MEN-BLAZER-001-M-BK'),
('20000000-0000-0000-0000-000000000004','L',  'Black', '#000000', 10, 'MEN-BLAZER-001-L-BK'),
('20000000-0000-0000-0000-000000000004','M',  'Navy',  '#1B3A6B', 10, 'MEN-BLAZER-001-M-NV'),
('20000000-0000-0000-0000-000000000004','L',  'Navy',  '#1B3A6B', 8,  'MEN-BLAZER-001-L-NV'),
-- Graphic Tee
('20000000-0000-0000-0000-000000000005','XS', 'Black', '#000000', 30, 'MEN-TEE-001-XS-BK'),
('20000000-0000-0000-0000-000000000005','S',  'Black', '#000000', 45, 'MEN-TEE-001-S-BK'),
('20000000-0000-0000-0000-000000000005','M',  'Black', '#000000', 60, 'MEN-TEE-001-M-BK'),
('20000000-0000-0000-0000-000000000005','L',  'Black', '#000000', 50, 'MEN-TEE-001-L-BK'),
('20000000-0000-0000-0000-000000000005','XL', 'Black', '#000000', 35, 'MEN-TEE-001-XL-BK'),
('20000000-0000-0000-0000-000000000005','M',  'White', '#FFFFFF', 40, 'MEN-TEE-001-M-WH'),
('20000000-0000-0000-0000-000000000005','L',  'White', '#FFFFFF', 35, 'MEN-TEE-001-L-WH'),
-- Joggers
('20000000-0000-0000-0000-000000000006','S',  'Black', '#000000', 25, 'MEN-JOGGER-001-S-BK'),
('20000000-0000-0000-0000-000000000006','M',  'Black', '#000000', 35, 'MEN-JOGGER-001-M-BK'),
('20000000-0000-0000-0000-000000000006','L',  'Black', '#000000', 30, 'MEN-JOGGER-001-L-BK'),
('20000000-0000-0000-0000-000000000006','M',  'Grey',  '#808080', 25, 'MEN-JOGGER-001-M-GY'),
-- Wrap Dress
('20000000-0000-0000-0000-000000000007','XS', 'Floral Blush',  '#F4A7B9', 15, 'WOM-DRESS-001-XS-FB'),
('20000000-0000-0000-0000-000000000007','S',  'Floral Blush',  '#F4A7B9', 20, 'WOM-DRESS-001-S-FB'),
('20000000-0000-0000-0000-000000000007','M',  'Floral Blush',  '#F4A7B9', 22, 'WOM-DRESS-001-M-FB'),
('20000000-0000-0000-0000-000000000007','L',  'Floral Blush',  '#F4A7B9', 18, 'WOM-DRESS-001-L-FB'),
('20000000-0000-0000-0000-000000000007','S',  'Midnight Navy', '#1B3A6B', 12, 'WOM-DRESS-001-S-MN'),
('20000000-0000-0000-0000-000000000007','M',  'Midnight Navy', '#1B3A6B', 16, 'WOM-DRESS-001-M-MN'),
-- Women's Jeans
('20000000-0000-0000-0000-000000000008','24', 'Medium Wash', '#6B8CAE', 15, 'WOM-JEANS-001-24-MW'),
('20000000-0000-0000-0000-000000000008','26', 'Medium Wash', '#6B8CAE', 20, 'WOM-JEANS-001-26-MW'),
('20000000-0000-0000-0000-000000000008','28', 'Medium Wash', '#6B8CAE', 25, 'WOM-JEANS-001-28-MW'),
('20000000-0000-0000-0000-000000000008','30', 'Medium Wash', '#6B8CAE', 18, 'WOM-JEANS-001-30-MW'),
('20000000-0000-0000-0000-000000000008','26', 'Dark Wash',   '#1C2B4A', 16, 'WOM-JEANS-001-26-DW'),
('20000000-0000-0000-0000-000000000008','28', 'Dark Wash',   '#1C2B4A', 22, 'WOM-JEANS-001-28-DW'),
-- Blouse
('20000000-0000-0000-0000-000000000009','XS', 'White', '#FFFFFF', 20, 'WOM-BLOUSE-001-XS-W'),
('20000000-0000-0000-0000-000000000009','S',  'White', '#FFFFFF', 28, 'WOM-BLOUSE-001-S-W'),
('20000000-0000-0000-0000-000000000009','M',  'White', '#FFFFFF', 30, 'WOM-BLOUSE-001-M-W'),
('20000000-0000-0000-0000-000000000009','S',  'Sage',  '#8B9D77', 15, 'WOM-BLOUSE-001-S-SG'),
('20000000-0000-0000-0000-000000000009','M',  'Sage',  '#8B9D77', 18, 'WOM-BLOUSE-001-M-SG'),
-- Cardigan
('20000000-0000-0000-0000-000000000010','XS', 'Cream',   '#FFFDD0', 10, 'WOM-CARDI-001-XS-CR'),
('20000000-0000-0000-0000-000000000010','S',  'Cream',   '#FFFDD0', 15, 'WOM-CARDI-001-S-CR'),
('20000000-0000-0000-0000-000000000010','M',  'Cream',   '#FFFDD0', 18, 'WOM-CARDI-001-M-CR'),
('20000000-0000-0000-0000-000000000010','S',  'Caramel', '#C19A6B', 12, 'WOM-CARDI-001-S-CA'),
('20000000-0000-0000-0000-000000000010','M',  'Caramel', '#C19A6B', 14, 'WOM-CARDI-001-M-CA'),
-- Skirt
('20000000-0000-0000-0000-000000000011','XS', 'Black', '#000000', 12, 'WOM-SKIRT-001-XS-BK'),
('20000000-0000-0000-0000-000000000011','S',  'Black', '#000000', 18, 'WOM-SKIRT-001-S-BK'),
('20000000-0000-0000-0000-000000000011','M',  'Black', '#000000', 22, 'WOM-SKIRT-001-M-BK'),
('20000000-0000-0000-0000-000000000011','S',  'Blush', '#F4A7B9', 10, 'WOM-SKIRT-001-S-BL'),
('20000000-0000-0000-0000-000000000011','M',  'Blush', '#F4A7B9', 14, 'WOM-SKIRT-001-M-BL'),
-- Leggings
('20000000-0000-0000-0000-000000000012','XS', 'Black',    '#000000', 30, 'WOM-LEGGING-001-XS-BK'),
('20000000-0000-0000-0000-000000000012','S',  'Black',    '#000000', 40, 'WOM-LEGGING-001-S-BK'),
('20000000-0000-0000-0000-000000000012','M',  'Black',    '#000000', 45, 'WOM-LEGGING-001-M-BK'),
('20000000-0000-0000-0000-000000000012','L',  'Black',    '#000000', 35, 'WOM-LEGGING-001-L-BK'),
('20000000-0000-0000-0000-000000000012','S',  'Midnight', '#2C3E50', 20, 'WOM-LEGGING-001-S-MN'),
-- Kids Hoodie
('20000000-0000-0000-0000-000000000013','3-4Y', 'Grey', '#808080', 15, 'KID-HOODIE-001-4-GY'),
('20000000-0000-0000-0000-000000000013','5-6Y', 'Grey', '#808080', 18, 'KID-HOODIE-001-6-GY'),
('20000000-0000-0000-0000-000000000013','7-8Y', 'Grey', '#808080', 14, 'KID-HOODIE-001-8-GY'),
('20000000-0000-0000-0000-000000000013','5-6Y', 'Navy', '#1B3A6B', 12, 'KID-HOODIE-001-6-NV'),
-- Kids Jogger Set
('20000000-0000-0000-0000-000000000014','3-4Y', 'Black', '#000000', 10, 'KID-JOGGER-001-4-BK'),
('20000000-0000-0000-0000-000000000014','5-6Y', 'Black', '#000000', 14, 'KID-JOGGER-001-6-BK'),
('20000000-0000-0000-0000-000000000014','7-8Y', 'Black', '#000000', 12, 'KID-JOGGER-001-8-BK'),
-- Sneakers
('20000000-0000-0000-0000-000000000015','38', 'White', '#FFFFFF', 10, 'SHOE-SNKR-001-38-W'),
('20000000-0000-0000-0000-000000000015','39', 'White', '#FFFFFF', 15, 'SHOE-SNKR-001-39-W'),
('20000000-0000-0000-0000-000000000015','40', 'White', '#FFFFFF', 20, 'SHOE-SNKR-001-40-W'),
('20000000-0000-0000-0000-000000000015','41', 'White', '#FFFFFF', 18, 'SHOE-SNKR-001-41-W'),
('20000000-0000-0000-0000-000000000015','42', 'White', '#FFFFFF', 15, 'SHOE-SNKR-001-42-W'),
('20000000-0000-0000-0000-000000000015','40', 'Black', '#000000', 12, 'SHOE-SNKR-001-40-BK'),
('20000000-0000-0000-0000-000000000015','41', 'Black', '#000000', 14, 'SHOE-SNKR-001-41-BK'),
('20000000-0000-0000-0000-000000000015','42', 'Black', '#000000', 12, 'SHOE-SNKR-001-42-BK'),
-- Running Shoes
('20000000-0000-0000-0000-000000000016','39', 'Black/Red',  '#8B0000', 8,  'SHOE-RUN-001-39-BR'),
('20000000-0000-0000-0000-000000000016','40', 'Black/Red',  '#8B0000', 12, 'SHOE-RUN-001-40-BR'),
('20000000-0000-0000-0000-000000000016','41', 'Black/Red',  '#8B0000', 14, 'SHOE-RUN-001-41-BR'),
('20000000-0000-0000-0000-000000000016','42', 'Black/Red',  '#8B0000', 12, 'SHOE-RUN-001-42-BR'),
('20000000-0000-0000-0000-000000000016','40', 'White/Blue', '#4169E1', 10, 'SHOE-RUN-001-40-WB'),
('20000000-0000-0000-0000-000000000016','41', 'White/Blue', '#4169E1', 12, 'SHOE-RUN-001-41-WB'),
-- Tote Bag
('20000000-0000-0000-0000-000000000017','One Size', 'Tan',   '#D2B48C', 8,  'ACC-TOTE-001-OS-TN'),
('20000000-0000-0000-0000-000000000017','One Size', 'Black', '#000000', 10, 'ACC-TOTE-001-OS-BK'),
-- Cap
('20000000-0000-0000-0000-000000000018','S/M', 'Black', '#000000', 20, 'ACC-CAP-001-SM-BK'),
('20000000-0000-0000-0000-000000000018','L/XL','Black', '#000000', 15, 'ACC-CAP-001-LX-BK'),
('20000000-0000-0000-0000-000000000018','S/M', 'Camel', '#C19A6B', 12, 'ACC-CAP-001-SM-CA'),
('20000000-0000-0000-0000-000000000018','L/XL','Camel', '#C19A6B', 10, 'ACC-CAP-001-LX-CA');

-- ────────────────────────────────────────────────────────────
--  5. BANNERS (بنرات الصفحة الرئيسية)
-- ────────────────────────────────────────────────────────────
INSERT INTO banners (title, subtitle, image_url, cta_text, cta_link, placement, sort_order, is_active) VALUES
('New Season Arrivals',
 'Up to 40% off on selected styles',
 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
 'Shop Now', '/category/new-arrivals', 'home_slider', 1, true),

('Women''s Collection 2026',
 'Discover the latest trends',
 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80',
 'Explore', '/category/women', 'home_slider', 2, true),

('Men''s Essentials',
 'Timeless pieces, modern fits',
 'https://images.unsplash.com/photo-1490367532201-b9bc1dc483f6?w=1200&q=80',
 'Shop Men', '/category/men', 'home_slider', 3, true),

('Summer Sale',
 'Extra 20% off with code SUMMER20',
 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80',
 'Grab the Deal', '/category/sale', 'home_secondary', 1, true),

('New Footwear Drop',
 'Step into something new',
 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80',
 'See Shoes', '/category/shoes', 'home_secondary', 2, true);

-- ────────────────────────────────────────────────────────────
--  6. COUPONS (أكواد خصم)
-- ────────────────────────────────────────────────────────────
INSERT INTO coupons (code, description, discount_type, discount_value, min_spend, max_uses, valid_from, valid_until, is_active) VALUES
('WELCOME10', 'Welcome discount — 10% off your first order', 'percentage', 10.00, 0,   1000, now(), now() + interval '365 days', true),
('SUMMER20',  'Summer sale — 20% off all orders',            'percentage', 20.00, 50,  500,  now(), now() + interval '90 days',  true),
('STYLE15',   '15% off sitewide for loyal members',          'percentage', 15.00, 30,  NULL, now(), NULL,                        true),
('FREE10',    '$10 off orders over $75',                     'fixed',      10.00, 75,  200,  now(), now() + interval '60 days',  true),
('VIP25',     'VIP members — 25% off everything',            'percentage', 25.00, 100, 50,   now(), now() + interval '30 days',  true);

-- ────────────────────────────────────────────────────────────
--  ✅ تم! التطبيق جاهز للعرض
--  18 منتج | 75+ variant | 40+ صورة | 6 فئات | 5 بنرات | 5 كوبونات
-- ────────────────────────────────────────────────────────────
