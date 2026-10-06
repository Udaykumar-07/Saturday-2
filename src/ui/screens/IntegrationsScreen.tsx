/**
 * Integrations & Privacy Screen for Saturday.
 *
 * Provides complete user control over:
 * - On-device Local AI model selection & inference engine
 * - Connected third-party services (Gmail, Calendar, Maps)
 * - Connection and Disconnection controls
 * - Privacy settings: Local AI preference, external model and agent permissions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';
import { IntegrationCard } from '../components/IntegrationCard';
import { LayaAISettingsSection } from '../components/LayaAISettingsSection';
import { useIntegrations } from '../../hooks/useIntegrations';
import { useLocalAI } from '../../hooks/useLocalAI';
import { ModelManagementScreen } from './ModelManagementScreen';

interface IntegrationsScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const IntegrationsScreen: React.FC<IntegrationsScreenProps> = ({
  visible,
  onClose,
}) => {
  const {
    services,
    privacyPolicy,
    updatePrivacyPolicy,
    connectService,
    disconnectService,
    loadingServiceId,
  } = useIntegrations();

  const {
    activeModel,
    allModels,
    selectModel,
    testInference,
  } = useLocalAI();

  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [showModelManagement, setShowModelManagement] = useState(false);

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings & Intelligence</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Section: Local AI Model & Engine */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>On-Device Local AI</Text>
              <View style={styles.activeBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.activeBadgeText}>Active & Ready</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Saturday runs intelligence locally on your device to preserve your privacy and execute instant phone actions.
            </Text>

            {/* Model Selector Cards */}
            <View style={styles.modelsContainer}>
              {allModels.length === 0 ? (
                <View style={styles.noModelsMessage}>
                  <Text style={styles.noModelsTitle}>No Models Downloaded</Text>
                  <Text style={styles.noModelsText}>
                    Download a model using the button below to start using local AI inference.
                  </Text>
                </View>
              ) : (
                allModels.map((m) => {
                  const isSelected = activeModel ? m.id === activeModel.id : false;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.modelCard,
                        isSelected && styles.modelCardSelected,
                      ]}
                      onPress={() => selectModel(m.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.modelCardHeader}>
                        <View style={styles.modelTitleContainer}>
                          <Text style={styles.modelName}>{m.name}</Text>
                          {m.recommended && (
                            <View style={styles.recommendedBadge}>
                              <Text style={styles.recommendedText}>Recommended</Text>
                            </View>
                          )}
                        </View>
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected && <View style={styles.radioInnerCircle} />}
                        </View>
                      </View>

                      <Text style={styles.modelDescription}>{m.description}</Text>

                      <View style={styles.modelMetaRow}>
                        <Text style={styles.modelMetaTag}>Parameters: {m.parameters}</Text>
                        <Text style={styles.modelMetaTag}>Size: {m.diskSize}</Text>
                        <Text style={styles.modelMetaTag}>Speed: {m.speedRating}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Model Management Button */}
            <TouchableOpacity
              style={styles.manageModelsButton}
              onPress={() => setShowModelManagement(true)}
            >
              <Text style={styles.manageModelsButtonText}>📦 Download & Manage Models</Text>
            </TouchableOpacity>

            {/* Test Inference Button */}
            <View style={styles.testContainer}>
              <TouchableOpacity
                style={styles.testButton}
                disabled={testing}
                onPress={async () => {
                  setTesting(true);
                  try {
                    const reply = await testInference('What can you do?');
                    setTestResult(reply);
                  } catch (e) {
                    setTestResult('Test failed: ' + String(e));
                  } finally {
                    setTesting(false);
                  }
                }}
              >
                <Text style={styles.testButtonText}>
                  {testing ? 'Testing Local Engine...' : '⚡ Test Local AI Inference'}
                </Text>
              </TouchableOpacity>
              {testResult && (
                <View style={styles.testResultBox}>
                  <Text style={styles.testResultLabel}>Response from {activeModel?.name || 'Local AI'}:</Text>
                  <Text style={styles.testResultText}>{testResult}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Section: On-Device Laya Decision Router */}
          <LayaAISettingsSection />

          {/* Section: Connected Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connected Services</Text>
            <Text style={styles.sectionSubtitle}>
              Connect external services to allow Saturday to safely access your data.
            </Text>

            {services.map((service) => (
              <IntegrationCard
                key={service.id}
                service={service}
                onConnect={connectService}
                onDisconnect={disconnectService}
                loading={loadingServiceId === service.id}
              />
            ))}
          </View>

          {/* Section: Privacy Controls */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy Controls</Text>
            <Text style={styles.sectionSubtitle}>
              Control how Saturday shares data with external intelligence and tools.
            </Text>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Prefer Local AI</Text>
                <Text style={styles.settingDescription}>
                  Run requests on-device whenever an on-device model is capable.
                </Text>
              </View>
              <Switch
                value={privacyPolicy.strictLocalOnly}
                onValueChange={(val) => updatePrivacyPolicy({ strictLocalOnly: val })}
                trackColor={{ false: colors.surfaceBorder, true: colors.accent }}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Allow External AI Models</Text>
                <Text style={styles.settingDescription}>
                  Permit cloud AI providers for complex reasoning and document analysis.
                </Text>
              </View>
              <Switch
                value={privacyPolicy.allowExternalAI}
                onValueChange={(val) => updatePrivacyPolicy({ allowExternalAI: val })}
                trackColor={{ false: colors.surfaceBorder, true: colors.accent }}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Allow External Agents</Text>
                <Text style={styles.settingDescription}>
                  Permit specialized agents to perform deep research and tasks.
                </Text>
              </View>
              <Switch
                value={privacyPolicy.allowExternalAgents}
                onValueChange={(val) => updatePrivacyPolicy({ allowExternalAgents: val })}
                trackColor={{ false: colors.surfaceBorder, true: colors.accent }}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Ask Before Sharing Personal Data</Text>
                <Text style={styles.settingDescription}>
                  Require explicit confirmation before sending emails or sensitive info externally.
                </Text>
              </View>
              <Switch
                value={privacyPolicy.alwaysAskBeforeSharingPersonalData}
                onValueChange={(val) =>
                  updatePrivacyPolicy({ alwaysAskBeforeSharingPersonalData: val })
                }
                trackColor={{ false: colors.surfaceBorder, true: colors.accent }}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>

      {/* Model Management Modal */}
      <Modal visible={showModelManagement} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Model Management</Text>
            <TouchableOpacity onPress={() => setShowModelManagement(false)} style={styles.closeButton}>
              <Text style={styles.closeText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ModelManagementScreen />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  closeText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34c759',
    marginRight: 6,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34c759',
  },
  modelsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  modelCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 14,
  },
  modelCardSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  modelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  modelTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modelName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recommendedBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.accent,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  modelDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  modelMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modelMetaTag: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  testContainer: {
    marginTop: 4,
  },
  testButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  testResultBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  testResultLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  testResultText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  manageModelsButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  manageModelsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  noModelsMessage: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 20,
    alignItems: 'center',
  },
  noModelsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  noModelsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
