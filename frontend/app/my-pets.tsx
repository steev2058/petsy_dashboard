import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { petsAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

export default function MyPetsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ petId: string; type: 'edit' | 'health' | 'delete' } | null>(null);

  const loadPets = async () => {
    try {
      const res = await petsAPI.getMyPets();
      setPets(res.data || []);
    } catch (e) {
      console.log('Error loading pets', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPets();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPets();
    setRefreshing(false);
  }, []);

  const onDeletePet = (petId: string, petName: string) => {
    Alert.alert('Delete Pet', `Delete ${petName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionLoading({ petId, type: 'delete' });
          try {
            await petsAPI.delete(petId);
            setPets((prev) => prev.filter((p) => p.id !== petId));
          } catch (e) {
            Alert.alert('Error', 'Failed to delete pet');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const editLoading = actionLoading?.petId === item.id && actionLoading?.type === 'edit';
    const healthLoading = actionLoading?.petId === item.id && actionLoading?.type === 'health';
    const deleteLoading = actionLoading?.petId === item.id && actionLoading?.type === 'delete';

    return (
    <View style={[styles.card, Shadow.small]}>
      <TouchableOpacity onPress={() => router.push(`/pet/${item.id}`)} activeOpacity={0.9}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="paw" size={26} color={Colors.textLight} />
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.infoRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>{item.species} • {item.breed || 'Mixed'}</Text>
        </View>
        <View style={styles.badge}><Text style={styles.badgeText}>{item.status?.replace('_', ' ')}</Text></View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          disabled={!!actionLoading}
          onPress={() => {
            setActionLoading({ petId: item.id, type: 'edit' });
            router.push(`/add-pet?editId=${item.id}`);
            setTimeout(() => setActionLoading(null), 700);
          }}
        >
          {editLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="create-outline" size={16} color={Colors.primary} />}
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          disabled={!!actionLoading}
          onPress={() => {
            setActionLoading({ petId: item.id, type: 'health' });
            router.push(`/health-records?petId=${item.id}`);
            setTimeout(() => setActionLoading(null), 700);
          }}
        >
          {healthLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="medkit-outline" size={16} color={Colors.primary} />}
          <Text style={styles.actionText}>Health</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionDanger]}
          disabled={!!actionLoading}
          onPress={() => onDeletePet(item.id, item.name)}
        >
          {deleteLoading ? <ActivityIndicator size="small" color={Colors.error} /> : <Ionicons name="trash-outline" size={16} color={Colors.error} />}
          <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loaderText}>Loading your pets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('my_pets')}</Text>
        <TouchableOpacity onPress={() => router.push('/add-pet')} style={styles.addBtn}>
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {pets.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="paw" size={52} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>No pets yet</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/add-pet')}>
            <Text style={styles.primaryBtnText}>Add your first pet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, backgroundColor: Colors.white },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.sm, marginBottom: Spacing.md },
  image: { width: '100%', height: 170, borderRadius: BorderRadius.md },
  imagePlaceholder: { width: '100%', height: 170, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundDark, alignItems: 'center', justifyContent: 'center' },
  infoRow: { marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  meta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm, backgroundColor: Colors.primary + '18' },
  badgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
  actionsRow: { marginTop: Spacing.sm, flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.backgroundDark, paddingVertical: 8, paddingHorizontal: 10, borderRadius: BorderRadius.sm },
  actionDanger: { backgroundColor: Colors.error + '12' },
  actionText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loaderText: { marginTop: Spacing.sm, color: Colors.textSecondary },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyTitle: { marginTop: Spacing.sm, fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  primaryBtn: { marginTop: Spacing.md, backgroundColor: Colors.primary, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md },
  primaryBtnText: { color: Colors.white, fontWeight: '700' },
});
