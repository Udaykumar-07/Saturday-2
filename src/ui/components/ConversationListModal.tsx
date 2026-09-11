/**
 * Conversation List Modal / Drawer.
 * Shows conversation history, lets user switch or delete conversations.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { ConversationMetadata } from '../../core/types/conversation';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { formatRelativeTime } from '../../utils/date';

interface ConversationListModalProps {
  visible: boolean;
  conversations: ConversationMetadata[];
  activeId?: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export const ConversationListModal: React.FC<ConversationListModalProps> = ({
  visible,
  conversations,
  activeId,
  onClose,
  onSelect,
  onNew,
  onDelete,
}) => {
  const renderItem = ({ item }: { item: ConversationMetadata }) => {
    const isActive = item.id === activeId;

    return (
      <TouchableOpacity
        style={[styles.item, isActive && styles.itemActive]}
        onPress={() => {
          onSelect(item.id);
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, isActive && styles.itemTitleActive]} numberOfLines={1}>
            {item.title || 'New Conversation'}
          </Text>
          {item.lastMessagePreview && (
            <Text style={styles.itemPreview} numberOfLines={1}>
              {item.lastMessagePreview}
            </Text>
          )}
          <Text style={styles.itemTime}>{formatRelativeTime(item.updatedAt)}</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}
          accessibilityLabel="Delete conversation"
        >
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Conversations</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.newButton}
              onPress={() => {
                onNew();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.newButtonText}>+ New Conversation</Text>
            </TouchableOpacity>

            {conversations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No conversations yet.</Text>
              </View>
            ) : (
              <FlatList
                data={conversations}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-start',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceBorder,
    width: '85%',
    maxWidth: 360,
    height: '100%',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 6,
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  newButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  newButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  listContent: {
    paddingBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceHover,
  },
  itemContent: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemTitleActive: {
    fontWeight: '600',
  },
  itemPreview: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemTime: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textTertiary,
  },
  deleteButton: {
    padding: 8,
  },
  deleteText: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
