import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar, Button } from '../src/components';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { emergencyAPI } from '../src/services/api';
import { useTranslation } from '../src/hooks/useTranslation';

const FIRST_AID_TIPS = [
  {
    id: 'bleeding',
    title: 'Bleeding/Wounds',
    icon: 'bandage',
    color: '#FF6B6B',
    tips: ['Apply pressure with clean cloth', 'Keep wound elevated', 'Seek vet care immediately'],
  },
  {
    id: 'poisoning',
    title: 'Poisoning',
    icon: 'warning',
    color: '#FFE66D',
    tips: ['Do NOT induce vomiting', 'Note what was ingested', 'Call vet or poison control'],
  },
  {
    id: 'choking',
    title: 'Choking',
    icon: 'alert-circle',
    color: '#4ECDC4',
    tips: ['Check mouth for objects', 'Perform pet Heimlich if trained', 'Rush to vet'],
  },
  {
    id: 'heatstroke',
    title: 'Heatstroke',
    icon: 'thermometer',
    color: '#FF8E53',
    tips: ['Move to cool area', 'Apply cool (not cold) water', 'Offer small amounts of water'],
  },
];

export default function EmergencyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [expandedTip, setExpandedTip] = useState<string | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await emergencyAPI.getContacts();
      setContacts(response.data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(query) ||
      contact.city?.toLowerCase().includes(query)
    );
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Red Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Ionicons name="alert-circle" size={32} color={Colors.white} />
            <Text style={styles.title}>{t('emergency')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.subtitle}>Quick access to emergency pet services</Text>
        
        {/* Quick Call Button */}
        <TouchableOpacity
          style={styles.quickCallButton}
          onPress={() => handleCall('+963911111111')}
        >
          <Ionicons name="call" size={24} color={Colors.error} />
          <Text style={styles.quickCallText}>Call Emergency Vet</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search emergency contacts..."
        />

        {/* First Aid Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('first_aid')}</Text>
          <View style={styles.tipsGrid}>
            {FIRST_AID_TIPS.map((tip) => (
              <TouchableOpacity
                key={tip.id}
                style={[styles.tipCard, { borderLeftColor: tip.color }]}
                onPress={() => setExpandedTip(expandedTip === tip.id ? null : tip.id)}
              >
                <View style={styles.tipHeader}>
                  <View style={[styles.tipIcon, { backgroundColor: tip.color }]}>
                    <Ionicons name={tip.icon as any} size={20} color={Colors.white} />
                  </View>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Ionicons
                    name={expandedTip === tip.id ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </View>
                {expandedTip === tip.id && (
                  <View style={styles.tipContent}>
                    {tip.tips.map((item, index) => (
                      <View key={index} style={styles.tipItem}>
                        <View style={styles.tipBullet} />
                        <Text style={styles.tipText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('emergency_contacts')}</Text>
          {filteredContacts.map((contact) => (
            <View key={contact.id} style={[styles.contactCard, Shadow.small]}>
              <View style={styles.contactInfo}>
                <View style={styles.contactHeader}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.is_24_hours && (
                    <View style={styles.badge24h}>
                      <Text style={styles.badge24hText}>24/7</Text>
                    </View>
                  )}
                </View>
                <View style={styles.contactDetails}>
                  <Ionicons name="location" size={14} color={Colors.textSecondary} />
                  <Text style={styles.contactCity}>{contact.city}</Text>
                </View>
                {contact.address && (
                  <Text style={styles.contactAddress} numberOfLines={1}>
                    {contact.address}
                  </Text>
                )}
                <View style={styles.contactType}>
                  <Text style={styles.contactTypeText}>
                    {contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(contact.phone)}
              >
                <Ionicons name="call" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ))}

          {filteredContacts.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>No contacts found</Text>
            </View>
          )}
        </View>

        {/* Donate Section */}
        <TouchableOpacity style={styles.donateSection}>
          <View style={styles.donateContent}>
            <Ionicons name="heart" size={32} color={Colors.white} />
            <View style={styles.donateText}>
              <Text style={styles.donateTitle}>Support Animal Rescue</Text>
              <Text style={styles.donateSubtitle}>Your donation saves lives</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.white} />
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  header: {
    backgroundColor: Colors.error,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.white,
    opacity: 0.9,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  quickCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  quickCallText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.error,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tipsGrid: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  tipCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  tipContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingLeft: Spacing.md + 36 + Spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  contactName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  badge24h: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badge24hText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.white,
  },
  contactDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  contactCity: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  contactAddress: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  contactType: {
    marginTop: Spacing.xs,
  },
  contactTypeText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  callButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  donateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.secondary,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  donateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  donateText: {},
  donateTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  donateSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.white,
    opacity: 0.9,
  },
});
