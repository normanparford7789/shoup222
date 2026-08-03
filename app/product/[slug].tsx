import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Heart,
  Share2,
  ShoppingBag,
  Star,
  Truck,
  RefreshCw,
  Shield,
  Ruler,
  ChevronRight,
  Link2,
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { ProductCard } from '@/components/ProductCard';
import type { Product, ProductVariant, Review, AffiliateLink } from '@/lib/supabase';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user, profile, isPublisher } = useAuth();
  const { addToCart } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [affiliateLink, setAffiliateLink] = useState<AffiliateLink | null>(null);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    const { data: prod } = await supabase
      .from('products')
      .select(`*, category:categories(*)`)
      .eq('slug', slug)
      .maybeSingle();
    if (!prod) return;
    const p = prod as Product;

    const [imgsRes, variantsRes, reviewsRes, relatedRes] = await Promise.all([
      supabase.from('product_images').select('*').eq('product_id', p.id).order('sort_order'),
      supabase.from('product_variants').select('*').eq('product_id', p.id),
      supabase.from('reviews').select('*').eq('product_id', p.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(5),
      p.category_id
        ? supabase.from('products')
            .select(`*, images:product_images(*)`)
            .eq('status', 'active')
            .eq('category_id', p.category_id)
            .neq('id', p.id)
            .limit(4)
        : Promise.resolve({ data: [] }),
    ]);

    const images = imgsRes.data ?? [];
    const fullProduct = { ...p, images: images as any };
    setProduct(fullProduct);
    setVariants((variantsRes.data as ProductVariant[]) ?? []);
    setReviews((reviewsRes.data as Review[]) ?? []);
    setRelated((relatedRes.data as Product[]) ?? []);

    // Load affiliate link for publishers
    if (user && profile?.role === 'publisher') {
      const { data: affData } = await supabase
        .from('affiliate_links')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', p.id)
        .maybeSingle();
      setAffiliateLink(affData as AffiliateLink | null);
    }

    const sizes = Array.from(new Set((variantsRes.data as ProductVariant[])?.map(v => v.size) ?? []));
    const colorOpts = Array.from(new Set((variantsRes.data as ProductVariant[])?.map(v => v.color) ?? []));
    if (sizes.length === 1) setSelectedSize(sizes[0]);
    if (colorOpts.length === 1) setSelectedColor(colorOpts[0]);
  }, [slug]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to add items to your cart.');
      return;
    }
    if (!selectedSize && variants.some(v => v.size)) {
      Alert.alert('Select size', 'Please select a size first.');
      return;
    }
    if (!selectedColor && variants.some(v => v.color)) {
      Alert.alert('Select color', 'Please select a color first.');
      return;
    }
    setAdding(true);
    try {
      await addToCart(product, selectedSize ?? 'One Size', selectedColor ?? 'Default', 1);
      Alert.alert('Success', 'Added to cart!', [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => router.push('/(tabs)/cart') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to add to cart');
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to continue.');
      return;
    }
    if (!selectedSize && variants.some(v => v.size)) {
      Alert.alert('Select size', 'Please select a size first.');
      return;
    }
    if (!selectedColor && variants.some(v => v.color)) {
      Alert.alert('Select color', 'Please select a color first.');
      return;
    }
    setAdding(true);
    try {
      await addToCart(product, selectedSize ?? 'One Size', selectedColor ?? 'Default', 1);
      router.push('/checkout');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to process');
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.notFound}>Product not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sizes = Array.from(new Set(variants.map(v => v.size)));
  const colorOptions = Array.from(new Set(variants.map(v => v.color)));
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const wished = isWishlisted(product.id);
  const images = product.images ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => toggle(product.id).catch(() => {})}
          >
            <Heart
              size={22}
              color={wished ? colors.error[500] : colors.text}
              fill={wished ? colors.error[500] : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Share2 size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <FlatList
          data={images.length > 0 ? images : [{ id: 'placeholder', image_url: '', product_id: '', sort_order: 0 }]}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, i) => item.id ?? `img-${i}`}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveImage(idx);
          }}
          renderItem={({ item }) => (
            <View style={styles.imageWrap}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.image, { backgroundColor: colors.neutral[200] }]} />
              )}
            </View>
          )}
        />
        {images.length > 1 ? (
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
            ))}
          </View>
        ) : null}
        <View style={styles.content}>
          <Text style={styles.brand}>{product.brand ?? ''}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  size={16}
                  color={i <= Math.round(product.rating) ? colors.accent[500] : colors.neutral[300]}
                  fill={i <= Math.round(product.rating) ? colors.accent[500] : 'transparent'}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({product.review_count} reviews)</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${product.price.toFixed(2)}</Text>
            {hasDiscount ? (
              <>
                <Text style={styles.oldPrice}>${product.compare_at_price!.toFixed(2)}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>
                    {Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)}% OFF
                  </Text>
                </View>
              </>
            ) : null}
          </View>
          {colorOptions.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Color: <Text style={styles.sectionValue}>{selectedColor ?? 'Select'}</Text></Text>
              <View style={styles.optionsRow}>
                {colorOptions.map(c => {
                  const v = variants.find(v => v.color === c);
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorOption,
                        selectedColor === c && styles.colorOptionActive,
                      ]}
                      onPress={() => setSelectedColor(c)}
                    >
                      <View
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: v?.color_hex ?? colors.neutral[400] },
                        ]}
                      />
                      <Text style={styles.colorLabel}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
          {sizes.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sizeHeader}>
                <Text style={styles.sectionLabel}>Size: <Text style={styles.sectionValue}>{selectedSize ?? 'Select'}</Text></Text>
                <TouchableOpacity
                  style={styles.sizeGuideBtn}
                  onPress={() => router.push('/size-guide')}
                >
                  <Ruler size={14} color={colors.primary[600]} />
                  <Text style={styles.sizeGuideText}>Size Guide</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.optionsRow}>
                {sizes.map(s => {
                  const inStock = variants.some(v => v.size === s && v.stock > 0);
                  return (
                    <TouchableOpacity
                      key={s}
                      disabled={!inStock}
                      style={[
                        styles.sizeOption,
                        selectedSize === s && styles.sizeOptionActive,
                        !inStock && styles.sizeOptionDisabled,
                      ]}
                      onPress={() => setSelectedSize(s)}
                    >
                      <Text
                        style={[
                          styles.sizeText,
                          selectedSize === s && styles.sizeTextActive,
                          !inStock && styles.sizeTextDisabled,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
          <View style={styles.featuresRow}>
            <View style={styles.feature}>
              <Truck size={20} color={colors.primary[600]} />
              <Text style={styles.featureText}>Free shipping{'\n'}over $50</Text>
            </View>
            <View style={styles.feature}>
              <RefreshCw size={20} color={colors.primary[600]} />
              <Text style={styles.featureText}>30-day{'\n'}returns</Text>
            </View>
            <View style={styles.feature}>
              <Shield size={20} color={colors.primary[600]} />
              <Text style={styles.featureText}>Secure{'\n'}payment</Text>
            </View>
          </View>
          {product.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}
          {product.material ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Material</Text>
              <Text style={styles.description}>{product.material}</Text>
            </View>
          ) : null}
          {reviews.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Reviews ({product.review_count})</Text>
                <TouchableOpacity onPress={() => router.push(`/product/${product.slug}/reviews`)}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>
              {reviews.map(r => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          size={12}
                          color={i <= r.rating ? colors.accent[500] : colors.neutral[300]}
                          fill={i <= r.rating ? colors.accent[500] : 'transparent'}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {r.title ? <Text style={styles.reviewTitle}>{r.title}</Text> : null}
                  {r.body ? <Text style={styles.reviewBody}>{r.body}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}
          {isPublisher && product && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Affiliate Program</Text>
              <View style={styles.affiliateCard}>
                <View style={styles.affiliateHeader}>
                  <View style={styles.affiliateIcon}>
                    <Link2 size={20} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.affiliateTitle}>Earn 10% Commission</Text>
                    <Text style={styles.affiliateDesc}>Share your link and earn from every sale</Text>
                  </View>
                </View>
                {affiliateLink ? (
                  <View>
                    <Text style={styles.affiliateUrlLabel}>Your Affiliate Link</Text>
                    <Text style={styles.affiliateUrl} selectable>
                      {process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/affiliate-redirect?code={affiliateLink.affiliate_code}
                    </Text>
                    <View style={styles.affiliateStats}>
                      <View style={styles.affiliateStat}>
                        <Text style={styles.affiliateStatValue}>{affiliateLink.clicks_count}</Text>
                        <Text style={styles.affiliateStatLabel}>Clicks</Text>
                      </View>
                      <View style={styles.affiliateStat}>
                        <Text style={styles.affiliateStatValue}>{affiliateLink.purchases_count}</Text>
                        <Text style={styles.affiliateStatLabel}>Sales</Text>
                      </View>
                      <View style={styles.affiliateStat}>
                        <Text style={styles.affiliateStatValue}>${affiliateLink.total_earnings.toFixed(2)}</Text>
                        <Text style={styles.affiliateStatLabel}>Earned</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Button
                    title="Generate Affiliate Link"
                    onPress={async () => {
                      if (!user) return;
                      const code = `AFF-${user.id.slice(0, 8)}-${Date.now().toString(36)}`;
                      const { data, error } = await supabase
                        .from('affiliate_links')
                        .insert({
                          user_id: user.id,
                          product_id: product.id,
                          affiliate_code: code,
                        })
                        .select()
                        .single();
                      if (!error && data) {
                        setAffiliateLink(data as AffiliateLink);
                      }
                    }}
                    size="sm"
                    fullWidth
                  />
                )}
              </View>
            </View>
          )}

          {related.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>You May Also Like</Text>
              <View style={styles.relatedGrid}>
                {related.map(p => (
                  <View key={p.id} style={styles.relatedItem}>
                    <ProductCard product={p} onPress={() => router.push(`/product/${p.slug}`)} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <Button
          title="Add to Cart"
          onPress={handleAddToCart}
          variant="outline"
          loading={adding}
          style={{ flex: 1 }}
        />
        <Button
          title="Buy Now"
          onPress={handleBuyNow}
          loading={adding}
          style={{ flex: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    width,
    height: width,
    backgroundColor: colors.neutral[100],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[300],
  },
  dotActive: {
    backgroundColor: colors.primary[600],
    width: 24,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  brand: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: {
    ...typography.h2,
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  reviewCount: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  oldPrice: {
    ...typography.body,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.error[500],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  discountText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionValue: {
    color: colors.text,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: {
    ...typography.bodySmall,
    color: colors.primary[600],
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorOption: {
    alignItems: 'center',
    gap: 4,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorOptionActive: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorLabel: {
    ...typography.caption,
    color: colors.text,
  },
  sizeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sizeGuideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sizeGuideText: {
    ...typography.caption,
    color: colors.primary[600],
    fontWeight: '600',
  },
  sizeOption: {
    minWidth: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sizeOptionActive: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[600],
  },
  sizeOptionDisabled: {
    opacity: 0.4,
  },
  sizeText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  sizeTextActive: {
    color: colors.white,
  },
  sizeTextDisabled: {
    textDecorationLine: 'line-through',
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  feature: {
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  reviewTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  reviewBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  relatedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  relatedItem: {
    width: '48%',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notFound: {
    ...typography.h4,
    color: colors.text,
  },
  affiliateCard: {
    backgroundColor: colors.primary[50],
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  affiliateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  affiliateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  affiliateTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primary[700],
  },
  affiliateDesc: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  affiliateUrlLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  affiliateUrl: {
    ...typography.caption,
    color: colors.primary[600],
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  affiliateStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  affiliateStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  affiliateStatValue: {
    ...typography.h4,
    color: colors.primary[700],
    fontWeight: '700',
  },
  affiliateStatLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
