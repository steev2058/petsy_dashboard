import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/theme';

export default function AdminSettingsScreen() {
  const router = useRouter();
  const [maintenance, setMaintenance] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);
  const [analytics, setAnalytics] = React.useState(true);

  const settingsGroups = [
    {
      title: 'General',
      items: [
        { label: 'App Name', value: 'Petsy Marketplace', icon: 'paw' },
        { label: 'Version', value: '1.0.0', icon: 'information-circle' },
        { label: 'Environment', value: 'Production', icon: 'server' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Maintenance Mode', toggle: true, value: maintenance, onChange: setMaintenance, icon: 'construct' },
        { label: 'Push Notifications', toggle: true, value: notifications, onChange: setNotifications, icon: 'notifications' },
        { label: 'Analytics', toggle: true, value: analytics, onChange: setAnalytics, icon: 'analytics' },
      ],
    },
    {
      title: 'Payments',
      items: [
        { label: 'Stripe Status', value: 'Connected', icon: 'card', color: Colors.success },
        { label: 'PayPal Status', value: 'Connected', icon: 'logo-paypal', color: Colors.success },
        { label: 'ShamCash Status', value: 'Active', icon: 'qr-code', color: Colors.success },
      ],
    },
    {
      title: 'Loyalty Program',
      items: [
        { label: 'Points per $1', value: '1 point', icon: 'star' },
        { label: 'Redemption Rate', value: '100 pts = $1', icon: 'gift' },
        { label: 'Tiers', value: 'Bronze, Silver, Gold, Platinum', icon: 'medal' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{group.title}</Text>
            <View style={[styles.card, Shadow.small]}>
              {group.items.map((item: any, itemIndex) => (
                <View key={itemIndex}>
                  <View style={styles.settingItem}>
                    <View style={[styles.settingIcon, { backgroundColor: (item.color || Colors.primary) + '20' }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.color || Colors.primary} />
                    </View>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                    {item.toggle ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onChange}
                        trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                        thumbColor={item.value ? Colors.primary : Colors.textLight}
                      />
                    ) : (
                      <Text style={[styles.settingValue, item.color && { color: item.color }]}>{item.value}</Text>
                    )}
                  </View>
                  {itemIndex < group.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={[styles.card, Shadow.small]}>
            <TouchableOpacity style={styles.dangerItem}>
              <Ionicons name="trash" size={20} color={Colors.error} />
              <Text style={styles.dangerText}>Clear All Cache</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.dangerItem}>
              <Ionicons name="refresh" size={20} color={Colors.error} />
              <Text style={styles.dangerText}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  section: { marginTop: Spacing.md, paddingHorizontal: Spacing.md },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  settingIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  settingLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '500', color: Colors.text },
  settingValue: { fontSize: FontSize.md, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: Spacing.md + 36 + Spacing.md },
  dangerItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  dangerText: { fontSize: FontSize.md, fontWeight: '500', color: Colors.error },
});
