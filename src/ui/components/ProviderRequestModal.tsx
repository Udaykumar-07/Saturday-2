/**
 * Provider Request Modal for Saturday.
 *
 * Displays when routing decides to use an external provider that requires configuration.
 * Offers three actions: Configure, Use Local AI, or Cancel.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';

export interface ProviderRequestModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Name of the provider (e.g., "OpenAI", "Anthropic") */
  providerName: string;
  /** Reason why this provider was selected */
  providerReason: string;
  /** Estimated cost for this request */
  estimatedCost: string;
  /** Callback when user chooses to configure */
  onConfigure: () => void;
  /** Callback when user chooses to use local AI instead */
  onFallbackLocal: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

export const ProviderRequestModal: React.FC<ProviderRequestModalProps> = ({
  visible,
  providerName,
  providerReason,
  estimatedCost,
  onConfigure,
  onFallbackLocal,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>External Provider Required</Text>

            <Text style={styles.description}>
              Saturday wants to use <Text style={styles.bold}>{providerName}</Text> for this
              task.
            </Text>

            <Text style={styles.reason}>{providerReason}</Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Estimated Cost</Text>
              <Text style={styles.infoValue}>{estimatedCost}</Text>
            </View>

            <View style={styles.privacyWarning}>
              <Text style={styles.privacyText}>
                ⚠️ This will send your message to {providerName}'s servers. Your data will
                leave your device.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={onConfigure}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonPrimaryText}>Configure {providerName}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onFallbackLocal}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonSecondaryText}>Use Local AI Instead</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonCancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reason: {
    fontSize: 14,
    color: colors.textTertiary,
    lineHeight: 20,
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  privacyWarning: {
    backgroundColor: colors.errorBackground,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    marginBottom: 24,
  },
  privacyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.buttonPrimaryText,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  buttonCancel: {
    backgroundColor: 'transparent',
  },
  buttonCancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.error,
  },
});
