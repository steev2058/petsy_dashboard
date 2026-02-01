import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSize, Spacing } from '../constants/theme';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface CategoryListProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (id: string | null) => void;
  horizontal?: boolean;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  selectedCategory,
  onSelect,
  horizontal = true,
}) => {
  const renderItem = (category: Category) => {
    const isSelected = selectedCategory === category.id;
    return (
      <TouchableOpacity
        key={category.id}
        style={[
          styles.item,
          { backgroundColor: isSelected ? category.color : Colors.backgroundDark },
        ]}
        onPress={() => onSelect(isSelected ? null : category.id)}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: isSelected ? Colors.white : category.color },
          ]}
        >
          <Ionicons
            name={category.icon as any}
            size={24}
            color={isSelected ? category.color : Colors.white}
          />
        </View>
        <Text
          style={[
            styles.name,
            { color: isSelected ? Colors.white : Colors.text },
          ]}
        >
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  };

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContainer}
      >
        {categories.map(renderItem)}
      </ScrollView>
    );
  }

  return (
    <View style={styles.gridContainer}>
      {categories.map(renderItem)}
    </View>
  );
};

const styles = StyleSheet.create({
  horizontalContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  item: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    minWidth: 80,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});

// Preset categories
export const PET_CATEGORIES: Category[] = [
  { id: 'all', name: 'All', icon: 'paw', color: Colors.primary },
  { id: 'dog', name: 'Dogs', icon: 'paw', color: '#FF6B6B' },
  { id: 'cat', name: 'Cats', icon: 'paw', color: '#4ECDC4' },
  { id: 'bird', name: 'Birds', icon: 'paw', color: '#45B7D1' },
  { id: 'fish', name: 'Fish', icon: 'water', color: '#96CEB4' },
  { id: 'rabbit', name: 'Rabbits', icon: 'paw', color: '#DDA0DD' },
];

export const SHOP_CATEGORIES: Category[] = [
  { id: 'all', name: 'All', icon: 'grid', color: Colors.primary },
  { id: 'food', name: 'Food', icon: 'restaurant', color: '#FF6B6B' },
  { id: 'toys', name: 'Toys', icon: 'game-controller', color: '#4ECDC4' },
  { id: 'medicine', name: 'Medicine', icon: 'medkit', color: '#45B7D1' },
  { id: 'accessories', name: 'Accessories', icon: 'shirt', color: '#96CEB4' },
  { id: 'shampoo', name: 'Grooming', icon: 'water', color: '#DDA0DD' },
];
