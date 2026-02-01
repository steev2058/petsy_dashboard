import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';
import api from '../../src/services/api';

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  pending: { color: '#F59E0B', icon: 'time', label: 'Pending' },
  confirmed: { color: '#3B82F6', icon: 'checkmark-circle', label: 'Confirmed' },
  shipped: { color: '#8B5CF6', icon: 'car', label: 'Shipped' },
  delivered: { color: '#10B981', icon: 'checkmark-done-circle', label: 'Delivered' },
  cancelled: { color: '#EF4444', icon: 'close-circle', label: 'Cancelled' },
};

export default function AdminOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await api.get('/admin/orders');
      setOrders(response.data || []);
    } catch (error) {
      console.log('Error loading orders:', error);
      // Mock data
      const mockOrders = [
        { id: '1', user_name: 'John Doe', total: 125.99, status: 'pending', items: [{ name: 'Dog Food', quantity: 2 }], created_at: new Date().toISOString(), shipping_city: 'New York' },
        { id: '2', user_name: 'Jane Smith', total: 89.50, status: 'shipped', items: [{ name: 'Cat Toy', quantity: 3 }], created_at: new Date().toISOString(), shipping_city: 'Los Angeles' },
        { id: '3', user_name: 'Bob Wilson', total: 250.00, status: 'delivered', items: [{ name: 'Pet Bed', quantity: 1 }], created_at: new Date().toISOString(), shipping_city: 'Chicago' },
      ];
      setOrders(mockOrders);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.put(`/admin/orders/${orderId}`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setShowModal(false);
      Alert.alert('Success', 'Order status updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const renderOrder = ({ item }: { item: any }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    return (
      <TouchableOpacity
        style={[styles.orderCard, Shadow.small]}
        onPress={() => { setSelectedOrder(item); setShowModal(true); }}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Ionicons name={status.icon as any} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.orderBody}>
          <View style={styles.orderInfo}>
            <Ionicons name="person" size={16} color={Colors.textSecondary} />
            <Text style={styles.orderInfoText}>{item.user_name}</Text>
          </View>
          <View style={styles.orderInfo}>
            <Ionicons name="location" size={16} color={Colors.textSecondary} />
            <Text style={styles.orderInfoText}>{item.shipping_city}</Text>
          </View>
          <View style={styles.orderInfo}>
            <Ionicons name="cube" size={16} color={Colors.textSecondary} />
            <Text style={styles.orderInfoText}>{item.items?.length || 0} items</Text>
          </View>
        </View>
        <View style={styles.orderFooter}>
          <Text style={styles.orderTotal}>${item.total?.toFixed(2)}</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'pending', 'confirmed', 'shipped', 'delivered'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bag-handle-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
      />

      {/* Order Detail Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {selectedOrder && (
              <>
                <View style={styles.modalOrderInfo}>
                  <Text style={styles.modalOrderId}>Order #{selectedOrder.id.slice(0, 8)}</Text>
                  <Text style={styles.modalOrderTotal}>${selectedOrder.total?.toFixed(2)}</Text>
                </View>
                <Text style={styles.modalSectionTitle}>Update Status</Text>
                <View style={styles.statusOptions}>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.statusOption, selectedOrder.status === key && { borderColor: config.color, borderWidth: 2 }]}
                      onPress={() => handleUpdateStatus(selectedOrder.id, key)}
                    >
                      <View style={[styles.statusOptionIcon, { backgroundColor: config.color + '20' }]}>
                        <Ionicons name={config.icon as any} size={20} color={config.color} />
                      </View>
                      <Text style={styles.statusOptionText}>{config.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
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
  filterContainer: { flexDirection: 'row', backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.xs },
  filterTab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundDark },
  filterTabActive: { backgroundColor: Colors.primary },
  filterTabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  filterTabTextActive: { color: Colors.white },
  listContent: { padding: Spacing.md },
  orderCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  orderId: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  orderDate: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm, gap: 4 },
  statusText: { fontSize: FontSize.sm, fontWeight: '600' },
  orderBody: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.sm },
  orderInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderInfoText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  orderTotal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: Spacing.xxl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  modalOrderInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.backgroundDark, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg },
  modalOrderId: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  modalOrderTotal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  modalSectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statusOption: { width: '31%', alignItems: 'center', backgroundColor: Colors.backgroundDark, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 2, borderColor: 'transparent' },
  statusOptionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xs },
  statusOptionText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
});
