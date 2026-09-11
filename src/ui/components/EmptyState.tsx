/**
 * Empty / Welcome State for Saturday.
 * Communicates: "SATURDAY — What do you want to get done?"
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface EmptyStateProps {
  onSelectPrompt?: (prompt: string) => void;
}

const SAMPLE_PROMPTS = [
  'Plan my trip',
  'Find the best answer to this',
  'Show my latest emails',
  'Open YouTube and play this song',
  'Send this to Rahul',
];

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPrompt }) => {
  return (
    <View style={styles.container}>
      <View style={styles.heroSection}>
        <Text style={styles.brandTitle}>SATURDAY</Text>
        <Text style={styles.heroPrompt}>What do you want to get done?</Text>
        <Text style={styles.subtext}>
          Tell Saturday what you want. Saturday works out how to make it happen.
        </Text>
      </View>

      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>TRY ASKING</Text>
        <View style={styles.chipsWrapper}>
          {SAMPLE_PROMPTS.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.chip}
              onPress={() => onSelectPrompt?.(prompt)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandTitle: {
    ...typography.brandTitle,
    color: colors.textSecondary,
    marginBottom: 12,
    fontSize: 16,
    letterSpacing: 6,
  },
  heroPrompt: {
    ...typography.heroPrompt,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtext: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
    fontSize: 13,
  },
  suggestionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  suggestionsTitle: {
    ...typography.micro,
    color: colors.textTertiary,
    letterSpacing: 2,
    marginBottom: 14,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 360,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
