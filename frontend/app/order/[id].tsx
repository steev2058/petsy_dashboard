import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import { ordersAPI } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { Button } from '../../src/components';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addToCart, clearCart } = useStore();

  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await ordersAPI.getById(String(id));
        setOrder(res.data);
      } catch (e: any) {
        Alert.alert('Error', e?.response?.data?.detail || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const isOldOrder = useMemo(() => {
    const status = String(order?.status || '').toLowerCase();
    return ['delivered', 'completed', 'finished'].includes(status);
  }, [order]);

  const handleReorder = async () => {
    if (!order?.items?.length) return;
    setReordering(true);
    try {
      await clearCart();
      for (const it of order.items) {
        const productId = it.product_id || it.id || it.item_id;
        if (!productId) continue;
        for (let i = 0; i < (it.quantity || 1); i++) {
          await addToCart({
            product_id: String(productId),
            name: it.name || 'Product',
            price: Number(it.price || 0),
            image: it.image,
          });
        }
      }
      router.push('/checkout');
    } catch (e) {
      Alert.alert('Error', 'Failed to re-order this order');
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loaderText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}><Text>Order not found</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, Shadow.small]}>
          <Text style={styles.orderId}>Order #{String(order.id).slice(0, 8)}</Text>
          <Text style={styles.meta}>Date: {new Date(order.created_at).toLocaleDateString()}</Text>
          <Text style={styles.meta}>Status: {order.status || 'pending'}</Text>
          <Text style={styles.meta}>City: {order.shipping_city || '-'}</Text>
          <Text style={styles.total}>Total: ${Number(order.total || 0).toFixed(2)}</Text>
        </View>

        <View style={[styles.card, Shadow.small]}>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.items?.map((it: any, i: number) => (
            <View key={i} style={styles.itemRow}>
              {it.image ? <Image source={{ uri: it.image }} style={styles.itemImage} /> : <View style={styles.itemImage} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.name || 'Item'}</Text>
                <Text style={styles.itemMeta}>Qty: {it.quantity || 1} • ${Number(it.price || 0).toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

        {isOldOrder && (
          <Button
            title="Re-order this order"
            onPress={handleReorder}
            loading={reordering}
            disabled={reordering}
            style={{ marginTop: Spacing.md }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.backgroundDark,
  },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  content: { padding: Spacing.md, paddingBottom: 120 },
  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md,
  },
  orderId: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  meta: { marginTop: 4, color: Colors.textSecondary, fontSize: FontSize.sm },
  total: { marginTop: 8, color: Colors.primary, fontWeight: '700', fontSize: FontSize.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm, color: Colors.text },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  itemImage: { width: 44, height: 44, borderRadius: 8, backgroundColor: Colors.backgroundDark },
  itemName: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },
  itemMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loaderText: { marginTop: Spacing.sm, color: Colors.textSecondary },
});
