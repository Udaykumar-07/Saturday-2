/**
 * Saturday Top Header Component.
 * Minimal and uncluttered. No technical settings or model dropdowns.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { MenuIcon, PlusIcon, SlidersIcon } from './icons';

interface HeaderProps {
  onOpenHistory?: () => void;
  onOpenSettings?: () => void;
  onNewConversation?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenSettings,
  onNewConversation,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onOpenHistory}
        activeOpacity={0.7}
        accessibilityLabel="View conversation history"
        accessibilityRole="button"
      >
        <MenuIcon size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>SATURDAY</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNewConversation}
          activeOpacity={0.7}
          accessibilityLabel="New conversation"
          accessibilityRole="button"
        >
          <PlusIcon size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenSettings}
          activeOpacity={0.7}
          accessibilityLabel="Personality settings"
          accessibilityRole="button"
        >
          <SlidersIcon size={15} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: colors.background,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    ...typography.brandTitle,
    color: colors.textPrimary,
    fontSize: 14,
    letterSpacing: 4,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
});
