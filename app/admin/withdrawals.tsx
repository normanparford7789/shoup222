import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Wallet,
  Shield,
  Check,
  X,
  Banknote,
  Clock,
  Search,
  X as XIcon,
  Smartphone,
  Building2,
  Users,
  DollarSign,
  CheckCircle2,
  CreditCard,
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { ArabicText as Text, ArabicTextInput as TextInputArabic } from '@/components/ArabicText';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';

const ADMIN_API_BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-api`;

type PaymentMethod = 'sham_cash' | 'syriatel_cash' | 'bank';

const METHOD_LABELS: Record<string, string> = {
  sham_cash: 'شام كاش',
  syriatel_cash: 'سيريتيل كاش',
  bank: 'تحويل بنكي',
};

type EligiblePublisher = {
  user_id: string;
  full_name: string | null;
  available_balance: number;
  min_threshold: number;
  payment_method: PaymentMethod;
  account_details: Record<string, string>;
};

type RecentPayment = {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  invoice_number: string | null;
  created_at: string;
  profile?: { full_name: string | null } | null;
};

function PaymentDetails({ method, details }: { method: string; details: Record<string, string> }) {
  const isBank = method === 'bank';
  return (
    <View style={payStyles.container}>
      <View style={payStyles.methodRow}>
        {isBank ? (
          <Building2 size={13} color={colors.primary[600]} />
        ) : (
          <Smartphone size={13} color={colors.primary[600]} />
        )}
        <Text style={payStyles.methodLabel}>{METHOD_LABELS[method] ?? method}</Text>
      </View>
      {Object.entries(details).map(([key, val]) => (
        <View key={key} style={payStyles.row}>
          <Text style={payStyles.key}>
            {key === 'phone'
              ? 'Phone'
              : key === 'bank_name'
              ? 'Bank'
              : key === 'account_number'
              ? 'Account No.'
              : key === 'account_holder'
              ? 'Holder'
              : key}
          </Text>
          <Text style={payStyles.val}>{String(val)}</Text>
        </View>
      ))}
    </View>
  );
}

const payStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary[50],
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  methodLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary[700],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  key: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  val: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
});

export default function AdminWithdrawalsScreen() {
  const { user, isAdmin } = useAuth();
  const [eligible, setEligible] = useState<EligiblePublisher[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [paying, setPaying] = useState(false);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      // 1. Load publishers who have withdrawal_settings
      const { data: settingsData, error: settingsErr } = await supabase
        .from('withdrawal_settings')
        .select('user_id, min_threshold, payment_method, account_details');

      if (settingsErr) throw settingsErr;
      if (!settingsData || settingsData.length === 0) {
        setEligible([]);
        return;
      }

      const userIds = settingsData.map((s: any) => s.user_id);

      // 2. Load their wallets + profiles in parallel
      const [walletsRes, profilesRes] = await Promise.all([
        supabase
          .from('wallets')
          .select('user_id, available_balance')
          .in('user_id', userIds),
        supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds),
      ]);

      if (walletsRes.error) throw walletsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const walletMap: Record<string, number> = {};
      (walletsRes.data ?? []).forEach((w: any) => {
        walletMap[w.user_id] = w.available_balance ?? 0;
      });

      const profileMap: Record<string, string | null> = {};
      (profilesRes.data ?? []).forEach((p: any) => {
        profileMap[p.id] = p.full_name;
      });

      // 3. Filter: balance >= threshold
      const eligibleList: EligiblePublisher[] = (settingsData as any[])
        .map((s) => ({
          user_id: s.user_id,
          full_name: profileMap[s.user_id] ?? null,
          available_balance: walletMap[s.user_id] ?? 0,
          min_threshold: s.min_threshold,
          payment_method: s.payment_method as PaymentMethod,
          account_details: s.account_details ?? {},
        }))
        .filter((p) => p.available_balance >= p.min_threshold)
        .sort((a, b) => b.available_balance - a.available_balance);

      setEligible(eligibleList);

      // 4. Load recent payments (paid withdrawal_requests for publishers)
      const { data: paymentsData } = await supabase
        .from('withdrawal_requests')
        .select('id, user_id, amount, status, invoice_number, created_at, profile:profiles(full_name)')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(20);

      setRecentPayments((paymentsData ?? []) as unknown as RecentPayment[]);
    } catch (e: any) {
      setError(e.message || 'Failed to load publisher data');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const fmtMoney = (n: number) =>
    `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const toggleSelect = (uid: string) => {
    setSelectedIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const selectAll = () => {
    setSelectedIds(filtered.map((p) => p.user_id));
  };

  const deselectAll = () => setSelectedIds([]);

  const handlePaySelected = () => {
    if (selectedIds.length === 0) return;
    setAdminNotes('');
    setConfirmModal(true);
  };

  const processPayments = async () => {
    if (selectedIds.length === 0) return;
    setPaying(true);
    setConfirmModal(false);

    const token = await getAuthToken();
    if (!token) {
      Alert.alert('Error', 'Not authenticated. Please sign in again.');
      setPaying(false);
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const uid of selectedIds) {
      const publisher = eligible.find((p) => p.user_id === uid);
      if (!publisher) continue;
      try {
        // Step 1: Create withdrawal_request record
        const invoiceNumber = `INV-${Date.now()}-${uid.slice(0, 6).toUpperCase()}`;
        const paymentInfoJson = JSON.stringify({
          method: publisher.payment_method,
          ...publisher.account_details,
        });

        const { data: insertData, error: insertErr } = await supabase
          .from('withdrawal_requests')
          .insert({
            user_id: uid,
            amount: publisher.available_balance,
            payment_info: paymentInfoJson,
            status: 'pending',
            invoice_number: invoiceNumber,
          })
          .select('id')
          .single();

        if (insertErr) throw new Error(insertErr.message);

        // Step 2: Mark as paid via admin-api
        const res = await fetch(`${ADMIN_API_BASE}/withdrawals/${insertData.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            status: 'paid',
            admin_notes: adminNotes.trim() || null,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `API error (${res.status})`);
        }

        // Step 3: Send notification to publisher
        await supabase.from('app_notifications').insert({
          user_id: uid,
          type: 'payment_processed',
          title: 'Payment Processed',
          body: `Your withdrawal of ${fmtMoney(publisher.available_balance)} has been sent via ${
            METHOD_LABELS[publisher.payment_method] ?? publisher.payment_method
          }. Invoice: ${invoiceNumber}`,
          data: {
            invoice_number: invoiceNumber,
            amount: publisher.available_balance,
            payment_method: publisher.payment_method,
          },
          is_read: false,
        });

        successCount++;
      } catch (e: any) {
        failCount++;
        errors.push(`${publisher.full_name ?? uid}: ${e.message}`);
      }
    }

    setPaying(false);
    setSelectedIds([]);
    await load();

    Alert.alert(
      'Payout Complete',
      `✅ Paid: ${successCount}\n❌ Failed: ${failCount}${
        errors.length ? '\n\nErrors:\n' + errors.slice(0, 5).join('\n') : ''
      }`
    );
  };

  // ── Filtering ─────────────────────────────────────────────────
  const filtered = eligible.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (p.full_name ?? '').toLowerCase().includes(q);
  });

  const totalSelectedAmount = selectedIds.reduce((sum, uid) => {
    const p = eligible.find((e) => e.user_id === uid);
    return sum + (p?.available_balance ?? 0);
  }, 0);

  // ── Access guard ──────────────────────────────────────────────
  if (!user || !isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Publisher Payouts</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.accessGuard}>
          <Shield size={64} color={colors.neutral[300]} />
          <Text style={styles.accessTitle}>Admin Access Required</Text>
          <Text style={styles.accessMsg}>
            You need administrator privileges to manage payouts.
          </Text>
          <View style={{ marginTop: spacing.lg, width: '100%' }}>
            <Button title="Back to Home" onPress={() => router.replace('/(tabs)/index')} fullWidth />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Publisher Payouts</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Loading publisher accounts…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && eligible.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Publisher Payouts</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Publisher Payouts</Text>
        <TouchableOpacity
          style={styles.paymentMethodsBtn}
          onPress={() => router.push('/admin/payment-methods')}
        >
          <CreditCard size={18} color={colors.primary[600]} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.neutral[400]} />
        <TextInputArabic
          style={styles.searchInput}
          placeholder="Search by publisher name…"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <XIcon size={18} color={colors.neutral[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Summary header */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.warning[100] }]}>
              <Users size={18} color={colors.warning[700]} />
            </View>
            <Text style={styles.summaryValue}>{eligible.length}</Text>
            <Text style={styles.summaryLabel}>Eligible Publishers</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.success[100] }]}>
              <DollarSign size={18} color={colors.success[700]} />
            </View>
            <Text style={styles.summaryValue}>
              {fmtMoney(eligible.reduce((s, p) => s + p.available_balance, 0))}
            </Text>
            <Text style={styles.summaryLabel}>Total Due</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.primary[100] }]}>
              <CheckCircle2 size={18} color={colors.primary[700]} />
            </View>
            <Text style={styles.summaryValue}>{recentPayments.length}</Text>
            <Text style={styles.summaryLabel}>Paid (Recent)</Text>
          </View>
        </View>

        {/* Eligible publishers */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            Eligible for Payout ({filtered.length})
          </Text>
          {filtered.length > 0 ? (
            <View style={styles.selectBtns}>
              <TouchableOpacity onPress={selectAll}>
                <Text style={styles.selectBtn}>Select All</Text>
              </TouchableOpacity>
              {selectedIds.length > 0 ? (
                <TouchableOpacity onPress={deselectAll}>
                  <Text style={[styles.selectBtn, { color: colors.error[600] }]}>Deselect</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Wallet size={56} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No eligible publishers</Text>
            <Text style={styles.emptyMsg}>
              {search
                ? 'No results match your search.'
                : 'No publishers currently have a balance meeting their configured threshold.'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
            {filtered.map((pub) => {
              const isSelected = selectedIds.includes(pub.user_id);
              return (
                <TouchableOpacity
                  key={pub.user_id}
                  style={[styles.pubCard, isSelected && styles.pubCardSelected]}
                  onPress={() => toggleSelect(pub.user_id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.pubCardTop}>
                    {/* Avatar + name */}
                    <View style={styles.pubAvatarWrap}>
                      <View style={[styles.pubAvatar, isSelected && styles.pubAvatarSelected]}>
                        {isSelected ? (
                          <Check size={18} color={colors.white} />
                        ) : (
                          <Text style={styles.pubAvatarText}>
                            {(pub.full_name ?? '?').charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pubName}>
                        {pub.full_name || 'Unknown Publisher'}
                      </Text>
                      <Text style={styles.pubThreshold}>
                        Threshold: {fmtMoney(pub.min_threshold)}
                      </Text>
                    </View>
                    <View style={styles.balanceBadge}>
                      <Text style={styles.balanceBadgeText}>
                        {fmtMoney(pub.available_balance)}
                      </Text>
                    </View>
                  </View>

                  {/* Payment details */}
                  <PaymentDetails
                    method={pub.payment_method}
                    details={pub.account_details}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Recent payments */}
        {recentPayments.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
              Recent Payments
            </Text>
            <View style={{ gap: spacing.sm }}>
              {recentPayments.map((p) => (
                <View key={p.id} style={styles.recentCard}>
                  <View style={styles.recentLeft}>
                    <CheckCircle2 size={18} color={colors.success[600]} />
                    <View>
                      <Text style={styles.recentName}>
                        {(p.profile as any)?.full_name || 'Unknown'}
                      </Text>
                      <Text style={styles.recentDate}>{fmtDate(p.created_at)}</Text>
                    </View>
                  </View>
                  <View style={styles.recentRight}>
                    <Text style={styles.recentAmount}>{fmtMoney(p.amount)}</Text>
                    {p.invoice_number ? (
                      <Text style={styles.recentInvoice}>{p.invoice_number}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Floating pay bar */}
      {selectedIds.length > 0 ? (
        <View style={styles.payBar}>
          <View>
            <Text style={styles.payBarCount}>{selectedIds.length} publisher(s) selected</Text>
            <Text style={styles.payBarTotal}>Total: {fmtMoney(totalSelectedAmount)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.payBtn, paying && styles.payBtnDisabled]}
            disabled={paying}
            onPress={handlePaySelected}
          >
            {paying ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Banknote size={18} color={colors.white} />
            )}
            <Text style={styles.payBtnText}>{paying ? 'Processing…' : 'Pay Selected'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Confirm modal */}
      <Modal
        visible={confirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => !paying && setConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Payouts</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => !paying && setConfirmModal(false)}
              >
                <XIcon size={20} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <View style={styles.confirmSummary}>
              <Text style={styles.confirmLine}>
                Publishers:{' '}
                <Text style={styles.confirmBold}>{selectedIds.length}</Text>
              </Text>
              <Text style={styles.confirmLine}>
                Total Amount:{' '}
                <Text style={styles.confirmBold}>{fmtMoney(totalSelectedAmount)}</Text>
              </Text>
            </View>

            <View style={[styles.warningBox, { backgroundColor: colors.success[50], borderColor: colors.success[200] }]}>
              <Text style={[styles.warningText, { color: colors.success[700] }]}>
                Make sure you have sent the payments to each publisher's payment account before
                confirming. Each publisher will receive a notification and receipt.
              </Text>
            </View>

            <Text style={styles.notesLabel}>Admin Notes (Optional)</Text>
            <TextInputArabic
              style={[styles.notesInput, styles.textArea]}
              placeholder="Any notes to include with the payment notifications…"
              value={adminNotes}
              onChangeText={setAdminNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cancel"
                  onPress={() => setConfirmModal(false)}
                  variant="outline"
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Confirm & Notify"
                  onPress={processPayments}
                  fullWidth
                />
              </View>
            </View>
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
  paymentMethodsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
  },
  title: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
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
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 4,
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  summaryValue: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  selectBtns: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  selectBtn: {
    ...typography.bodySmall,
    color: colors.primary[600],
    fontWeight: '600',
  },
  // Publisher card
  pubCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  pubCardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  pubCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pubAvatarWrap: {},
  pubAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pubAvatarSelected: {
    backgroundColor: colors.primary[600],
  },
  pubAvatarText: {
    ...typography.h4,
    color: colors.neutral[600],
    fontWeight: '700',
  },
  pubName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  pubThreshold: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  balanceBadge: {
    backgroundColor: colors.success[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  balanceBadgeText: {
    ...typography.bodySmall,
    color: colors.success[800],
    fontWeight: '700',
  },
  // Recent payments
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  recentName: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  recentDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  recentRight: {
    alignItems: 'flex-end',
  },
  recentAmount: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.success[700],
  },
  recentInvoice: {
    ...typography.caption,
    color: colors.neutral[400],
    marginTop: 2,
  },
  // Empty
  emptyState: {
    alignItems: 'center',
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
  // Pay bar
  payBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  payBarCount: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.text,
  },
  payBarTotal: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  payBtnDisabled: {
    opacity: 0.6,
  },
  payBtnText: {
    ...typography.bodySmall,
    color: colors.white,
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
  confirmSummary: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
    marginBottom: spacing.md,
  },
  confirmLine: {
    ...typography.body,
    color: colors.textSecondary,
  },
  confirmBold: {
    fontWeight: '700',
    color: colors.text,
  },
  warningBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning[100],
  },
  warningText: {
    ...typography.caption,
    color: colors.warning[700],
  },
  notesLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  notesInput: {
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
