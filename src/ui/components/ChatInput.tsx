/**
 * Chat input component.
 * Text input, microphone button placeholder, send button.
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface ChatInputProps {
  onSend: (message: string) => void;
  isSending?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isSending = false,
  placeholder = 'What do you want to get done?',
}) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed && !isSending) {
      onSend(trimmed);
      setText('');
    }
  };

  const handleMicPress = () => {
    Alert.alert(
      'Voice Input',
      'Voice input is planned for a future update with on-device speech-to-text.',
      [{ text: 'OK' }]
    );
  };

  const canSend = text.trim().length > 0 && !isSending;

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textPlaceholder}
          multiline
          maxLength={2000}
          editable={!isSending}
          returnKeyType="default"
        />

        {/* Microphone placeholder button */}
        <TouchableOpacity
          style={styles.micButton}
          onPress={handleMicPress}
          accessibilityLabel="Voice input (coming soon)"
          accessibilityRole="button"
        >
          <View style={styles.micIcon}>
            <View style={styles.micBody} />
            <View style={styles.micBase} />
          </View>
        </TouchableOpacity>

        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            canSend ? styles.sendButtonActive : styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!canSend}
          accessibilityLabel="Send message"
          accessibilityRole="button"
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
          ) : (
            <Text
              style={[
                styles.sendArrow,
                { color: canSend ? colors.buttonPrimaryText : colors.buttonDisabledText },
              ]}
            >
              ↑
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 48,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 8,
  },
  micButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 4,
  },
  micIcon: {
    alignItems: 'center',
  },
  micBody: {
    width: 8,
    height: 12,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
    backgroundColor: 'transparent',
  },
  micBase: {
    width: 6,
    height: 2,
    backgroundColor: colors.textTertiary,
    marginTop: 2,
    borderRadius: 1,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sendButtonActive: {
    backgroundColor: colors.buttonPrimary,
  },
  sendButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  sendArrow: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
});
