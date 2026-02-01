import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = BorderRadius.sm,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
};

// Pre-built skeleton layouts
export const ProductCardSkeleton: React.FC = () => (
  <View style={styles.productCard}>
    <Skeleton height={120} borderRadius={BorderRadius.lg} />
    <View style={styles.productContent}>
      <Skeleton width="70%" height={16} style={{ marginTop: Spacing.sm }} />
      <Skeleton width="40%" height={14} style={{ marginTop: Spacing.xs }} />
      <Skeleton width="30%" height={20} style={{ marginTop: Spacing.sm }} />
    </View>
  </View>
);

export const PetCardSkeleton: React.FC = () => (
  <View style={styles.petCard}>
    <Skeleton height={150} borderRadius={BorderRadius.lg} />
    <View style={styles.petContent}>
      <Skeleton width="60%" height={18} style={{ marginTop: Spacing.sm }} />
      <Skeleton width="80%" height={14} style={{ marginTop: Spacing.xs }} />
      <View style={styles.petFooter}>
        <Skeleton width={60} height={24} borderRadius={BorderRadius.sm} />
        <Skeleton width={80} height={24} borderRadius={BorderRadius.sm} />
      </View>
    </View>
  </View>
);

export const VetCardSkeleton: React.FC = () => (
  <View style={styles.vetCard}>
    <View style={styles.vetHeader}>
      <Skeleton width={60} height={60} borderRadius={30} />
      <View style={styles.vetInfo}>
        <Skeleton width={120} height={18} />
        <Skeleton width={80} height={14} style={{ marginTop: Spacing.xs }} />
        <Skeleton width={100} height={14} style={{ marginTop: Spacing.xs }} />
      </View>
    </View>
  </View>
);

export const OrderCardSkeleton: React.FC = () => (
  <View style={styles.orderCard}>
    <View style={styles.orderHeader}>
      <View>
        <Skeleton width={100} height={18} />
        <Skeleton width={80} height={14} style={{ marginTop: Spacing.xs }} />
      </View>
      <Skeleton width={80} height={24} borderRadius={BorderRadius.sm} />
    </View>
    <View style={styles.orderItems}>
      <Skeleton width={48} height={48} borderRadius={BorderRadius.sm} />
      <Skeleton width={48} height={48} borderRadius={BorderRadius.sm} style={{ marginLeft: -8 }} />
      <Skeleton width={48} height={48} borderRadius={BorderRadius.sm} style={{ marginLeft: -8 }} />
    </View>
    <View style={styles.orderFooter}>
      <Skeleton width={80} height={14} />
      <Skeleton width={60} height={20} />
    </View>
  </View>
);

export const ProfileSkeleton: React.FC = () => (
  <View style={styles.profile}>
    <Skeleton width={100} height={100} borderRadius={50} />
    <Skeleton width={150} height={24} style={{ marginTop: Spacing.md }} />
    <Skeleton width={200} height={16} style={{ marginTop: Spacing.sm }} />
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.backgroundDark,
  },
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    width: 160,
  },
  productContent: {
    padding: Spacing.xs,
  },
  petCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  petContent: {
    padding: Spacing.md,
  },
  petFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  vetCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  vetHeader: {
    flexDirection: 'row',
  },
  vetInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  orderItems: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  profile: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
});

export default Skeleton;
