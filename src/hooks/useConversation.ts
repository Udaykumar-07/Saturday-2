/**
 * Hook for managing conversations and chat interaction.
 * Bridges ConversationService to React components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Conversation, ConversationMetadata, Message } from '../core/types/conversation';
import { getServices } from '../services/container';

export interface UseConversationReturn {
  conversation: Conversation | null;
  conversationsList: ConversationMetadata[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  createNewConversation: (title?: string) => Promise<Conversation>;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  refreshList: () => Promise<void>;
  clearError: () => void;
}

export function useConversation(initialConversationId?: string): UseConversationReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversationsList, setConversationsList] = useState<ConversationMetadata[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeIdRef = useRef<string | null>(initialConversationId || null);

  const services = getServices();

  const refreshList = useCallback(async () => {
    try {
      const list = await services.conversationService.listAll();
      setConversationsList(list);
    } catch (err) {
      console.error('Failed to load conversation list:', err);
    }
  }, [services]);

  const selectConversation = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const conv = await services.conversationService.load(id);
        if (conv) {
          setConversation(conv);
          activeIdRef.current = id;
        } else {
          setError('Conversation not found.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversation.');
      } finally {
        setIsLoading(false);
      }
    },
    [services]
  );

  const createNewConversation = useCallback(
    async (title?: string): Promise<Conversation> => {
      try {
        setIsLoading(true);
        setError(null);
        const newConv = await services.conversationService.create(title);
        setConversation(newConv);
        activeIdRef.current = newConv.id;
        await refreshList();
        return newConv;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create conversation.';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [services, refreshList]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      try {
        setIsSending(true);
        setError(null);

        let currentConv = conversation;
        if (!currentConv) {
          currentConv = await createNewConversation();
        }

        // Optimistically add user message to UI
        const tempUserMsg: Message = {
          id: `temp_${Date.now()}`,
          role: 'user',
          content: trimmed,
          timestamp: Date.now(),
        };

        setConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, tempUserMsg],
                updatedAt: Date.now(),
              }
            : null
        );

        // Send through service
        const { userMessage, assistantMessage } =
          await services.conversationService.sendMessage(currentConv.id, trimmed);

        // Update with finalized messages
        setConversation((prev) => {
          if (!prev) return null;
          const filtered = prev.messages.filter((m) => m.id !== tempUserMsg.id);
          return {
            ...prev,
            messages: [...filtered, userMessage, assistantMessage],
            updatedAt: Date.now(),
          };
        });

        await refreshList();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message.');
      } finally {
        setIsSending(false);
      }
    },
    [conversation, createNewConversation, refreshList, services]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await services.conversationService.delete(id);
        if (conversation?.id === id) {
          setConversation(null);
          activeIdRef.current = null;
        }
        await refreshList();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete conversation.');
      }
    },
    [conversation, refreshList, services]
  );

  const clearError = useCallback(() => setError(null), []);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      try {
        const list = await services.conversationService.listAll();
        if (!isMounted) return;
        setConversationsList(list);

        if (activeIdRef.current) {
          const conv = await services.conversationService.load(activeIdRef.current);
          if (isMounted && conv) {
            setConversation(conv);
          }
        } else if (list.length > 0) {
          // Load most recent conversation
          const recentConv = await services.conversationService.load(list[0].id);
          if (isMounted && recentConv) {
            setConversation(recentConv);
            activeIdRef.current = recentConv.id;
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Initialization failed.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [services]);

  return {
    conversation,
    conversationsList,
    isLoading,
    isSending,
    error,
    createNewConversation,
    selectConversation,
    sendMessage,
    deleteConversation,
    refreshList,
    clearError,
  };
}
