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

import { AuthPrompt } from './AuthPrompt';

interface MessageBubbleProps {
  message: Message;
  onAuthenticate?: (serviceId: string) => Promise<void>;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onAuthenticate }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={[styles.container, styles.userContainer]}>
        <View style={styles.userBubble}>
          <Text style={styles.userContent}>{message.content}</Text>
        </View>
        <Text style={styles.userTimestamp}>
          {formatTimeOnly(message.timestamp)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.assistantContainer]}>
      <View style={styles.assistantHeader}>
        <View style={styles.assistantDot} />
        <Text style={styles.assistantLabel}>SATURDAY</Text>
      </View>

      <View style={styles.assistantBody}>
        <Text style={styles.assistantContent}>{message.content}</Text>
        {Boolean(message.metadata?.requiresAuth) && Boolean(onAuthenticate) && (
          <AuthPrompt
            serviceId={(message.metadata?.serviceId as string) || 'gmail'}
            description={(message.metadata?.prompt as string) || undefined}
            onAuthenticate={onAuthenticate!}
          />
        )}
      </View>

      <Text style={styles.assistantTimestamp}>
        {formatTimeOnly(message.timestamp)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
    width: '100%',
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
    paddingRight: 24,
  },
  assistantHeader: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assistantDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
  },
  assistantLabel: {
    ...typography.micro,
    color: colors.textTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
  },
  userBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.userBubble,
    borderWidth: 1,
    borderColor: colors.userBubbleBorder,
  },
  assistantBody: {
    width: '100%',
    paddingLeft: 2,
  },
  userContent: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  assistantContent: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  userTimestamp: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 4,
    marginRight: 4,
  },
  assistantTimestamp: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 6,
    marginLeft: 2,
  },
});
