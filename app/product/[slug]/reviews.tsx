import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Star, ThumbsUp } from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import type { Review, Product } from '@/lib/supabase';

export default function ReviewsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    const { data: prod } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    setProduct(prod as Product | null);
    if (prod) {
      const { data: revs } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', (prod as Product).id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      setReviews((revs as Review[]) ?? []);
    }
  }, [slug]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const submitReview = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to leave a review.');
      return;
    }
    if (!product) return;
    if (!body.trim()) {
      Alert.alert('Review required', 'Please write your review');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      product_id: product.id,
      user_id: user.id,
      rating,
      title: title.trim() || null,
      body: body.trim(),
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    Alert.alert('Success', 'Your review has been submitted!');
    setTitle('');
    setBody('');
    setRating(5);
    setShowForm(false);
    await load();
  };

  if (loading) return <LoadingState />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Reviews</Text>
        <View style={{ width: 40 }} />
      </View>
      {product ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.bigRating}>{product.rating.toFixed(1)}</Text>
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
            <Text style={styles.reviewCount}>{product.review_count} reviews</Text>
          </View>
          <View style={styles.summaryRight}>
            <Button
              title="Write a Review"
              onPress={() => setShowForm(!showForm)}
              size="sm"
            />
          </View>
        </View>
      ) : null}
      {showForm ? (
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Your Rating</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <TouchableOpacity key={i} onPress={() => setRating(i)}>
                <Star
                  size={32}
                  color={i <= rating ? colors.accent[500] : colors.neutral[300]}
                  fill={i <= rating ? colors.accent[500] : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.formLabel}>Title (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Summarize your review"
            value={title}
            onChangeText={setTitle}
          />
          <Text style={styles.formLabel}>Review</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What did you like or dislike?"
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Button
            title={submitting ? 'Submitting...' : 'Submit Review'}
            onPress={submitReview}
            loading={submitting}
            fullWidth
          />
        </View>
      ) : null}
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        ListEmptyComponent={
          <EmptyState
            icon={<Star size={64} color={colors.neutral[300]} />}
            title="No reviews yet"
            message="Be the first to review this product"
          />
        }
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    size={14}
                    color={i <= item.rating ? colors.accent[500] : colors.neutral[300]}
                    fill={i <= item.rating ? colors.accent[500] : 'transparent'}
                  />
                ))}
              </View>
              <Text style={styles.reviewDate}>
                {new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </Text>
            </View>
            {item.title ? <Text style={styles.reviewTitle}>{item.title}</Text> : null}
            {item.body ? <Text style={styles.reviewBody}>{item.body}</Text> : null}
            <View style={styles.reviewFooter}>
              <TouchableOpacity style={styles.helpfulBtn}>
                <ThumbsUp size={14} color={colors.neutral[400]} />
                <Text style={styles.helpfulText}>Helpful ({item.helpful_count})</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  summaryLeft: {
    alignItems: 'center',
    gap: 4,
  },
  bigRating: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewCount: {
    ...typography.caption,
    color: colors.textMuted,
  },
  summaryRight: {},
  formCard: {
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  formLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
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
    lineHeight: 20,
  },
  reviewFooter: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helpfulText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
