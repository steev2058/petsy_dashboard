import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';

interface LoyaltyPointsCardProps {
  totalPoints: number;
  tier?: string;
  pointsValue?: number;
  showRedemption?: boolean;
  pointsToUse?: number;
  onPointsToUseChange?: (points: number) => void;
  maxRedeemable?: number;
  orderTotal?: number;
}

const TIER_COLORS = {
  bronze: ['#CD7F32', '#B87333'],
  silver: ['#C0C0C0', '#A8A9AD'],
  gold: ['#FFD700', '#FFC000'],
  platinum: ['#E5E4E2', '#C0C0C0'],
};

const TIER_ICONS = {
  bronze: 'medal-outline',
  silver: 'medal',
  gold: 'trophy',
  platinum: 'diamond',
};

export const LoyaltyPointsCard: React.FC<LoyaltyPointsCardProps> = ({
  totalPoints,
  tier = 'bronze',
  pointsValue = totalPoints / 100,
  showRedemption = false,
  pointsToUse = 0,
  onPointsToUseChange,
  maxRedeemable = totalPoints,
  orderTotal = 0,
}) => {
  const tierColors = TIER_COLORS[tier as keyof typeof TIER_COLORS] || TIER_COLORS.bronze;
  const tierIcon = TIER_ICONS[tier as keyof typeof TIER_ICONS] || 'medal-outline';
  
  // Calculate max points that can be used (can't exceed order total or available points)
  const maxPointsForOrder = Math.floor(orderTotal * 100);
  const actualMaxRedeemable = Math.min(maxRedeemable, maxPointsForOrder, totalPoints);
  
  const handleUseAll = () => {
    onPointsToUseChange?.(actualMaxRedeemable);
  };

  const handleClear = () => {
    onPointsToUseChange?.(0);
  };

  const discount = pointsToUse / 100;

  return (
    <View style={styles.container}>
      {/* Points Balance Card */}
      <LinearGradient
        colors={tierColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <View style={styles.balanceHeader}>
          <View style={styles.tierBadge}>
            <Ionicons name={tierIcon as any} size={16} color={Colors.white} />
            <Text style={styles.tierText}>{tier.toUpperCase()}</Text>
          </View>
          <Text style={styles.balanceLabel}>Petsy Points</Text>
        </View>
        
        <View style={styles.balanceContent}>
          <View style={styles.pointsDisplay}>
            <Ionicons name="star" size={28} color={Colors.white} />
            <Text style={styles.pointsAmount}>{totalPoints.toLocaleString()}</Text>
          </View>
          <Text style={styles.pointsValueText}>
            Worth ${pointsValue.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.balanceFooter}>
          <Text style={styles.earnRateText}>
            Earn 1 point for every $1 spent
          </Text>
        </View>
      </LinearGradient>

      {/* Redemption Section */}
      {showRedemption && totalPoints > 0 && (
        <View style={styles.redemptionSection}>
          <View style={styles.redemptionHeader}>
            <View>
              <Text style={styles.redemptionTitle}>Use Points</Text>
              <Text style={styles.redemptionSubtitle}>
                100 points = $1.00 discount
              </Text>
            </View>
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={handleUseAll}
              >
                <Text style={styles.quickActionText}>Use Max</Text>
              </TouchableOpacity>
              {pointsToUse > 0 && (
                <TouchableOpacity 
                  style={[styles.quickAction, styles.quickActionClear]}
                  onPress={handleClear}
                >
                  <Text style={[styles.quickActionText, { color: Colors.error }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.redemptionInput}>
            <Ionicons name="star" size={20} color={Colors.primary} />
            <TextInput
              style={styles.pointsInput}
              placeholder="Enter points to use"
              placeholderTextColor={Colors.textLight}
              value={pointsToUse > 0 ? pointsToUse.toString() : ''}
              onChangeText={(text) => {
                const value = parseInt(text) || 0;
                const clampedValue = Math.min(Math.max(0, value), actualMaxRedeemable);
                onPointsToUseChange?.(clampedValue);
              }}
              keyboardType="numeric"
            />
            <Text style={styles.availableText}>
              / {actualMaxRedeemable.toLocaleString()}
            </Text>
          </View>

          {pointsToUse > 0 && (
            <View style={styles.discountPreview}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.discountText}>
                You&apos;ll save <Text style={styles.discountAmount}>${discount.toFixed(2)}</Text>
              </Text>
            </View>
          )}

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmounts}>
            {[100, 250, 500, 1000].map((amount) => {
              if (amount > actualMaxRedeemable) return null;
              return (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.quickAmountBtn,
                    pointsToUse === amount && styles.quickAmountBtnActive,
                  ]}
                  onPress={() => onPointsToUseChange?.(amount)}
                >
                  <Text style={[
                    styles.quickAmountText,
                    pointsToUse === amount && styles.quickAmountTextActive,
                  ]}>
                    {amount}
                  </Text>
                  <Text style={[
                    styles.quickAmountValue,
                    pointsToUse === amount && styles.quickAmountTextActive,
                  ]}>
                    -${(amount / 100).toFixed(0)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* No Points Message */}
      {showRedemption && totalPoints === 0 && (
        <View style={styles.noPointsMessage}>
          <Ionicons name="information-circle" size={20} color={Colors.textSecondary} />
          <Text style={styles.noPointsText}>
            You don&apos;t have any points yet. Complete purchases to earn points!
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  balanceCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  tierText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.white,
  },
  balanceLabel: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  balanceContent: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pointsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pointsAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.white,
  },
  pointsValueText: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.9)',
    marginTop: Spacing.xs,
  },
  balanceFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: Spacing.sm,
    alignItems: 'center',
  },
  earnRateText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  redemptionSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  redemptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  redemptionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  redemptionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickAction: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  quickActionClear: {
    backgroundColor: Colors.error + '15',
  },
  quickActionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  redemptionInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  pointsInput: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  availableText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  discountPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.success + '15',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  discountText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  discountAmount: {
    fontWeight: '700',
    color: Colors.success,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  quickAmountBtn: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  quickAmountBtnActive: {
    backgroundColor: Colors.primary,
  },
  quickAmountText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  quickAmountValue: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  quickAmountTextActive: {
    color: Colors.white,
  },
  noPointsMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundDark,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  noPointsText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});

export default LoyaltyPointsCard;
