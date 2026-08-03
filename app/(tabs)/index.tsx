import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Search, Bell, Menu, Heart, ChevronRight, TrendingUp, Sparkles, Tag } from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { ProductCard } from '@/components/ProductCard';
import { LoadingState } from '@/components/LoadingState';
import type { Product, Category, Banner } from '@/lib/supabase';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = 200;

export default function HomeScreen() {
  const { profile } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);

  const loadData = useCallback(async () => {
    const [bannersRes, categoriesRes, featuredRes, newRes, bestRes] = await Promise.all([
      supabase.from('banners').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('products')
        .select(`*, images:product_images(*)`)
        .eq('status', 'active')
        .eq('is_featured', true)
        .limit(6),
      supabase.from('products')
        .select(`*, images:product_images(*)`)
        .eq('status', 'active')
        .eq('is_new', true)
        .limit(6),
      supabase.from('products')
        .select(`*, images:product_images(*)`)
        .eq('status', 'active')
        .order('rating', { ascending: false })
        .limit(6),
    ]);

    setBanners((bannersRes.data as Banner[]) ?? []);
    setCategories((categoriesRes.data as Category[]) ?? []);
    setFeatured((featuredRes.data as Product[]) ?? []);
    setNewArrivals((newRes.data as Product[]) ?? []);
    setBestSellers((bestRes.data as Product[]) ?? []);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) return <LoadingState />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Header />
        <BannerSlider banners={banners} activeIndex={activeBanner} onChange={setActiveBanner} />
        <QuickCategories categories={categories} />
        <FeaturedSection
          title="Featured Products"
          icon={<Sparkles size={20} color={colors.primary[600]} />}
          products={featured}
        />
        <SecondaryBanner banner={banners.find(b => b.placement === 'home_secondary')} />
        <FeaturedSection
          title="New Arrivals"
          icon={<TrendingUp size={20} color={colors.success[600]} />}
          products={newArrivals}
        />
        <FeaturedSection
          title="Best Sellers"
          icon={<Tag size={20} color={colors.accent[600]} />}
          products={bestSellers}
        />
        <View style={{ height: spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Welcome</Text>
        <Text style={styles.brandName}>STYLE</Text>
      </View>
      <View style={styles.headerIcons}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/search')}>
          <Search size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/notifications')}>
          <Bell size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/menu')}>
          <Menu size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BannerSlider({ banners, activeIndex, onChange }: { banners: Banner[]; activeIndex: number; onChange: (i: number) => void }) {
  if (banners.length === 0) return null;
  return (
    <View style={styles.bannerContainer}>
      <FlatList
        data={banners.filter(b => b.placement === 'home_slider')}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          onChange(idx);
        }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.banner}>
            <Image source={{ uri: item.image_url }} style={styles.bannerImage} resizeMode="cover" />
            <View style={styles.bannerOverlay} />
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>{item.title}</Text>
              {item.subtitle ? <Text style={styles.bannerSubtitle}>{item.subtitle}</Text> : null}
              {item.cta_text ? (
                <TouchableOpacity
                  style={styles.bannerCta}
                  onPress={() => {
                    if (item.cta_link) {
                      const link = item.cta_link;
                      if (link.startsWith('/category/')) {
                        const slug = link.replace('/category/', '');
                        router.push(`/category/${slug}`);
                      } else if (link === '/coupons') {
                        router.push('/coupons');
                      }
                    }
                  }}
                >
                  <Text style={styles.bannerCtaText}>{item.cta_text}</Text>
                  <ChevronRight size={16} color={colors.white} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      />
      <View style={styles.dots}>
        {banners.filter(b => b.placement === 'home_slider').map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

function QuickCategories({ categories }: { categories: Category[] }) {
  const display = categories.slice(0, 8);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.categoryGrid}>
        {display.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.categoryCard}
            onPress={() => router.push(`/category/${cat.slug}`)}
            activeOpacity={0.85}
          >
            <View style={styles.categoryImageWrap}>
              {cat.image_url ? (
                <Image source={{ uri: cat.image_url }} style={styles.categoryImage} resizeMode="cover" />
              ) : (
                <View style={[styles.categoryImage, { backgroundColor: colors.neutral[200] }]} />
              )}
            </View>
            <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function FeaturedSection({ title, icon, products }: { title: string; icon: React.ReactNode; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          {icon}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
        contentContainerStyle={{ paddingHorizontal: spacing.md }}
        renderItem={({ item }) => (
          <View style={{ width: 160 }}>
            <ProductCard product={item} onPress={() => router.push(`/product/${item.slug}`)} />
          </View>
        )}
      />
    </View>
  );
}

function SecondaryBanner({ banner }: { banner?: Banner }) {
  if (!banner) return null;
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.secondaryBanner}
        activeOpacity={0.9}
        onPress={() => router.push('/coupons')}
      >
        <Image source={{ uri: banner.image_url }} style={styles.secondaryBannerImage} resizeMode="cover" />
        <View style={styles.secondaryBannerOverlay} />
        <View style={styles.secondaryBannerContent}>
          <Text style={styles.secondaryBannerTitle}>{banner.title}</Text>
          {banner.subtitle ? <Text style={styles.secondaryBannerSubtitle}>{banner.subtitle}</Text> : null}
          {banner.cta_text ? (
            <View style={styles.secondaryBannerCta}>
              <Text style={styles.secondaryBannerCtaText}>{banner.cta_text}</Text>
              <ChevronRight size={16} color={colors.white} />
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
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
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  greeting: {
    ...typography.caption,
    color: colors.textMuted,
  },
  brandName: {
    ...typography.h3,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 3,
  },
  headerIcons: {
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
  bannerContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  banner: {
    width: width - spacing.md * 2,
    height: BANNER_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bannerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  bannerTitle: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  bannerSubtitle: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
  },
  bannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  bannerCtaText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    fontWeight: '700',
    color: colors.text,
  },
  seeAll: {
    ...typography.bodySmall,
    color: colors.primary[600],
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  categoryCard: {
    width: (width - spacing.md * 2 - spacing.md * 3) / 4,
    alignItems: 'center',
  },
  categoryImageWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    ...shadows.sm,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryName: {
    ...typography.caption,
    color: colors.text,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  secondaryBanner: {
    marginHorizontal: spacing.md,
    height: 140,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  secondaryBannerImage: {
    width: '100%',
    height: '100%',
  },
  secondaryBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  secondaryBannerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    gap: 4,
  },
  secondaryBannerTitle: {
    ...typography.h4,
    color: colors.white,
    fontWeight: '700',
  },
  secondaryBannerSubtitle: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
  },
  secondaryBannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  secondaryBannerCtaText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
});
