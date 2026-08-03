import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  ChevronLeft,
  MessageCircle,
  Mail,
  Phone,
  HelpCircle,
  ChevronRight,
  Send,
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';

const FAQS = [
  { q: 'How long does shipping take?', a: 'Standard shipping takes 5-7 business days. Express shipping takes 2-3 business days.' },
  { q: 'What is your return policy?', a: 'We offer 30-day returns on all items. Items must be unworn with original tags.' },
  { q: 'How do I track my order?', a: 'Go to My Orders, tap on your order to see real-time tracking status.' },
  { q: 'Do you ship internationally?', a: 'Yes, we ship to over 50 countries. Shipping costs are calculated at checkout.' },
  { q: 'How do I use a coupon code?', a: 'Enter your coupon code in the cart page before proceeding to checkout.' },
];

export default function SupportScreen() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [sending, setSending] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const submitTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing info', 'Please fill in subject and message');
      return;
    }
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to submit a support ticket.');
      return;
    }
    setSending(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
      category,
    });
    setSending(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    Alert.alert('Success', 'Your support ticket has been submitted. We will get back to you soon.');
    setSubject('');
    setMessage('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactCard}>
            <View style={[styles.contactIcon, { backgroundColor: colors.success[50] }]}>
              <MessageCircle size={24} color={colors.success[600]} />
            </View>
            <Text style={styles.contactLabel}>Live Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactCard}>
            <View style={[styles.contactIcon, { backgroundColor: colors.primary[50] }]}>
              <Mail size={24} color={colors.primary[600]} />
            </View>
            <Text style={styles.contactLabel}>Email Us</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactCard}>
            <View style={[styles.contactIcon, { backgroundColor: colors.accent[50] }]}>
              <Phone size={24} color={colors.accent[600]} />
            </View>
            <Text style={styles.contactLabel}>Call Us</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send a Message</Text>
          <View style={styles.formCard}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryRow}>
              {[
                { key: 'general', label: 'General' },
                { key: 'order', label: 'Order' },
                { key: 'product', label: 'Product' },
                { key: 'payment', label: 'Payment' },
                { key: 'shipping', label: 'Shipping' },
                { key: 'return', label: 'Return' },
              ].map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.categoryChip, category === c.key && styles.categoryChipActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text
                    style={[styles.categoryChipText, category === c.key && styles.categoryChipTextActive]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief description of your issue"
              value={subject}
              onChangeText={setSubject}
            />
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your issue in detail..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Button
              title={sending ? 'Sending...' : 'Submit Ticket'}
              onPress={submitTicket}
              loading={sending}
              fullWidth
            />
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqContainer}>
            {FAQS.map((faq, i) => (
              <View key={i} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <ChevronRight
                    size={20}
                    color={colors.neutral[400]}
                    style={{ transform: [{ rotate: openFaq === i ? '90deg' : '0deg' }] }}
                  />
                </TouchableOpacity>
                {openFaq === i ? (
                  <Text style={styles.faqAnswer}>{faq.a}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
  contactRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  contactCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
  },
  categoryChipActive: {
    backgroundColor: colors.primary[600],
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.text,
  },
  categoryChipTextActive: {
    color: colors.white,
    fontWeight: '600',
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
  },
  faqContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  faqAnswer: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
