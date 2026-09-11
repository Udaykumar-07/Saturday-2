/**
 * Saturday Top Header Component.
 * Minimal and uncluttered. No technical settings or model dropdowns.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

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
        accessibilityLabel="View conversation history"
        accessibilityRole="button"
      >
        {/* Minimal hamburger / list lines */}
        <View style={styles.historyIcon}>
          <View style={[styles.historyBar, { width: 18 }]} />
          <View style={[styles.historyBar, { width: 14 }]} />
          <View style={[styles.historyBar, { width: 10 }]} />
        </View>
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>SATURDAY</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNewConversation}
          accessibilityLabel="New conversation"
          accessibilityRole="button"
        >
          {/* Plus icon */}
          <Text style={styles.plusIcon}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenSettings}
          accessibilityLabel="Personality settings"
          accessibilityRole="button"
        >
          {/* Subtle dots/tune icon */}
          <View style={styles.tuneIcon}>
            <View style={styles.tuneDot} />
            <View style={styles.tuneDot} />
            <View style={styles.tuneDot} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
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
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  historyIcon: {
    width: 18,
    height: 14,
    justifyContent: 'space-between',
  },
  historyBar: {
    height: 2,
    backgroundColor: colors.textSecondary,
    borderRadius: 1,
  },
  plusIcon: {
    fontSize: 20,
    color: colors.textSecondary,
    lineHeight: 22,
    fontWeight: '300',
  },
  tuneIcon: {
    flexDirection: 'column',
    gap: 3,
    alignItems: 'center',
  },
  tuneDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
  },
});
