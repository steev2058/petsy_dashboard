import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { useTranslation } from '../src/hooks/useTranslation';

const FAQ_ITEMS = [
  {
    question: 'How do I adopt a pet?',
    answer: 'Browse our Adoption section, select a pet you like, and click "Contact Owner" to start the adoption process. You can message the current owner directly through our app.',
  },
  {
    question: 'How does pet tracking work?',
    answer: 'Purchase a Petsy Tag, attach it to your pet\'s collar, and register it in the app. Anyone who finds your pet can scan the tag to see your contact information.',
  },
  {
    question: 'Is the AI Assistant free to use?',
    answer: 'Yes! Our AI Assistant is completely free and available 24/7 to answer your pet-related questions.',
  },
  {
    question: 'How do I list my pet for adoption?',
    answer: 'Go to Profile → My Pets → Add Pet. Fill in your pet\'s details and set the status to "For Adoption". Your pet will appear in the adoption listings.',
  },
  {
    question: 'How do I book a vet appointment?',
    answer: 'Browse our Vets section, select a veterinarian, and click "Book Appointment". Choose your preferred date and time, and you\'re all set!',
  },
  {
    question: 'How can I report a lost pet?',
    answer: 'Go to Lost & Found section, tap "Report Lost Pet", fill in your pet\'s details and last known location. We\'ll help spread the word!',
  },
];

const CONTACT_OPTIONS = [
  { icon: 'mail', label: 'Email Support', value: 'support@petsy.app', type: 'email' },
  { icon: 'logo-whatsapp', label: 'WhatsApp', value: '+1234567890', type: 'whatsapp' },
  { icon: 'call', label: 'Phone', value: '+1234567890', type: 'phone' },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const filteredFaqs = FAQ_ITEMS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContact = (type: string, value: string) => {
    switch (type) {
      case 'email':
        Linking.openURL(`mailto:${value}`);
        break;
      case 'whatsapp':
        Linking.openURL(`https://wa.me/${value.replace(/[^0-9]/g, '')}`);
        break;
      case 'phone':
        Linking.openURL(`tel:${value}`);
        break;
    }
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please enter your feedback');
      return;
    }
    Alert.alert('Thank You!', 'Your feedback has been submitted. We appreciate your input!');
    setFeedbackText('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, Shadow.small]}>
            <Ionicons name="search" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search help articles..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Help</Text>
          <View style={styles.quickActions}>
            {[
              { icon: 'chatbubbles', label: 'Live Chat', color: '#10B981' },
              { icon: 'videocam', label: 'Video Guide', color: '#6366F1' },
              { icon: 'document-text', label: 'User Guide', color: '#F59E0B' },
              { icon: 'bug', label: 'Report Bug', color: '#EF4444' },
            ].map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickAction}
                onPress={() => Alert.alert('Coming Soon', `${action.label} will be available soon!`)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {filteredFaqs.map((faq, index) => (
            <Animated.View key={index} entering={FadeInDown.delay(index * 50)}>
              <TouchableOpacity
                style={[styles.faqItem, Shadow.small]}
                onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
                activeOpacity={0.9}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </View>
                {expandedFaq === index && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Contact Us */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={[styles.contactCard, Shadow.small]}>
            {CONTACT_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.contactOption,
                  index < CONTACT_OPTIONS.length - 1 && styles.contactOptionBorder,
                ]}
                onPress={() => handleContact(option.type, option.value)}
              >
                <View style={[styles.contactIcon, { backgroundColor: Colors.primary + '15' }]}>
                  <Ionicons name={option.icon as any} size={20} color={Colors.primary} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>{option.label}</Text>
                  <Text style={styles.contactValue}>{option.value}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send Feedback</Text>
          <View style={[styles.feedbackCard, Shadow.small]}>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Tell us how we can improve..."
              placeholderTextColor={Colors.textLight}
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitFeedback}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.submitGradient}
              >
                <Ionicons name="send" size={18} color={Colors.white} />
                <Text style={styles.submitText}>Submit Feedback</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.socialContainer}>
          <Text style={styles.socialTitle}>Follow Us</Text>
          <View style={styles.socialLinks}>
            {[
              { icon: 'logo-facebook', color: '#1877F2' },
              { icon: 'logo-instagram', color: '#E4405F' },
              { icon: 'logo-twitter', color: '#1DA1F2' },
              { icon: 'logo-youtube', color: '#FF0000' },
            ].map((social, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.socialButton, { backgroundColor: social.color + '15' }]}
                onPress={() => Alert.alert('Social', 'Opening social media...')}
              >
                <Ionicons name={social.icon as any} size={24} color={social.color} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  backButton: {},
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  searchContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    width: '23%',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  quickActionLabel: {
    fontSize: FontSize.xs,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  faqItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  faqAnswer: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  contactCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  contactOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  contactLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  contactValue: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  feedbackCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  feedbackInput: {
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 100,
    marginBottom: Spacing.md,
  },
  submitButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  submitText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.white,
  },
  socialContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  socialTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
