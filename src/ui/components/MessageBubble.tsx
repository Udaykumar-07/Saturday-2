/**
 * Message bubble component.
 * Minimalist design distinguishing user vs assistant with subtle typography.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../../core/types/conversation';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { formatTimeOnly } from '../../utils/date';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {!isUser && (
        <View style={styles.assistantHeader}>
          <Text style={styles.assistantLabel}>SATURDAY</Text>
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={[styles.content, isUser ? styles.userContent : styles.assistantContent]}>
          {message.content}
        </Text>
      </View>

      <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
        {formatTimeOnly(message.timestamp)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  assistantHeader: {
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  assistantLabel: {
    ...typography.micro,
    color: colors.textTertiary,
    letterSpacing: 2,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderWidth: 1,
    borderColor: colors.userBubbleBorder,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderBottomLeftRadius: 4,
  },
  content: {
    ...typography.body,
  },
  userContent: {
    color: colors.textPrimary,
  },
  assistantContent: {
    color: colors.textPrimary,
    lineHeight: 24,
  },
  timestamp: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 4,
  },
  userTimestamp: {
    marginRight: 4,
  },
  assistantTimestamp: {
    marginLeft: 4,
  },
});
