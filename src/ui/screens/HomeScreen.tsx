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
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConversation } from '../../hooks/useConversation';
import { usePersonality } from '../../hooks/usePersonality';
import { useActions } from '../../hooks/useActions';
import { useIntegrations } from '../../hooks/useIntegrations';
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
  ActionConfirmation,
  ProviderRequestModal,
} from '../components';
import { IntegrationsScreen } from './IntegrationsScreen';
import { getServices } from '../../services/container';

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
  const { pendingAction, confirmAction, denyAction } = useActions();
  const { connectService } = useIntegrations();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [providerModalVisible, setProviderModalVisible] = useState(false);
  const [providerModalData, setProviderModalData] = useState<{
    providerName: string;
    reason: string;
    cost: string;
  } | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // Wire provider configuration callback
  useEffect(() => {
    const services = getServices();
    services.conversationService.setProviderConfigCallback(async (decision) => {
      const providerNameMap: Record<string, string> = {
        openai_provider: 'OpenAI',
        anthropic_provider: 'Anthropic',
        google_gemini_provider: 'Google Gemini',
      };
      const providerName = providerNameMap[decision.unconfiguredProviderId || ''] || 'External Provider';
      setProviderModalData({
        providerName,
        reason: decision.explanation || 'This provider offers better capabilities for your request.',
        cost: '~$0.01',
      });
      setProviderModalVisible(true);
    });
  }, []);

  // Auto-scroll to end on new messages
  useEffect(() => {
    if (conversation?.messages && conversation.messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversation?.messages?.length, isSending]);

  const insets = useSafeAreaInsets();

  const messages = conversation?.messages || [];
  const hasMessages = messages.length > 0;

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessage({ id: messageId, content });
  };

  const handleSendOrEdit = (text: string) => {
    if (editingMessage) {
      // For now, editing will just send a new message with the edited content
      // TODO: Implement proper message editing in conversation service
      sendMessage(`[Edited] ${text}`);
      setEditingMessage(null);
    } else {
      sendMessage(text);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
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
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  onAuthenticate={async (sId) => {
                    await connectService(sId);
                    await sendMessage('Show my latest emails');
                  }}
                  onEditMessage={handleEditMessage}
                />
              )}
              contentContainerStyle={styles.messagesList}
              ListFooterComponent={isSending ? <LoadingIndicator /> : null}
            />
          ) : (
            <EmptyState onSelectPrompt={(prompt) => sendMessage(prompt)} />
          )}
        </View>

        {/* Chat Input */}
        <ChatInput
          onSend={handleSendOrEdit}
          isSending={isSending}
          initialValue={editingMessage?.content}
          placeholder={editingMessage ? 'Edit your message...' : 'What do you want to get done?'}
          onCancelEdit={editingMessage ? handleCancelEdit : undefined}
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
          onOpenIntegrations={() => setIsIntegrationsOpen(true)}
        />

        {/* Action Confirmation Modal */}
        <ActionConfirmation
          action={pendingAction}
          visible={pendingAction !== null}
          onAllow={() => pendingAction && confirmAction(pendingAction.id)}
          onDeny={() => pendingAction && denyAction(pendingAction.id)}
        />

        {/* Integrations & Privacy Modal */}
        <IntegrationsScreen
          visible={isIntegrationsOpen}
          onClose={() => setIsIntegrationsOpen(false)}
        />

        {/* Provider Request Modal */}
        <ProviderRequestModal
          visible={providerModalVisible}
          providerName={providerModalData?.providerName || ''}
          providerReason={providerModalData?.reason || ''}
          estimatedCost={providerModalData?.cost || '~$0.01'}
          onConfigure={() => {
            setProviderModalVisible(false);
            setIsIntegrationsOpen(true);
          }}
          onFallbackLocal={() => {
            setProviderModalVisible(false);
            // Trigger local fallback - for now just close modal
            // Future: retry with local provider
          }}
          onCancel={() => setProviderModalVisible(false)}
        />
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 16,
  },
});
