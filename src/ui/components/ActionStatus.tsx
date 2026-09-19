/**
 * Action Status — inline message component showing action execution state.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import type { Action } from '../../core/types/action';

interface ActionStatusProps {
  action: Action;
}

export const ActionStatus: React.FC<ActionStatusProps> = ({ action }) => {
  const isExecuting =
    action.state === 'EXECUTING' ||
    action.state === 'VALIDATING' ||
    action.state === 'VERIFYING';
  const isCompleted = action.state === 'COMPLETED';
  const isFailed = action.state === 'FAILED' || action.state === 'CANCELLED';

  const stateIcon = isExecuting ? '⟳' : isCompleted ? '✓' : '✕';
  const stateColor = isCompleted
    ? colors.accent
    : isFailed
      ? '#FF4444'
      : colors.textSecondary;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {isExecuting ? (
          <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
        ) : (
          <Text style={[styles.icon, { color: stateColor }]}>{stateIcon}</Text>
        )}
        <Text style={styles.description}>{action.intent.description}</Text>
      </View>
      {isFailed && action.error && (
        <Text style={styles.error}>{action.error}</Text>
      )}
      {isCompleted && (
        <Text style={styles.success}>Action completed</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
    width: 18,
    textAlign: 'center',
  },
  spinner: {
    marginRight: 8,
    width: 18,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  error: {
    fontSize: 12,
    color: '#FF4444',
    marginTop: 4,
    marginLeft: 26,
  },
  success: {
    fontSize: 12,
    color: colors.accent,
    marginTop: 4,
    marginLeft: 26,
  },
});
