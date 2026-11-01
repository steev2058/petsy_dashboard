import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../src/constants/theme';
import { PetsyMark } from '../src/components/PetsyLogo';
import { useStore } from '../src/store/useStore';

export default function WelcomeLanding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const setLanguage = useStore((s) => s.setLanguage);
  const language = useStore((s) => s.language);

  const heroOpacity = useSharedValue(1);
  const heroY = useSharedValue(16);
  const ctaOpacity = useSharedValue(1);

  useEffect(() => {
    if (language !== 'ar') setLanguage('ar');
    heroOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    heroY.value = withTiming(0, { duration: 550, easing: Easing.out(Easing.cubic) });
    ctaOpacity.value = withDelay(220, withTiming(1, { duration: 400 }));
  }, []);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroY.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value }));

  const isWide = width > 900;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FFFFFF', '#FFF6F2', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.atmosphere} pointerEvents="none" />

      <ScrollView contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <PetsyMark size={42} />
            <Text style={styles.brand}>Petsy</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.topLogin}>
            <Text style={styles.topLoginText}>دخول</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.hero, heroStyle, isWide && styles.heroWide]}>
          <PetsyMark size={96} animated />
          <Text style={styles.kicker}>منصة سورية لرعاية الحيوان</Text>
          <Text style={styles.headline}>بيت واحد للتبنّي والرعاية والسوق البيطري</Text>
          <Text style={styles.sub}>
            ابحث عن رفيق، احجز بيطرياً، وتسوّق مستلزمات بثقة — بتجربة عربية واضحة وقيم تراعي الحلال والمحتوى العائلي.
          </Text>

          <Animated.View style={[styles.ctaRow, ctaStyle]}>
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={() => router.push('/(auth)/signup')}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaPrimaryText}>ابدأ الآن</Text>
              <Ionicons name="arrow-back" size={18} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaSecondary}
              onPress={() => router.replace('/(tabs)/home')}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaSecondaryText}>تصفح كضيف</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        <View style={[styles.visualPlane, isWide && styles.visualWide]}>
          <LinearGradient colors={['#FF6B38', '#FF8A5B']} style={styles.visualCard}>
            <Text style={styles.visualTitle}>تبنّي · بيطرة · سوق</Text>
            <Text style={styles.visualBody}>ثلاث خدمات في منصة واحدة، بواجهة عربية أولاً ومتوافقة مع قيم المجتمع.</Text>
          </LinearGradient>
        </View>

        <View style={styles.sections}>
          <Text style={styles.sectionTitle}>ماذا نقدّم؟</Text>
          {[
            { icon: 'heart', title: 'تبنّي وضائع/موجود', desc: 'منشورات واضحة ومدن سورية وموديريشن يحمي الجميع.' },
            { icon: 'medkit', title: 'حجوزات بيطرية', desc: 'دليل عيادات ومواعيد بسيطة بدون تعقيد.' },
            { icon: 'cart', title: 'سوق مستلزمات', desc: 'طلب بالدفع عند الاستلام ووسائل محلية مناسبة.' },
          ].map((item) => (
            <View key={item.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.valuesBox}>
          <Text style={styles.valuesTitle}>قيم المنصة</Text>
          <Text style={styles.valuesText}>
            محتوى عائلي، منع للمنتجات والممارسات المحرّمة، وتسعير شفاف بلا ربا أو رسوم مضللة. العمولة أجرة خدمة معلنة.
          </Text>
        </View>

        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
            <Text style={styles.footerLink}>الخصوصية</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.footerLink}>الشروط</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/about')}>
            <Text style={styles.footerLink}>عن Petsy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  atmosphere: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.heroGlow,
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 64, paddingTop: Platform.OS === 'web' ? 28 : 12 },
  scrollWide: { maxWidth: 980, alignSelf: 'center', width: '100%' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.small,
  },
  markEmoji: { fontSize: 20 },
  brand: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, letterSpacing: 0.5 },
  topLogin: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
  },
  topLoginText: { color: Colors.text, fontWeight: '700', fontSize: FontSize.md },
  hero: { marginBottom: Spacing.xl },
  heroWide: { maxWidth: 640 },
  kicker: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.sm, marginBottom: Spacing.sm, marginTop: Spacing.md },
  headline: {
    color: Colors.primary,
    fontSize: FontSize.display,
    fontWeight: '800',
    lineHeight: 58,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  sub: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    lineHeight: 28,
    maxWidth: 560,
  },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: Spacing.xl },
  ctaPrimary: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Shadow.medium,
  },
  ctaPrimaryText: { color: Colors.white, fontWeight: '800', fontSize: FontSize.lg },
  ctaSecondary: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  ctaSecondaryText: { color: Colors.text, fontWeight: '700', fontSize: FontSize.lg },
  visualPlane: { marginBottom: Spacing.xxl },
  visualWide: { maxWidth: 720 },
  visualCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    minHeight: 180,
    justifyContent: 'flex-end',
    ...Shadow.large,
  },
  visualTitle: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 8 },
  visualBody: { color: 'rgba(255,255,255,0.92)', fontSize: FontSize.md, lineHeight: 24, maxWidth: 480 },
  sections: { gap: 14, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  featureRow: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { fontWeight: '800', color: Colors.text, fontSize: FontSize.lg, marginBottom: 4 },
  featureDesc: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 22 },
  valuesBox: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  valuesTitle: { color: Colors.white, fontWeight: '800', fontSize: FontSize.xl, marginBottom: 8 },
  valuesText: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.md, lineHeight: 24 },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 24 },
  footerLink: { color: Colors.textSecondary, fontWeight: '600' },
  dot: { color: Colors.textLight },
});
