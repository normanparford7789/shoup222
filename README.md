# Style - Clothing E-Commerce App

A professional clothing e-commerce mobile app built with Expo (React Native) and Supabase.

## Features

### Customer App
- **Authentication**: Email/password sign-up and login
- **Home**: Banner slider, categories, featured products, new arrivals, best sellers
- **Browse & Search**: Category browsing, product search with recent searches
- **Product Details**: Multiple images, size/color selection, reviews, related products
- **Cart**: Add/remove items, quantity control, coupon application
- **Checkout**: Address selection, shipping methods, payment options, order placement
- **Orders**: Order history, order tracking with status timeline
- **Wishlist**: Save favorite products
- **Addresses**: Add, edit, delete shipping addresses
- **Coupons**: View and copy available discount codes
- **Returns**: Request returns/exchanges with reason selection
- **Reviews**: View and submit product reviews with ratings
- **Notifications**: Order updates and promotional notifications
- **Support**: Contact form, FAQ, help center
- **Size Guide**: Measurement charts for tops, bottoms, shoes
- **Profile**: Edit personal information

## Tech Stack

- **Frontend**: Expo (React Native), TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Icons**: Lucide React Native
- **Images**: Pexels stock photos

## Setup

### Prerequisites
- Node.js 20+
- npm or yarn
- Expo CLI

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the App

```bash
npm start
```

This starts the Expo dev server. Scan the QR code with the Expo Go app or press `w` for web.

### Building the APK

The GitHub Actions workflow (`.github/workflows/build-apk.yml`) automatically builds an Android APK on push to main/master.

For local builds:
```bash
npm install -g eas-cli
eas build --platform android --profile production
```

## Database Schema

The app uses Supabase with the following tables:
- `profiles` - user profile extensions
- `categories` - product categories
- `products` - product catalog
- `product_variants` - size/color combinations with stock
- `product_images` - product images
- `cart_items` - shopping cart
- `wishlist_items` - saved products
- `orders` - order headers
- `order_items` - order line items
- `addresses` - shipping addresses
- `reviews` - product reviews
- `coupons` - discount codes
- `banners` - home screen banners
- `notifications` - user notifications
- `return_requests` - return/exchange requests
- `support_tickets` - customer support tickets

All tables have Row Level Security (RLS) enabled with appropriate policies.

## GitHub Secrets for APK Build

Set these secrets in your GitHub repository settings:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `EXPO_TOKEN` - Your Expo access token (from https://expo.dev/accounts/[account]/settings/access-tokens)

## License

MIT
