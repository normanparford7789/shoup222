import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  ShoppingBag,
  Shield,
  Package,
  User,
  Calendar,
  DollarSign,
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import type { Order, Product, OrderItem } from '@/lib/supabase';

type OrderItemWithRelations = OrderItem & {
  created_at?: string;
  merchant_earnings?: number | null;
  affiliate_earnings?: number | null;
  hold_until?: string | null;
  merchant_id?: string | null;
  order: Order | null;
  product: Product | null;
};

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: colors.warning[600], bg: colors.warning[50] },
  processing: { label: 'Processing', color: colors.primary[600], bg: colors.primary[50] },
  shipped: { label: 'Shipped', color: colors.accent[600], bg: colors.accent[50] },
  delivered: { label: 'Delivered', color: colors.success[600], bg: colors.success[50] },
  cancelled: { label: 'Cancelled', color: colors.error[600], bg: colors.error[50] },
  refunded: { label: 'Refunded', color: colors.neutral[500], bg: colors.neutral[100] },
};

export default function MerchantOrdersScreen() {
  const { user, isMerchant } = useAuth();
  const [orderItems, setOrderItems] = useState<OrderItemWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('order_items')
        .select('*, order:orders(*), product:products(*)')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setOrderItems((data as unknown as OrderItemWithRelations[]) ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load orders');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const fmtMoney = (n: number) =>
    `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const renderItem = ({ item }: { item: OrderItemWithRelations }) => {
    const order = item.order;
    const statusCfg = order
      ? ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.pending
      : ORDER_STATUS_CONFIG.pending;
    const earnings = item.merchant_earnings ?? 0;
    const isPending = item.hold_until && new Date(item.hold_until) > new Date();

    return (
      <View style={styles.orderCard}>
        {/* Order header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderNumWrap}>
            <Text style={styles.orderNumber}>
              {order?.order_number ?? 'N/A'}
            </Text>
            <View style={styles.orderDateRow}>
              <Calendar size={11} color={colors.neutral[400]} />
              <Text style={styles.orderDate}>{fmtDate(item.created_at ?? item.order?.created_at ?? new Date().toISOString())}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* Product info */}
        <View style={styles.productSection}>
          <View style={styles.productThumb}>
            <Package size={20} color={colors.neutral[400]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.product_name}
            </Text>
            <Text style={styles.productQty}>
              Qty: {item.quantity} × {fmtMoney(item.unit_price)}
            </Text>
            {item.size || item.color ? (
              <Text style={styles.productVariant}>
                {[item.size, item.color].filter(Boolean).join(' • ')}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Customer info */}
        {order ? (
          <View style={styles.customerBox}>
            <View style={styles.customerRow}>
              <User size={12} color={colors.neutral[500]} />
              <Text style={styles.customerLabel}>Customer</Text>
            </View>
            <Text style={styles.customerValue} numberOfLines={1}>
              Order #{order.order_number}
            </Text>
            <Text style={styles.customerSub}>
              Payment: {order.payment_status ?? 'N/A'}
            </Text>
          </View>
        ) : null}

        {/* Earnings */}
        <View style={styles.earningsBox}>
          <View style={styles.earningsLeft}>
            <View style={styles.earningsIcon}>
              <DollarSign size={14} color={colors.white} />
            </View>
            <View>
              <Text style={styles.earningsLabel}>Your Earnings (75%)</Text>
              {isPending ? (
                <Text style={styles.earningsPending}>Pending release</Text>
              ) : (
                <Text style={styles.earningsReleased}>Released</Text>
              )}
            </View>
          </View>
          <Text style={styles.earningsValue}>{fmtMoney(earnings)}</Text>
        </View>
      </View>
    );
  };

  // ── Access guard ──────────────────────────────────────────────
  if (!user || !isMerchant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Orders</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.accessGuard}>
          <Shield size={64} color={colors.neutral[300]} />
          <Text style={styles.accessTitle}>Merchant Access Required</Text>
          <Text style={styles.accessMsg}>
            You need merchant privileges to view orders.
          </Text>
          <View style={{ marginTop: spacing.lg, width: '100%' }}>
            <Button title="Back to Home" onPress={() => router.replace('/(tabs)/index')} fullWidth />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Orders</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────
  if (error && orderItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Orders</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <View style={{ marginTop: spacing.lg }}>
            <Button title="Retry" onPress={load} variant="outline" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Summary stats
  const totalEarnings = orderItems.reduce((sum, i) => sum + (i.merchant_earnings ?? 0), 0);
  const pendingEarnings = orderItems
    .filter((i) => i.hold_until && new Date(i.hold_until) > new Date())
    .reduce((sum, i) => sum + (i.merchant_earnings ?? 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={orderItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          orderItems.length > 0 ? (
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{fmtMoney(totalEarnings)}</Text>
                <Text style={styles.summaryLabel}>Total Earnings</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{fmtMoney(pendingEarnings)}</Text>
                <Text style={styles.summaryLabel}>Pending Release</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ShoppingBag size={56} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyMsg}>
              Orders containing your products will appear here.
            </Text>
          </View>
        }
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
  iconBtn: {
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
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  // Access guard
  accessGuard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  accessTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  accessMsg: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  errorEmoji: { fontSize: 48 },
  errorTitle: {
    ...typography.h3,
    color: colors.text,
  },
  errorMsg: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: colors.error[50],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    margin: spacing.md,
    borderWidth: 1,
    borderColor: colors.error[100],
  },
  errorBannerText: {
    ...typography.bodySmall,
    color: colors.error[700],
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
  },
  emptyMsg: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  summaryValue: {
    ...typography.h3,
    color: colors.primary[700],
    fontWeight: '700',
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Order card
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  orderNumWrap: { flex: 1 },
  orderNumber: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  orderDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  orderDate: {
    ...typography.caption,
    color: colors.neutral[400],
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  // Product section
  productSection: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  productThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  productQty: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  productVariant: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  // Customer box
  customerBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  customerLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  customerValue: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  customerSub: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  // Earnings
  earningsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary[600],
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  earningsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  earningsIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsLabel: {
    ...typography.caption,
    color: colors.primary[100],
    fontWeight: '600',
  },
  earningsPending: {
    ...typography.caption,
    color: colors.warning[500],
    fontWeight: '500',
  },
  earningsReleased: {
    ...typography.caption,
    color: colors.success[500],
    fontWeight: '500',
  },
  earningsValue: {
    ...typography.h4,
    color: colors.white,
    fontWeight: '700',
  },
});
