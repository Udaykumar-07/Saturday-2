/**
 * Action Confirmation — bottom sheet modal for approving risky actions.
 * Shows action description, risk level, and allow/deny buttons.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';
import type { Action } from '../../core/types/action';

interface ActionConfirmationProps {
  action: Action | null;
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export const ActionConfirmation: React.FC<ActionConfirmationProps> = ({
  action,
  visible,
  onAllow,
  onDeny,
}) => {
  if (!action) return null;

  const riskColor =
    action.intent.riskLevel === 'high'
      ? '#FF4444'
      : action.intent.riskLevel === 'medium'
        ? '#FFAA00'
        : colors.accent;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>Action Confirmation</Text>

          <Text style={styles.description}>{action.intent.description}</Text>

          <View style={[styles.riskBadge, { backgroundColor: riskColor + '20' }]}>
            <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
            <Text style={[styles.riskText, { color: riskColor }]}>
              {action.intent.riskLevel.toUpperCase()} RISK
            </Text>
          </View>

          <Text style={styles.capabilityLabel}>
            Capability: {action.intent.capability}
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.denyButton]}
              onPress={onDeny}
            >
              <Text style={styles.denyText}>Deny</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.allowButton]}
              onPress={onAllow}
            >
              <Text style={styles.allowText}>Allow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  capabilityLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  denyButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  allowButton: {
    backgroundColor: colors.accent,
  },
  denyText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  allowText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
