import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, SlidersHorizontal, ArrowUpDown } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { ProductCard } from '@/components/ProductCard';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import type { Product, Category } from '@/lib/supabase';

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'rating';

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    const { data: cat } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    setCategory(cat as Category | null);

    let query = supabase
      .from('products')
      .select(`*, images:product_images(*)`)
      .eq('status', 'active')
      .eq('category_id', cat?.id);

    switch (sortBy) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data } = await query.limit(50);
    setProducts((data as Product[]) ?? []);
  }, [slug, sortBy]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) return <LoadingState />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{category?.name ?? 'Category'}</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <ArrowUpDown size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
      {showSortMenu ? (
        <View style={styles.sortMenu}>
          {([
            { key: 'newest', label: 'Newest' },
            { key: 'price_asc', label: 'Price: Low to High' },
            { key: 'price_desc', label: 'Price: High to Low' },
            { key: 'rating', label: 'Top Rated' },
          ] as { key: SortOption; label: string }[]).map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortItem, sortBy === opt.key && styles.sortItemActive]}
              onPress={() => { setSortBy(opt.key); setShowSortMenu(false); }}
            >
              <Text
                style={[
                  styles.sortItemText,
                  sortBy === opt.key && styles.sortItemTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        columnWrapperStyle={{ gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={<SlidersHorizontal size={48} color={colors.neutral[300]} />}
            title="No products found"
            message="Check back later for new items in this category"
          />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => router.push(`/product/${item.slug}`)}
          />
        )}
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  sortMenu: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortItem: {
    paddingVertical: spacing.sm,
  },
  sortItemActive: {},
  sortItemText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  sortItemTextActive: {
    color: colors.primary[600],
    fontWeight: '600',
  },
});
