/**
 * Personality & Preferences Modal.
 * Simple, human-friendly configuration for how Saturday communicates.
 * Strictly NO model selectors or technical jargon.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {
  PersonalityProfile,
  VerbosityLevel,
  ToneLevel,
  InitiativeLevel,
} from '../../core/types/personality';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface PersonalityModalProps {
  visible: boolean;
  personality: PersonalityProfile;
  onClose: () => void;
  onSave: (updates: Partial<PersonalityProfile>) => Promise<void>;
  onReset: () => Promise<void>;
}

export const PersonalityModal: React.FC<PersonalityModalProps> = ({
  visible,
  personality,
  onClose,
  onSave,
  onReset,
}) => {
  const [verbosity, setVerbosity] = useState<VerbosityLevel>(personality.verbosity);
  const [tone, setTone] = useState<ToneLevel>(personality.tone);
  const [initiative, setInitiative] = useState<InitiativeLevel>(personality.initiative);
  const [userName, setUserName] = useState<string>(personality.userName || '');

  useEffect(() => {
    setVerbosity(personality.verbosity);
    setTone(personality.tone);
    setInitiative(personality.initiative);
    setUserName(personality.userName || '');
  }, [personality, visible]);

  const handleSave = async () => {
    await onSave({
      verbosity,
      tone,
      initiative,
      userName: userName.trim() || undefined,
    });
    onClose();
  };

  const handleReset = async () => {
    await onReset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalCard}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Preferences</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.sectionSubtitle}>
                Customize how Saturday communicates with you.
              </Text>

              {/* User Name */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>YOUR NAME</Text>
                <TextInput
                  style={styles.input}
                  value={userName}
                  onChangeText={setUserName}
                  placeholder="How should Saturday address you?"
                  placeholderTextColor={colors.textPlaceholder}
                />
              </View>

              {/* Verbosity */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>RESPONSE LENGTH</Text>
                <View style={styles.segmentRow}>
                  {(['concise', 'balanced', 'detailed'] as VerbosityLevel[]).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.segmentButton,
                        verbosity === level && styles.segmentButtonActive,
                      ]}
                      onPress={() => setVerbosity(level)}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          verbosity === level && styles.segmentTextActive,
                        ]}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Tone */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>TONE</Text>
                <View style={styles.segmentRow}>
                  {(['casual', 'neutral', 'professional'] as ToneLevel[]).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.segmentButton,
                        tone === level && styles.segmentButtonActive,
                      ]}
                      onPress={() => setTone(level)}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          tone === level && styles.segmentTextActive,
                        ]}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Initiative */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>SUGGESTIONS & INITIATIVE</Text>
                <View style={styles.segmentRow}>
                  {(['low', 'balanced', 'high'] as InitiativeLevel[]).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.segmentButton,
                        initiative === level && styles.segmentButtonActive,
                      ]}
                      onPress={() => setInitiative(level)}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          initiative === level && styles.segmentTextActive,
                        ]}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Reset to Default */}
              <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Text style={styles.resetText}>Reset to Default</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save Preferences</Text>
              </TouchableOpacity>
            </View>
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
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.surfaceBorder,
    maxHeight: '85%',
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    ...typography.micro,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
    ...typography.body,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentButtonActive: {
    backgroundColor: colors.accentMuted,
  },
  segmentText: {
    ...typography.captionMedium,
    color: colors.textTertiary,
  },
  segmentTextActive: {
    color: colors.textPrimary,
  },
  resetButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  resetText: {
    ...typography.caption,
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  saveButton: {
    backgroundColor: colors.buttonPrimary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.bodyMedium,
    color: colors.buttonPrimaryText,
    fontWeight: '600',
  },
});
