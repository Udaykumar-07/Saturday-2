/**
 * Auth Prompt component.
 *
 * Renders an inline card asking the user to authenticate a service (e.g. Gmail).
 * Starts the authentication flow only after explicit user interaction (tapping "Connect" / "Sign in").
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

interface AuthPromptProps {
  serviceId: string;
  serviceName?: string;
  description?: string;
  onAuthenticate: (serviceId: string) => Promise<void>;
}

export const AuthPrompt: React.FC<AuthPromptProps> = ({
  serviceId,
  serviceName = 'Gmail',
  description = 'Saturday needs Gmail access to retrieve your messages.',
  onAuthenticate,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      await onAuthenticate(serviceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>✉</Text>
        </View>
        <Text style={styles.title}>Connect {serviceName}</Text>
      </View>

      <Text style={styles.description}>{description}</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, isAuthenticating && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={isAuthenticating}
      >
        {isAuthenticating ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Sign in with Google</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.privacyNote}>
        Saturday only requests read-only access. Your credentials are encrypted on-device.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconText: {
    fontSize: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#FF4444',
    marginBottom: 10,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  privacyNote: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
