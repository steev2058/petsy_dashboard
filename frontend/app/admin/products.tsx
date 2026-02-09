import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Image,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import api, { productsAPI } from '../../src/services/api';
import { Input } from '../../src/components';

export default function AdminProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data || []);
    } catch (error) {
      console.log('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, []);

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock) || 0,
      };
      if (editProduct) {
        await api.put(`/admin/products/${editProduct.id}`, productData);
        setProducts(products.map(p => p.id === editProduct.id ? { ...p, ...productData } : p));
      } else {
        const response = await api.post('/admin/products', productData);
        setProducts([...products, response.data]);
      }
      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', editProduct ? 'Product updated' : 'Product added');
    } catch (error) {
      Alert.alert('Error', 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert('Delete Product', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/products/${productId}`);
            setProducts(products.filter(p => p.id !== productId));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete product');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', category: '', stock: '', image_url: '', is_active: true });
    setEditProduct(null);
  };

  const openEditModal = (product: any) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price?.toString() || '',
      category: product.category || '',
      stock: product.stock?.toString() || '',
      image_url: product.image_url || '',
      is_active: product.is_active ?? true,
    });
    setEditProduct(product);
    setShowAddModal(true);
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loaderText}>Loading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.productCard, Shadow.small]} onPress={() => openEditModal(item)}>
      <View style={styles.productImageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="cube" size={24} color={Colors.textLight} />
          </View>
        )}
        {!item.is_active && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveBadgeText}>Inactive</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category || 'Uncategorized'}</Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>${item.price?.toFixed(2)}</Text>
          <Text style={styles.productStock}>Stock: {item.stock || 0}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteProduct(item.id)}>
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Products</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowAddModal(true); }}>
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={Colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{products.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{products.filter(p => p.is_active).length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{products.filter(p => (p.stock || 0) < 10).length}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editProduct ? 'Edit Product' : 'Add Product'}</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalForm}>
              <Input label="Product Name *" placeholder="Enter product name" value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} />
              <Input label="Price *" placeholder="0.00" value={formData.price} onChangeText={(t) => setFormData({ ...formData, price: t })} keyboardType="decimal-pad" />
              <Input label="Category" placeholder="e.g., Food, Toys" value={formData.category} onChangeText={(t) => setFormData({ ...formData, category: t })} />
              <Input label="Stock" placeholder="0" value={formData.stock} onChangeText={(t) => setFormData({ ...formData, stock: t })} keyboardType="numeric" />
              <Input label="Image URL" placeholder="https://..." value={formData.image_url} onChangeText={(t) => setFormData({ ...formData, image_url: t })} />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active</Text>
                <Switch value={formData.is_active} onValueChange={(v) => setFormData({ ...formData, is_active: v })} trackColor={{ false: Colors.border, true: Colors.primary + '80' }} thumbColor={formData.is_active ? Colors.primary : Colors.textLight} />
              </View>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProduct}>
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.saveButtonGradient}>
                <Text style={styles.saveButtonText}>{editProduct ? 'Update Product' : 'Add Product'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  addButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  statsBar: { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  statDivider: { width: 1, backgroundColor: Colors.border },
  listContent: { padding: Spacing.md },
  productCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  productImageContainer: { position: 'relative' },
  productImage: { width: 60, height: 60, borderRadius: BorderRadius.md },
  productImagePlaceholder: { width: 60, height: 60, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  inactiveBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: Colors.error, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  inactiveBadgeText: { fontSize: 8, fontWeight: '700', color: Colors.white },
  productInfo: { flex: 1, marginLeft: Spacing.md },
  productName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  productCategory: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  productPrice: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary },
  productStock: { fontSize: FontSize.sm, color: Colors.textSecondary },
  deleteButton: { padding: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: Spacing.xxl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  modalForm: { gap: Spacing.sm },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  switchLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  saveButton: { marginTop: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  saveButtonGradient: { paddingVertical: Spacing.md, alignItems: 'center' },
  saveButtonText: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.white },
  loaderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
