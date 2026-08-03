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
  Modal,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  Wallet,
  Shield,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Check,
  X,
  DollarSign,
  TrendingUp,
  Banknote,
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import type { Wallet as WalletType, WalletTransaction } from '@/lib/supabase';

const TX_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string; sign: string }
> = {
  credit: {
    label: 'Credit',
    icon: <ArrowDownCircle size={18} color={colors.success[600]} />,
    color: colors.success[600],
    bg: colors.success[50],
    sign: '+',
  },
  debit: {
    label: 'Debit',
    icon: <ArrowUpCircle size={18} color={colors.error[600]} />,
    color: colors.error[600],
    bg: colors.error[50],
    sign: '-',
  },
  pending_credit: {
    label: 'Pending Credit',
    icon: <Clock size={18} color={colors.warning[600]} />,
    color: colors.warning[600],
    bg: colors.warning[50],
    sign: '+',
  },
  pending_release: {
    label: 'Pending Release',
    icon: <Check size={18} color={colors.success[600]} />,
    color: colors.success[600],
    bg: colors.success[50],
    sign: '+',
  },
  withdrawal: {
    label: 'Withdrawal',
    icon: <Banknote size={18} color={colors.primary[600]} />,
    color: colors.primary[600],
    bg: colors.primary[50],
    sign: '-',
  },
  adjustment: {
    label: 'Adjustment',
    icon: <TrendingUp size={18} color={colors.neutral[600]} />,
    color: colors.neutral[600],
    bg: colors.neutral[100],
    sign: '',
  },
};

const TX_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: colors.warning[600], bg: colors.warning[50] },
  completed: { label: 'Completed', color: colors.success[600], bg: colors.success[50] },
  failed: { label: 'Failed', color: colors.error[600], bg: colors.error[50] },
  cancelled: { label: 'Cancelled', color: colors.neutral[500], bg: colors.neutral[100] },
};

const MIN_WITHDRAWAL = 20;

export default function PublisherWalletScreen() {
  const { user, isPublisher } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Withdrawal modal
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      // Release any matured pending earnings first
      try { await supabase.rpc('release_pending_earnings'); } catch {}

      const [walletRes, txRes] = await Promise.all([
        supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (walletRes.error) throw walletRes.error;
      if (txRes.error) throw txRes.error;

      setWallet((walletRes.data as WalletType) ?? null);
      setTransactions((txRes.data as WalletTransaction[]) ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load wallet');
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

  const openWithdraw = () => {
    setWithdrawAmount('');
    setPaymentInfo('');
    setWithdrawModal(true);
  };

  const handleWithdraw = async () => {
    if (!user) return;
    const amount = parseFloat(withdrawAmount);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (amount < MIN_WITHDRAWAL) {
      Alert.alert('Minimum Withdrawal', `Minimum withdrawal amount is $${MIN_WITHDRAWAL}.00.`);
      return;
    }
    if (wallet && amount > wallet.available_balance) {
      Alert.alert('Insufficient Balance', 'You do not have enough available balance.');
      return;
    }
    if (!paymentInfo.trim()) {
      Alert.alert('Payment Info Required', 'Please provide your payment information.');
      return;
    }

    setSubmitting(true);
    try {
      const invoiceNumber = `INV-${Date.now()}`;

      const { error: insertErr } = await supabase.from('withdrawal_requests').insert({
        user_id: user.id,
        amount,
        payment_info: paymentInfo.trim(),
        status: 'pending',
        invoice_number: invoiceNumber,
      });

      if (insertErr) throw insertErr;

      Alert.alert(
        'Withdrawal Requested',
        `Your withdrawal of ${fmtMoney(amount)} has been submitted.\nInvoice: ${invoiceNumber}`,
        [{ text: 'OK', onPress: () => setWithdrawModal(false) }]
      );
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const cfg = TX_TYPE_CONFIG[item.type] ?? TX_TYPE_CONFIG.adjustment;
    const statusCfg = TX_STATUS_CONFIG[item.status] ?? TX_STATUS_CONFIG.completed;
    return (
      <View style={styles.txCard}>
        <View style={[styles.txIcon, { backgroundColor: cfg.bg }]}>{cfg.icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.txType}>{cfg.label}</Text>
          {item.description ? (
            <Text style={styles.txDesc} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.txMetaRow}>
            <Text style={styles.txDate}>{fmtDate(item.created_at)}</Text>
            <View style={[styles.txStatusBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.txStatusText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          </View>
        </View>
        <Text style={[styles.txAmount, { color: cfg.color }]}>
          {cfg.sign}{fmtMoney(item.amount)}
        </Text>
      </View>
    );
  };

  // ── Access guard ──────────────────────────────────────────────
  if (!user || !isPublisher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Wallet</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.accessGuard}>
          <Shield size={64} color={colors.neutral[300]} />
          <Text style={styles.accessTitle}>Publisher Access Required</Text>
          <Text style={styles.accessMsg}>
            You need publisher privileges to access the wallet.
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
          <Text style={styles.title}>Wallet</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Loading wallet…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────
  if (error && !wallet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Wallet</Text>
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

  const available = wallet?.available_balance ?? 0;
  const pending = wallet?.pending_balance ?? 0;
  const totalEarned = wallet?.total_earned ?? 0;
  const totalWithdrawn = wallet?.total_withdrawn ?? 0;
  const canWithdraw = available >= MIN_WITHDRAWAL;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {/* Balance hero card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <View style={styles.balanceIconWrap}>
                  <Wallet size={22} color={colors.white} />
                </View>
                <Text style={styles.balanceTitle}>Available Balance</Text>
              </View>
              <Text style={styles.balanceTotal}>{fmtMoney(available)}</Text>
              <View style={styles.balanceSubRow}>
                <View style={styles.balanceSubItem}>
                  <View style={[styles.balanceDot, { backgroundColor: colors.warning[500] }]} />
                  <Text style={styles.balanceSubLabel}>Pending</Text>
                  <Text style={styles.balanceSubValue}>{fmtMoney(pending)}</Text>
                </View>
                <View style={styles.balanceSubDivider} />
                <View style={styles.balanceSubItem}>
                  <View style={[styles.balanceDot, { backgroundColor: colors.success[500] }]} />
                  <Text style={styles.balanceSubLabel}>Total</Text>
                  <Text style={styles.balanceSubValue}>{fmtMoney(available + pending)}</Text>
                </View>
              </View>
              <View style={{ marginTop: spacing.md }}>
                <Button
                  title="Request Withdrawal"
                  onPress={openWithdraw}
                  disabled={!canWithdraw}
                  fullWidth
                />
                {!canWithdraw ? (
                  <Text style={styles.withdrawNote}>
                    Minimum $20.00 available balance required to withdraw.
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: colors.success[100] }]}>
                  <TrendingUp size={18} color={colors.success[700]} />
                </View>
                <Text style={styles.statValue}>{fmtMoney(totalEarned)}</Text>
                <Text style={styles.statLabel}>Total Earned</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: colors.primary[100] }]}>
                  <Banknote size={18} color={colors.primary[700]} />
                </View>
                <Text style={styles.statValue}>{fmtMoney(totalWithdrawn)}</Text>
                <Text style={styles.statLabel}>Total Withdrawn</Text>
              </View>
            </View>

            {/* Transactions header */}
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Wallet size={56} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyMsg}>
              Your affiliate earnings and withdrawals will appear here.
            </Text>
          </View>
        }
      />

      {/* ── Withdraw Modal ────────────────────────────────────────── */}
      <Modal
        visible={withdrawModal}
        transparent
        animationType="fade"
        onRequestClose={() => !submitting && setWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Withdrawal</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => !submitting && setWithdrawModal(false)}
              >
                <X size={20} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Available balance display */}
              <View style={styles.availableBox}>
                <Text style={styles.availableLabel}>Available Balance</Text>
                <Text style={styles.availableValue}>{fmtMoney(available)}</Text>
              </View>

              {/* Amount */}
              <Text style={styles.fieldLabel}>Amount ($) *</Text>
              <TextInput
                style={styles.input}
                placeholder={`Minimum $${MIN_WITHDRAWAL}.00`}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="decimal-pad"
                editable={!submitting}
              />
              <Text style={styles.fieldHint}>
                Minimum withdrawal: ${MIN_WITHDRAWAL}.00
              </Text>

              {/* Payment Info */}
              <Text style={styles.fieldLabel}>Payment Information *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter your bank details, PayPal, or other payment info…"
                value={paymentInfo}
                onChangeText={setPaymentInfo}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!submitting}
              />

              {/* Warning */}
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  Your withdrawal will be reviewed by our admin team. Funds will be deducted from
                  your available balance once approved and paid.
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Cancel"
                    onPress={() => setWithdrawModal(false)}
                    variant="outline"
                    disabled={submitting}
                    fullWidth
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Submit Request"
                    onPress={handleWithdraw}
                    loading={submitting}
                    fullWidth
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error[100],
  },
  errorBannerText: {
    ...typography.bodySmall,
    color: colors.error[700],
  },
  // Balance card
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  balanceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  balanceTotal: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  balanceSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  balanceSubItem: { flex: 1, gap: 4 },
  balanceSubDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  balanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  balanceSubLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  balanceSubValue: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  withdrawNote: {
    ...typography.caption,
    color: colors.warning[600],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Section
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
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
  // Transaction card
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txType: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  txDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  txDate: {
    ...typography.caption,
    color: colors.neutral[400],
  },
  txStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  txStatusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  txAmount: {
    ...typography.h4,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
  },
  // Available box
  availableBox: {
    backgroundColor: colors.primary[50],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  availableLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary[700],
    textTransform: 'uppercase',
  },
  availableValue: {
    ...typography.h2,
    color: colors.primary[700],
    fontWeight: '700',
    marginTop: 4,
  },
  // Form fields
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  fieldHint: {
    ...typography.caption,
    color: colors.neutral[400],
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Warning
  warningBox: {
    backgroundColor: colors.warning[50],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning[100],
  },
  warningText: {
    ...typography.caption,
    color: colors.warning[600],
  },
  // Modal actions
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
