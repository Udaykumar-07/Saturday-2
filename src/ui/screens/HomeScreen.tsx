/**
 * Main Saturday Home Screen.
 * Minimalist, premium, local-first personal AI interface.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useConversation } from '../../hooks/useConversation';
import { usePersonality } from '../../hooks/usePersonality';
import { colors } from '../theme/colors';
import {
  Header,
  MessageBubble,
  ChatInput,
  LoadingIndicator,
  ErrorDisplay,
  EmptyState,
  ConversationListModal,
  PersonalityModal,
} from '../components';

export const HomeScreen: React.FC = () => {
  const {
    conversation,
    conversationsList,
    isLoading,
    isSending,
    error,
    createNewConversation,
    selectConversation,
    sendMessage,
    deleteConversation,
    clearError,
  } = useConversation();

  const { personality, updatePersonality, resetPersonality } = usePersonality();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to end on new messages
  useEffect(() => {
    if (conversation?.messages && conversation.messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversation?.messages?.length, isSending]);

  const messages = conversation?.messages || [];
  const hasMessages = messages.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Minimal Header */}
        <Header
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onNewConversation={() => createNewConversation()}
        />

        {/* Non-intrusive Error Display */}
        {error && (
          <ErrorDisplay
            message={error}
            onDismiss={clearError}
            onRetry={hasMessages ? () => sendMessage(messages[messages.length - 1].content) : undefined}
          />
        )}

        {/* Content Area */}
        <View style={styles.content}>
          {hasMessages ? (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MessageBubble message={item} />}
              contentContainerStyle={styles.messagesList}
              ListFooterComponent={isSending ? <LoadingIndicator /> : null}
            />
          ) : (
            <EmptyState onSelectPrompt={(prompt) => sendMessage(prompt)} />
          )}
        </View>

        {/* Chat Input */}
        <ChatInput
          onSend={(text) => sendMessage(text)}
          isSending={isSending}
        />

        {/* Conversation History Drawer */}
        <ConversationListModal
          visible={isHistoryOpen}
          conversations={conversationsList}
          activeId={conversation?.id}
          onClose={() => setIsHistoryOpen(false)}
          onSelect={(id) => selectConversation(id)}
          onNew={() => createNewConversation()}
          onDelete={(id) => deleteConversation(id)}
        />

        {/* Personality & Preferences Modal */}
        <PersonalityModal
          visible={isSettingsOpen}
          personality={personality}
          onClose={() => setIsSettingsOpen(false)}
          onSave={updatePersonality}
          onReset={resetPersonality}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 16,
  },
});
