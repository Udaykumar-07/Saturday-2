import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { MicIcon, ArrowUpIcon } from './icons';

interface ChatInputProps {
  onSend: (message: string) => void;
  isSending?: boolean;
  placeholder?: string;
  initialValue?: string;
  onCancelEdit?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isSending = false,
  placeholder = 'What do you want to get done?',
  initialValue = '',
  onCancelEdit,
}) => {
  const [text, setText] = useState(initialValue);
  const insets = useSafeAreaInsets();
  const isEditMode = Boolean(initialValue && onCancelEdit);

  // Update text when initialValue changes (for edit mode)
  React.useEffect(() => {
    if (initialValue) {
      setText(initialValue);
    }
  }, [initialValue]);

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
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {/* Edit mode indicator */}
      {isEditMode && (
        <View style={styles.editModeBar}>
          <Text style={styles.editModeText}>Editing message</Text>
          <TouchableOpacity onPress={onCancelEdit} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

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
          activeOpacity={0.6}
          accessibilityLabel="Voice input (coming soon)"
          accessibilityRole="button"
        >
          <MicIcon size={17} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            canSend ? styles.sendButtonActive : styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.8}
          accessibilityLabel="Send message"
          accessibilityRole="button"
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
          ) : (
            <ArrowUpIcon
              size={15}
              color={canSend ? colors.buttonPrimaryText : colors.buttonDisabledText}
            />
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
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  editModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    backgroundColor: colors.accent + '15',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  editModeText: {
    ...typography.caption,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  cancelButtonText: {
    ...typography.caption,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 4,
    minHeight: 48,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 6,
    fontSize: 15,
  },
  micButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: colors.buttonPrimary,
  },
  sendButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
});
