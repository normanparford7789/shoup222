/*
# Seed Sample Data

## Overview
Populates the database with sample categories, products, variants, images, banners, and coupons so the app has content to display on first launch.

## Data Added
1. Categories: Men, Women, Kids, Shoes, Accessories, New Arrivals, Best Sellers, Sale
2. Products: 12 sample clothing products across categories with images from Pexels
3. Product variants: size/color combinations with stock
4. Product images: multiple images per product
5. Banners: 3 home slider banners + 2 secondary banners
6. Coupons: 3 sample discount codes (WELCOME10, SUMMER20, FREESHIP)

## Notes
- All images use Pexels stock photos (clothing/fashion themed)
- Prices in USD
- Products have realistic names, descriptions, materials, brands
- Featured and new arrival flags set on select products
*/

-- ============ CATEGORIES ============
INSERT INTO categories (name, slug, description, image_url, sort_order) VALUES
('Men', 'men', 'Men''s clothing collection', 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=600', 1),
('Women', 'women', 'Women''s clothing collection', 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=600', 2),
('Kids', 'kids', 'Kids''s clothing collection', 'https://images.pexels.com/photos/8434631/pexels-photo-8434631.jpeg?auto=compress&cs=tinysrgb&w=600', 3),
('Shoes', 'shoes', 'Shoes and sneakers', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=600', 4),
('Accessories', 'accessories', 'Bags, hats, belts and more', 'https://images.pexels.com/photos/1152078/pexels-photo-1152078.jpeg?auto=compress&cs=tinysrgb&w=600', 5),
('New Arrivals', 'new-arrivals', 'Latest products', 'https://images.pexels.com/photos/1488463/pexels-photo-1488463.jpeg?auto=compress&cs=tinysrgb&w=600', 6),
('Best Sellers', 'best-sellers', 'Top selling products', 'https://images.pexels.com/photos/19090/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=600', 7),
('Sale', 'sale', 'Discounted items', 'https://images.pexels.com/photos/5650028/pexels-photo-5650028.jpeg?auto=compress&cs=tinysrgb&w=600', 8)
ON CONFLICT (slug) DO NOTHING;

-- ============ PRODUCTS ============
INSERT INTO products (name, slug, description, price, compare_at_price, category_id, brand, sku, material, is_featured, is_new) VALUES
('Classic White T-Shirt', 'classic-white-tshirt', 'Premium cotton white t-shirt with a comfortable fit. Perfect for everyday wear.', 29.99, 39.99, (SELECT id FROM categories WHERE slug='men'), 'Urban Co', 'TS-WHT-001', '100% Cotton', true, true),
('Slim Fit Jeans', 'slim-fit-jeans', 'Modern slim fit jeans with stretch denim for all-day comfort.', 59.99, 79.99, (SELECT id FROM categories WHERE slug='men'), 'Denim Lab', 'JN-SLM-002', '98% Cotton, 2% Elastane', true, false),
('Summer Dress', 'summer-dress', 'Light and breezy floral summer dress, perfect for warm days.', 49.99, 69.99, (SELECT id FROM categories WHERE slug='women'), 'Bloom', 'DR-SUM-003', '100% Rayon', true, true),
('Casual Hoodie', 'casual-hoodie', 'Soft fleece-lined hoodie for casual outings.', 45.99, NULL, (SELECT id FROM categories WHERE slug='men'), 'Street Wear', 'HD-CAS-004', '60% Cotton, 40% Polyester', false, true),
('Running Sneakers', 'running-sneakers', 'Lightweight running sneakers with breathable mesh upper.', 89.99, 119.99, (SELECT id FROM categories WHERE slug='shoes'), 'SpeedUp', 'SN-RUN-005', 'Synthetic', true, false),
('Leather Handbag', 'leather-handbag', 'Genuine leather handbag with multiple compartments.', 129.99, 159.99, (SELECT id FROM categories WHERE slug='accessories'), 'Luxe', 'BG-LTH-006', 'Genuine Leather', true, false),
('Kids T-Shirt', 'kids-tshirt', 'Fun and colorful t-shirt for kids.', 19.99, 24.99, (SELECT id FROM categories WHERE slug='kids'), 'Tiny Tots', 'TS-KID-007', '100% Cotton', false, true),
('Formal Shirt', 'formal-shirt', 'Crisp formal shirt for office and events.', 39.99, 49.99, (SELECT id FROM categories WHERE slug='men'), 'Office', 'SH-FRM-008', '65% Polyester, 35% Cotton', false, false),
('Yoga Leggings', 'yoga-leggings', 'High-waist yoga leggings with four-way stretch.', 34.99, 44.99, (SELECT id FROM categories WHERE slug='women'), 'FlexFit', 'LG-YGA-009', '82% Nylon, 18% Spandex', true, true),
('Winter Jacket', 'winter-jacket', 'Warm padded winter jacket with hood.', 99.99, 149.99, (SELECT id FROM categories WHERE slug='men'), 'Arctic', 'JK-WTR-010', 'Polyester', false, false),
('Sneakers Black', 'sneakers-black', 'Classic black sneakers for everyday style.', 69.99, 89.99, (SELECT id FROM categories WHERE slug='shoes'), 'Street Wear', 'SN-BLK-011', 'Synthetic', false, true),
('Sunglasses', 'sunglasses', 'Stylish UV-protection sunglasses.', 24.99, 34.99, (SELECT id FROM categories WHERE slug='accessories'), 'SunView', 'SG-STY-012', 'Plastic', false, false)
ON CONFLICT (slug) DO NOTHING;

-- ============ PRODUCT VARIANTS ============
INSERT INTO product_variants (product_id, size, color, color_hex, stock, sku) VALUES
((SELECT id FROM products WHERE slug='classic-white-tshirt'), 'S', 'White', '#FFFFFF', 50, 'TS-WHT-001-S-WHT'),
((SELECT id FROM products WHERE slug='classic-white-tshirt'), 'M', 'White', '#FFFFFF', 75, 'TS-WHT-001-M-WHT'),
((SELECT id FROM products WHERE slug='classic-white-tshirt'), 'L', 'White', '#FFFFFF', 60, 'TS-WHT-001-L-WHT'),
((SELECT id FROM products WHERE slug='classic-white-tshirt'), 'XL', 'White', '#FFFFFF', 40, 'TS-WHT-001-XL-WHT'),
((SELECT id FROM products WHERE slug='slim-fit-jeans'), '30', 'Blue', '#1e3a8a', 30, 'JN-SLM-002-30-BLU'),
((SELECT id FROM products WHERE slug='slim-fit-jeans'), '32', 'Blue', '#1e3a8a', 45, 'JN-SLM-002-32-BLU'),
((SELECT id FROM products WHERE slug='slim-fit-jeans'), '34', 'Blue', '#1e3a8a', 35, 'JN-SLM-002-34-BLU'),
((SELECT id FROM products WHERE slug='summer-dress'), 'S', 'Floral', '#ec4899', 25, 'DR-SUM-003-S-FLR'),
((SELECT id FROM products WHERE slug='summer-dress'), 'M', 'Floral', '#ec4899', 40, 'DR-SUM-003-M-FLR'),
((SELECT id FROM products WHERE slug='summer-dress'), 'L', 'Floral', '#ec4899', 30, 'DR-SUM-003-L-FLR'),
((SELECT id FROM products WHERE slug='casual-hoodie'), 'M', 'Gray', '#6b7280', 50, 'HD-CAS-004-M-GRY'),
((SELECT id FROM products WHERE slug='casual-hoodie'), 'L', 'Gray', '#6b7280', 50, 'HD-CAS-004-L-GRY'),
((SELECT id FROM products WHERE slug='casual-hoodie'), 'XL', 'Black', '#1f2937', 40, 'HD-CAS-004-XL-BLK'),
((SELECT id FROM products WHERE slug='running-sneakers'), '42', 'Red', '#dc2626', 20, 'SN-RUN-005-42-RED'),
((SELECT id FROM products WHERE slug='running-sneakers'), '43', 'Red', '#dc2626', 25, 'SN-RUN-005-43-RED'),
((SELECT id FROM products WHERE slug='running-sneakers'), '44', 'Blue', '#1e3a8a', 30, 'SN-RUN-005-44-BLU'),
((SELECT id FROM products WHERE slug='leather-handbag'), 'One Size', 'Brown', '#8b4513', 15, 'BG-LTH-006-OS-BRN'),
((SELECT id FROM products WHERE slug='leather-handbag'), 'One Size', 'Black', '#1f2937', 20, 'BG-LTH-006-OS-BLK'),
((SELECT id FROM products WHERE slug='kids-tshirt'), 'XS', 'Blue', '#1e3a8a', 40, 'TS-KID-007-XS-BLU'),
((SELECT id FROM products WHERE slug='kids-tshirt'), 'S', 'Red', '#dc2626', 35, 'TS-KID-007-S-RED'),
((SELECT id FROM products WHERE slug='formal-shirt'), 'M', 'White', '#FFFFFF', 30, 'SH-FRM-008-M-WHT'),
((SELECT id FROM products WHERE slug='formal-shirt'), 'L', 'White', '#FFFFFF', 30, 'SH-FRM-008-L-WHT'),
((SELECT id FROM products WHERE slug='formal-shirt'), 'XL', 'Blue', '#1e3a8a', 25, 'SH-FRM-008-XL-BLU'),
((SELECT id FROM products WHERE slug='yoga-leggings'), 'S', 'Black', '#1f2937', 40, 'LG-YGA-009-S-BLK'),
((SELECT id FROM products WHERE slug='yoga-leggings'), 'M', 'Black', '#1f2937', 50, 'LG-YGA-009-M-BLK'),
((SELECT id FROM products WHERE slug='yoga-leggings'), 'L', 'Purple', '#7c3aed', 35, 'LG-YGA-009-L-PRP'),
((SELECT id FROM products WHERE slug='winter-jacket'), 'M', 'Black', '#1f2937', 20, 'JK-WTR-010-M-BLK'),
((SELECT id FROM products WHERE slug='winter-jacket'), 'L', 'Black', '#1f2937', 25, 'JK-WTR-010-L-BLK'),
((SELECT id FROM products WHERE slug='winter-jacket'), 'XL', 'Navy', '#1e3a8a', 15, 'JK-WTR-010-XL-NVY'),
((SELECT id FROM products WHERE slug='sneakers-black'), '42', 'Black', '#1f2937', 30, 'SN-BLK-011-42-BLK'),
((SELECT id FROM products WHERE slug='sneakers-black'), '43', 'Black', '#1f2937', 30, 'SN-BLK-011-43-BLK'),
((SELECT id FROM products WHERE slug='sneakers-black'), '44', 'Black', '#1f2937', 25, 'SN-BLK-011-44-BLK'),
((SELECT id FROM products WHERE slug='sunglasses'), 'One Size', 'Black', '#1f2937', 60, 'SG-STY-012-OS-BLK')
ON CONFLICT DO NOTHING;

-- ============ PRODUCT IMAGES ============
INSERT INTO product_images (product_id, image_url, sort_order) VALUES
((SELECT id FROM products WHERE slug='classic-white-tshirt'), 'https://images.pexels.com/photos/2466756/pexels-photo-2466756.jpeg?auto=compress&cs=tinysrgb&w=800', 0),
((SELECT id FROM products WHERE slug='classic-white-tshirt'), 'https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=800', 1),
((SELECT id FROM products WHERE slug='slim-fit-jeans'), 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800', 0),
((SELECT id FROM products WHERE slug='slim-fit-jeans'), 'https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&w=800', 1),
((SELECT id FROM products WHERE slug='summer-dress'), 'https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=800', 0),
((SELECT id FROM products WHERE slug='summer-dress'), 'https://images.pexels.com/photos/2065200/pexels-photo-2065200.jpeg?auto=compress&cs=tinysrgb&w=800', 1),
((SELECT id FROM products WHERE slug='casual-hoodie'), 'https://images.pexels.com/photos/2466756/pexels-photo-2466756.jpeg?auto=compress&cs=tinysrgb&w=800', 0),
((SELECT id FROM products WHERE slug='casual-hoodie'), 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800', 1),
((SELECT id FROM products WHERE slug='running-sneakers'), 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800', 0),
((SELECT id FROM products WHERE slug='running-sneakers'), 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800', 1),
((SELECT id FROM products WHERE slug='leather-handbag'), 'https://images.pexels.com/photos/1152078/pexels-photo-1152078.jpeg?auto=compress&cs=tinysrgb&w=800', 0),
((SELECT id FROM products WHERE slug='leather-handbag'), 'https://images.pexels.com/photos/904350/pexels-photo-904350.jpeg?auto=compress&cs=tinysrgb&w=800', 1),
((SELECT id FROM products WHERE slug='kids-tshirt'), 'https://images.pexels.com/photos/8434631/pexels-photo-8434631.jpeg?auto=compress&cs=tinysrgb&w=800', 0),
((SELECT id FROM products WHERE slug='formal-shirt'), 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800', 0),
((SELECT id FROM products WHERE slug='yoga-leggings'), 'https://images.pexels.com/photos/4498293/pexels-photo-4498293.jpeg?auto=compress&cs=tinysrgb&w=800', 0),
((SELECT id FROM products WHERE slug='winter-jacket'), 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800', 0),
((SELECT id FROM products WHERE slug='sneakers-black'), 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800', 0),
((SELECT id FROM products WHERE slug='sunglasses'), 'https://images.pexels.com/photos/701877/pexels-photo-701877.jpeg?auto=compress&cs=tinysrgb&w=800', 0)
ON CONFLICT DO NOTHING;

-- ============ BANNERS ============
INSERT INTO banners (title, subtitle, image_url, cta_text, cta_link, placement, sort_order) VALUES
('Summer Collection 2026', 'Up to 50% off on all summer items', 'https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Shop Now', '/category/women', 'home_slider', 0),
('New Arrivals', 'Check out the latest trends', 'https://images.pexels.com/photos/1488463/pexels-photo-1488463.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Discover', '/category/new-arrivals', 'home_slider', 1),
('Mega Sale', 'Black Friday deals up to 70% off', 'https://images.pexels.com/photos/5650028/pexels-photo-5650028.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Grab Deals', '/category/sale', 'home_slider', 2),
('Free Shipping', 'On all orders over $50', 'https://images.pexels.com/photos/4498293/pexels-photo-4498293.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Learn More', '/coupons', 'home_secondary', 0),
('Welcome Offer', '10% off your first order with code WELCOME10', 'https://images.pexels.com/photos/1152078/pexels-photo-1152078.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Copy Code', '/coupons', 'home_secondary', 1)
ON CONFLICT DO NOTHING;

-- ============ COUPONS ============
INSERT INTO coupons (code, description, discount_type, discount_value, min_spend, max_uses, valid_until, is_active) VALUES
('WELCOME10', '10% off your first order', 'percentage', 10, 0, 1000, '2026-12-31 23:59:59+00', true),
('SUMMER20', '20% off summer collection', 'percentage', 20, 50, 500, '2026-09-30 23:59:59+00', true),
('FREESHIP', 'Free shipping on orders over $30', 'fixed', 5, 30, 2000, '2026-12-31 23:59:59+00', true)
ON CONFLICT (code) DO NOTHING;
