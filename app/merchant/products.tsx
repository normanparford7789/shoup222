import { useState, useCallback } from 'react';
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
  FlatList,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Package,
  X,
  Image as ImageIcon,
  Tag,
  Shield,
  Palette,
  Ruler,
  Check,
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { ArabicText as Text, ArabicTextInput as TextInputArabic } from '@/components/ArabicText';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { pickAndUploadImage, isCloudinaryConfigured } from '@/lib/cloudinary';
import type { Product, Category, ProductImage, ProductVariant } from '@/lib/supabase';

type ProductWithRelations = Product & {
  category: Category | null;
  images: ProductImage[];
  variants: ProductVariant[];
};

type ColorOption = { name: string; hex: string };

type FormState = {
  name: string;
  price: string;
  description: string;
  category_id: string;
  image_url: string;
  status: 'active' | 'draft';
  colors: ColorOption[];
  sizes: string[];
  stock: Record<string, string>; // key: `${colorName}__${size}`
};

const emptyForm: FormState = {
  name: '',
  price: '',
  description: '',
  category_id: '',
  image_url: '',
  status: 'active',
  colors: [],
  sizes: [],
  stock: {},
};

// Predefined color palette — merchant picks from real swatches, no typing needed
const COLOR_PALETTE: ColorOption[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Gray', hex: '#9CA3AF' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Navy', hex: '#1E3A8A' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Brown', hex: '#92400E' },
  { name: 'Beige', hex: '#E7D5B8' },
  { name: 'Gold', hex: '#D4AF37' },
  { name: 'Silver', hex: '#C0C0C0' },
];

// Quick-pick sizes — shared across all selected colors for this product
const QUICK_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'];

const stockKey = (colorName: string, size: string) => `${colorName}__${size}`;

const isLightColor = (hex: string) => {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
};

const generateSlug = (name: string) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}-${rand}`;
};

export default function MerchantProductsScreen() {
  const { user, isMerchant } = useAuth();
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [customSize, setCustomSize] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select('*, category:categories(*), images:product_images(*), variants:product_variants(*)')
          .eq('merchant_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('is_active', true),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setProducts((productsRes.data as unknown as ProductWithRelations[]) ?? []);
      setCategories((categoriesRes.data as Category[]) ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load products');
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

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCustomSize('');
    setModalVisible(true);
  };

  const openEdit = (product: ProductWithRelations) => {
    setEditingId(product.id);

    const colorMap = new Map<string, ColorOption>();
    const sizesSet = new Set<string>();
    const stock: Record<string, string> = {};
    (product.variants ?? []).forEach((v) => {
      if (!colorMap.has(v.color)) {
        const paletteMatch = COLOR_PALETTE.find(
          (c) => c.name.toLowerCase() === v.color.toLowerCase()
        );
        colorMap.set(v.color, {
          name: v.color,
          hex: v.color_hex || paletteMatch?.hex || colors.neutral[400],
        });
      }
      sizesSet.add(v.size);
      stock[stockKey(v.color, v.size)] = String(v.stock ?? 0);
    });

    setForm({
      name: product.name,
      price: String(product.price ?? ''),
      description: product.description ?? '',
      category_id: product.category_id ?? '',
      image_url: product.images?.[0]?.image_url ?? '',
      status: (product.status as 'active' | 'draft') ?? 'active',
      colors: Array.from(colorMap.values()),
      sizes: Array.from(sizesSet),
      stock,
    });
    setModalVisible(true);
  };

  // ── Colors & Sizes helpers ──────────────────────────────────────
  const toggleColor = (option: ColorOption) => {
    setForm((f) => {
      const isSelected = f.colors.some((c) => c.name === option.name);
      if (isSelected) {
        const stock = { ...f.stock };
        f.sizes.forEach((s) => delete stock[stockKey(option.name, s)]);
        return { ...f, colors: f.colors.filter((c) => c.name !== option.name), stock };
      }
      const stock = { ...f.stock };
      f.sizes.forEach((s) => {
        const key = stockKey(option.name, s);
        if (!(key in stock)) stock[key] = '0';
      });
      return { ...f, colors: [...f.colors, option], stock };
    });
  };

  const toggleSize = (size: string) => {
    setForm((f) => {
      const isSelected = f.sizes.includes(size);
      if (isSelected) {
        const stock = { ...f.stock };
        f.colors.forEach((c) => delete stock[stockKey(c.name, size)]);
        return { ...f, sizes: f.sizes.filter((s) => s !== size), stock };
      }
      const stock = { ...f.stock };
      f.colors.forEach((c) => {
        const key = stockKey(c.name, size);
        if (!(key in stock)) stock[key] = '0';
      });
      return { ...f, sizes: [...f.sizes, size], stock };
    });
  };

  const addCustomSize = () => {
    const size = customSize.trim();
    if (!size) return;
    if (form.sizes.some((s) => s.toLowerCase() === size.toLowerCase())) {
      setCustomSize('');
      return;
    }
    toggleSize(size);
    setCustomSize('');
  };

  const updateStock = (colorName: string, size: string, value: string) => {
    setForm((f) => ({ ...f, stock: { ...f.stock, [stockKey(colorName, size)]: value } }));
  };

  const handleSave = async () => {
    if (!user) return;
    // Validation
    if (!form.name.trim()) {
      Alert.alert('Validation Error', 'Product name is required.');
      return;
    }
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price.');
      return;
    }

    // Build the color × size stock combinations
    const variantsToSave: { color: string; color_hex: string | null; size: string; stock: number }[] = [];
    for (const c of form.colors) {
      for (const s of form.sizes) {
        const raw = form.stock[stockKey(c.name, s)] ?? '0';
        const stockNum = raw.trim() === '' ? 0 : parseInt(raw, 10);
        if (isNaN(stockNum) || stockNum < 0) {
          Alert.alert(
            'Validation Error',
            `Please enter a valid stock quantity for "${c.name} / ${s}".`
          );
          return;
        }
        variantsToSave.push({ color: c.name, color_hex: c.hex, size: s, stock: stockNum });
      }
    }
    if ((form.colors.length > 0) !== (form.sizes.length > 0)) {
      Alert.alert(
        'Validation Error',
        'Please select at least one color and at least one size, or leave both empty.'
      );
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // ── Update existing product ──
        const { data: updated, error: updateErr } = await supabase
          .from('products')
          .update({
            name: form.name.trim(),
            price: priceNum,
            description: form.description.trim() || null,
            category_id: form.category_id || null,
            status: form.status,
          })
          .eq('id', editingId)
          .select('*')
          .single();

        if (updateErr) throw updateErr;

        // Update first image if provided
        if (form.image_url.trim()) {
          const existing = products.find((p) => p.id === editingId);
          const firstImage = existing?.images?.[0];
          if (firstImage) {
            await supabase
              .from('product_images')
              .update({ image_url: form.image_url.trim() })
              .eq('id', firstImage.id);
          } else {
            await supabase.from('product_images').insert({
              product_id: editingId,
              image_url: form.image_url.trim(),
              sort_order: 0,
            });
          }
        }

        // Sync colors & sizes (replace existing options with the current selection)
        await supabase.from('product_variants').delete().eq('product_id', editingId);
        if (variantsToSave.length > 0) {
          const { error: variantsErr } = await supabase.from('product_variants').insert(
            variantsToSave.map((v) => ({
              product_id: editingId,
              color: v.color,
              color_hex: v.color_hex,
              size: v.size,
              stock: v.stock,
            }))
          );
          if (variantsErr) throw variantsErr;
        }

        Alert.alert('Success', 'Product updated successfully.');
      } else {
        // ── Create new product ──
        const slug = generateSlug(form.name);
        const { data: created, error: createErr } = await supabase
          .from('products')
          .insert({
            name: form.name.trim(),
            slug,
            price: priceNum,
            description: form.description.trim() || null,
            category_id: form.category_id || null,
            status: form.status,
            merchant_id: user.id,
            rating: 0,
            review_count: 0,
            is_featured: false,
            is_new: true,
          })
          .select('*')
          .single();

        if (createErr) throw createErr;

        // Insert image if provided
        if (form.image_url.trim() && created) {
          const { error: imgErr } = await supabase.from('product_images').insert({
            product_id: created.id,
            image_url: form.image_url.trim(),
            sort_order: 0,
          });
          if (imgErr) throw imgErr;
        }

        // Insert colors & sizes if provided
        if (variantsToSave.length > 0 && created) {
          const { error: variantsErr } = await supabase.from('product_variants').insert(
            variantsToSave.map((v) => ({
              product_id: created.id,
              color: v.color,
              color_hex: v.color_hex,
              size: v.size,
              stock: v.stock,
            }))
          );
          if (variantsErr) throw variantsErr;
        }

        Alert.alert('Success', 'Product created successfully.');
      }

      setModalVisible(false);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (product: ProductWithRelations) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: delErr } = await supabase
                .from('products')
                .delete()
                .eq('id', product.id);
              if (delErr) throw delErr;
              Alert.alert('Success', 'Product deleted.');
              await load();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const fmtMoney = (n: number) =>
    `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const renderProduct = ({ item }: { item: ProductWithRelations }) => {
    const thumb = item.images?.[0]?.image_url;
    return (
      <View style={styles.productCard}>
        <View style={styles.productRow}>
          <View style={styles.productThumb}>
            {thumb ? (
              <View style={styles.thumbPlaceholder}>
                <ImageIcon size={20} color={colors.neutral[400]} />
              </View>
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Package size={20} color={colors.neutral[400]} />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.productPrice}>{fmtMoney(item.price)}</Text>
            {item.category ? (
              <View style={styles.categoryBadge}>
                <Tag size={10} color={colors.primary[700]} />
                <Text style={styles.categoryText}>{item.category.name}</Text>
              </View>
            ) : null}
          </View>
          <View
            style={[
              styles.statusBadge,
              item.status === 'active' ? styles.statusActive : styles.statusDraft,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: item.status === 'active' ? colors.success[700] : colors.neutral[600] },
              ]}
            >
              {item.status === 'active' ? 'Active' : 'Draft'}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.productDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.productActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => openEdit(item)}
          >
            <Pencil size={16} color={colors.primary[600]} />
            <Text style={[styles.actionBtnText, { color: colors.primary[600] }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={16} color={colors.error[500]} />
            <Text style={[styles.actionBtnText, { color: colors.error[500] }]}>Delete</Text>
          </TouchableOpacity>
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
          <Text style={styles.title}>Products</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.accessGuard}>
          <Shield size={64} color={colors.neutral[300]} />
          <Text style={styles.accessTitle}>Merchant Access Required</Text>
          <Text style={styles.accessMsg}>
            You need merchant privileges to manage products.
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
          <Text style={styles.title}>Products</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Loading products…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────
  if (error && products.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Products</Text>
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
        <Text style={styles.title}>My Products</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={openAdd}>
          <Plus size={24} color={colors.primary[600]} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={56} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptyMsg}>
              Tap the + button to add your first product.
            </Text>
            <View style={{ marginTop: spacing.lg, width: '100%' }}>
              <Button title="Add Product" onPress={openAdd} fullWidth />
            </View>
          </View>
        }
      />

      {/* ── Add/Edit Modal ─────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !saving && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Product' : 'Add Product'}
              </Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => !saving && setModalVisible(false)}
              >
                <X size={20} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text style={styles.fieldLabel}>Product Name *</Text>
              <TextInputArabic
                style={styles.input}
                placeholder="Enter product name"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                editable={!saving}
              />

              {/* Price */}
              <Text style={styles.fieldLabel}>Price ($) *</Text>
              <TextInputArabic
                style={styles.input}
                placeholder="0.00"
                value={form.price}
                onChangeText={(v) => setForm({ ...form, price: v })}
                keyboardType="decimal-pad"
                editable={!saving}
              />

              {/* Description */}
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInputArabic
                style={[styles.input, styles.textArea]}
                placeholder="Describe your product…"
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!saving}
              />

              {/* Category */}
              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    !form.category_id && styles.categoryChipActive,
                  ]}
                  onPress={() => setForm({ ...form, category_id: '' })}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      !form.category_id && styles.categoryChipTextActive,
                    ]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      form.category_id === cat.id && styles.categoryChipActive,
                    ]}
                    onPress={() => setForm({ ...form, category_id: cat.id })}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        form.category_id === cat.id && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Available Colors */}
              <View style={styles.variantsSectionHeader}>
                <Text style={styles.fieldLabel}>
                  <Palette size={14} color={colors.text} /> Available Colors
                </Text>
                <Text style={styles.variantsHint}>
                  Tap the colors this product comes in.
                </Text>
              </View>
              <View style={styles.colorGrid}>
                {COLOR_PALETTE.map((opt) => {
                  const selected = form.colors.some((c) => c.name === opt.name);
                  return (
                    <TouchableOpacity
                      key={opt.name}
                      style={styles.colorChip}
                      onPress={() => toggleColor(opt)}
                      disabled={saving}
                    >
                      <View
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: opt.hex },
                          selected && styles.colorSwatchSelected,
                          opt.hex.toUpperCase() === '#FFFFFF' && styles.colorSwatchBorder,
                        ]}
                      >
                        {selected ? (
                          <Check
                            size={16}
                            color={isLightColor(opt.hex) ? colors.text : colors.white}
                            strokeWidth={3}
                          />
                        ) : null}
                      </View>
                      <Text
                        style={[styles.colorChipLabel, selected && styles.colorChipLabelActive]}
                        numberOfLines={1}
                      >
                        {opt.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Available Sizes (shared across all colors) */}
              <View style={styles.variantsSectionHeader}>
                <Text style={styles.fieldLabel}>
                  <Ruler size={14} color={colors.text} /> Available Sizes
                </Text>
                <Text style={styles.variantsHint}>
                  These sizes apply to every color selected above.
                </Text>
              </View>
              <View style={styles.sizeGrid}>
                {QUICK_SIZES.map((s) => {
                  const selected = form.sizes.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.categoryChip, selected && styles.categoryChipActive]}
                      onPress={() => toggleSize(s)}
                      disabled={saving}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && styles.categoryChipTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {form.sizes
                  .filter((s) => !QUICK_SIZES.includes(s))
                  .map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.categoryChip, styles.categoryChipActive]}
                      onPress={() => toggleSize(s)}
                      disabled={saving}
                    >
                      <Text style={[styles.categoryChipText, styles.categoryChipTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
              <View style={styles.customSizeRow}>
                <TextInputArabic
                  style={[styles.input, styles.customSizeInput]}
                  placeholder="Custom size (e.g. 42)"
                  value={customSize}
                  onChangeText={setCustomSize}
                  editable={!saving}
                  onSubmitEditing={addCustomSize}
                />
                <TouchableOpacity
                  style={styles.customSizeAddBtn}
                  onPress={addCustomSize}
                  disabled={saving || !customSize.trim()}
                >
                  <Plus size={18} color={colors.white} />
                </TouchableOpacity>
              </View>

              {/* Stock per color & size */}
              {form.colors.length > 0 && form.sizes.length > 0 ? (
                <>
                  <Text style={styles.fieldLabel}>Stock Quantity</Text>
                  {form.colors.map((c) => (
                    <View key={c.name} style={styles.stockCard}>
                      <View style={styles.stockCardHeader}>
                        <View style={[styles.stockColorDot, { backgroundColor: c.hex }]} />
                        <Text style={styles.stockColorName}>{c.name}</Text>
                      </View>
                      <View style={styles.stockSizesRow}>
                        {form.sizes.map((s) => (
                          <View key={s} style={styles.stockSizeBox}>
                            <Text style={styles.stockSizeLabel}>{s}</Text>
                            <TextInputArabic
                              style={styles.stockSizeInput}
                              value={form.stock[stockKey(c.name, s)] ?? '0'}
                              onChangeText={(v) => updateStock(c.name, s, v)}
                              keyboardType="number-pad"
                              editable={!saving}
                              placeholder="0"
                            />
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </>
              ) : form.colors.length > 0 || form.sizes.length > 0 ? (
                <Text style={styles.variantsHint}>
                  Select at least one color and one size to set stock quantities.
                </Text>
              ) : null}

              {/* Image Upload */}
              <Text style={styles.fieldLabel}>Product Image</Text>
              <TouchableOpacity
                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={async () => {
                  if (uploading || saving) return;
                  setUploading(true);
                  try {
                    const url = await pickAndUploadImage();
                    if (url) setForm({ ...form, image_url: url });
                  } catch (e: any) {
                    Alert.alert('Upload Error', e.message || 'Failed to upload image');
                  } finally {
                    setUploading(false);
                  }
                }}
                disabled={saving || uploading}
              >
                <Text
                  style={form.image_url ? styles.uploadPreviewText : styles.uploadPlaceholder}
                  numberOfLines={1}
                >
                  {uploading
                    ? 'Uploading…'
                    : form.image_url
                    ? 'Image uploaded ✓ (tap to change)'
                    : 'Tap to upload image from device'}
                </Text>
                <ImageIcon size={20} color={colors.neutral[400]} />
              </TouchableOpacity>
              {!isCloudinaryConfigured() ? (
                <Text style={styles.configWarning}>
                  Cloudinary not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env
                </Text>
              ) : null}

              {/* Status */}
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.statusToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.statusToggle,
                    form.status === 'active' && styles.statusToggleActive,
                  ]}
                  onPress={() => setForm({ ...form, status: 'active' })}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.statusToggleText,
                      form.status === 'active' && styles.statusToggleTextActive,
                    ]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusToggle,
                    form.status === 'draft' && styles.statusToggleActive,
                  ]}
                  onPress={() => setForm({ ...form, status: 'draft' })}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.statusToggleText,
                      form.status === 'draft' && styles.statusToggleTextActive,
                    ]}
                  >
                    Draft
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Cancel"
                    onPress={() => setModalVisible(false)}
                    variant="outline"
                    disabled={saving}
                    fullWidth
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title={editingId ? 'Update' : 'Create'}
                    onPress={handleSave}
                    loading={saving}
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
  // Product card
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  productThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  productPrice: {
    ...typography.h4,
    color: colors.primary[700],
    fontWeight: '700',
    marginTop: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  categoryText: {
    ...typography.caption,
    color: colors.primary[700],
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusActive: {
    backgroundColor: colors.success[50],
  },
  statusDraft: {
    backgroundColor: colors.neutral[100],
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  productDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  productActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  editBtn: {
    backgroundColor: colors.primary[50],
  },
  deleteBtn: {
    backgroundColor: colors.error[50],
  },
  actionBtnText: {
    ...typography.bodySmall,
    fontWeight: '600',
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
  // Form fields
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
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
    marginBottom: spacing.sm,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadPreviewText: {
    ...typography.bodySmall,
    color: colors.success[700],
    fontWeight: '500',
    flex: 1,
  },
  uploadPlaceholder: {
    ...typography.body,
    color: colors.neutral[400],
    flex: 1,
  },
  configWarning: {
    ...typography.caption,
    color: colors.warning[600],
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  // Category chips
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  categoryChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  // Status toggle
  statusToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusToggle: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.neutral[100],
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statusToggleActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  statusToggleText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusToggleTextActive: {
    color: colors.primary[700],
  },
  // Modal actions
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  // Colors & Sizes
  variantsSectionHeader: {
    marginTop: spacing.md,
  },
  variantsHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  // Color palette grid
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  colorChip: {
    alignItems: 'center',
    width: 60,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: colors.primary[600],
  },
  colorSwatchBorder: {
    borderColor: colors.border,
  },
  colorChipLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  colorChipLabelActive: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  // Size grid
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  customSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  customSizeInput: {
    flex: 1,
    marginBottom: spacing.sm,
  },
  customSizeAddBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  // Stock per color card
  stockCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  stockCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stockColorDot: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stockColorName: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  stockSizesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stockSizeBox: {
    alignItems: 'center',
    width: 64,
  },
  stockSizeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  stockSizeInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 8,
    textAlign: 'center',
    ...typography.bodySmall,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
