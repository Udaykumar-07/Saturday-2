/**
 * Integrations & Privacy Screen for Saturday.
 *
 * Provides complete user control over:
 * - On-device Local AI model selection & inference engine
 * - Connected third-party services (Gmail, Calendar, Maps)
 * - Connection and Disconnection controls
 * - Privacy settings: Local AI preference, external model and agent permissions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
// import { Picker } from '@react-native-picker/picker'; // Temporarily disabled for testing
import { colors } from '../theme/colors';
import { IntegrationCard } from '../components/IntegrationCard';
import { LayaAISettingsSection } from '../components/LayaAISettingsSection';
import { useIntegrations } from '../../hooks/useIntegrations';
import { useLocalAI } from '../../hooks/useLocalAI';
import { useExternalProviders } from '../../hooks/useExternalProviders';
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

  const {
    providers: externalProviders,
    connectProvider,
    disconnectProvider,
    testConnection,
    fetchAvailableModels,
    switchModel,
    getCurrentModel,
    loading: externalLoading,
    error: externalError,
  } = useExternalProviders();

  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [showModelManagement, setShowModelManagement] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<Array<{ name: string; displayName: string; description: string }>>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testConnectionResult, setTestConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [currentModels, setCurrentModels] = useState<Record<string, string>>({});
  const [showModelSwitcher, setShowModelSwitcher] = useState<string | null>(null);

  // Load current model selections when providers change
  useEffect(() => {
    const loadCurrentModels = async () => {
      const models: Record<string, string> = {};
      for (const provider of externalProviders) {
        if (provider.connected) {
          const currentModel = await getCurrentModel(provider.id);
          if (currentModel) {
            models[provider.id] = currentModel;
          }
        }
      }
      setCurrentModels(models);
    };
    loadCurrentModels();
  }, [externalProviders]);

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

          {/* Section: External AI Providers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>External AI Providers</Text>
            <Text style={styles.sectionSubtitle}>
              Connect AI providers for advanced reasoning and multi-step tasks.
            </Text>

            {externalProviders.map((provider) => (
              <View key={provider.id} style={styles.providerCard}>
                <View style={styles.providerHeader}>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName}>{provider.name}</Text>
                    <Text style={styles.providerModels}>
                      {provider.connected && currentModels[provider.id] 
                        ? `Current: ${currentModels[provider.id]}`
                        : provider.models.join(', ')}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    provider.connected && styles.statusBadgeConnected,
                    provider.connected && !provider.valid && styles.statusBadgeInvalid,
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      provider.connected && styles.statusBadgeTextConnected,
                      provider.connected && !provider.valid && styles.statusBadgeTextInvalid,
                    ]}>
                      {provider.connected ? (provider.valid ? 'Connected' : 'Invalid Key') : 'Not Connected'}
                    </Text>
                  </View>
                </View>

                {provider.connected ? (
                  <>
                    {/* Show available models dropdown */}
                    {provider.models.length > 1 && (
                      <View style={styles.modelSwitcherContainer}>
                        <Text style={styles.modelSwitcherLabel}>Available Models:</Text>
                        <View style={styles.modelButtonsContainer}>
                          {provider.models.map((model) => (
                            <TouchableOpacity
                              key={model}
                              style={[
                                styles.modelButton,
                                currentModels[provider.id] === model && styles.modelButtonSelected,
                              ]}
                              onPress={async () => {
                                // Get technical name from modelMap, fallback to display name
                                const technicalName = provider.modelMap?.[model] || model;
                                const success = await switchModel(provider.id, technicalName);
                                if (success) {
                                  setCurrentModels(prev => ({
                                    ...prev,
                                    [provider.id]: model, // Store display name for UI
                                  }));
                                }
                              }}
                            >
                              <Text style={[
                                styles.modelButtonText,
                                currentModels[provider.id] === model && styles.modelButtonTextSelected,
                              ]}>
                                {model}
                              </Text>
                              {currentModels[provider.id] === model && (
                                <Text style={styles.modelButtonCheck}>✓</Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    
                    <TouchableOpacity
                      style={styles.disconnectButton}
                      onPress={async () => {
                        await disconnectProvider(provider.id);
                      }}
                      disabled={externalLoading}
                    >
                      <Text style={styles.disconnectButtonText}>Disconnect</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.connectButton}
                    onPress={() => {
                      setConfigModalVisible(provider.id);
                      setApiKeyInput('');
                      setSelectedModel('');
                      setAvailableModels([]);
                      setTestConnectionResult(null);
                    }}
                    disabled={externalLoading}
                  >
                    <Text style={styles.connectButtonText}>Connect</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {externalError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{externalError}</Text>
              </View>
            )}
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

      {/* Provider Configuration Modals */}
      {externalProviders.map((provider) => {
        const getDocsUrl = (id: string) => {
          switch (id) {
            case 'openai_provider':
              return 'https://platform.openai.com/api-keys';
            case 'anthropic_provider':
              return 'https://console.anthropic.com/settings/keys';
            case 'google_gemini_provider':
              return 'https://aistudio.google.com/app/apikey';
            default:
              return '';
          }
        };

        return (
          <Modal
            key={provider.id}
            visible={configModalVisible === provider.id}
            animationType="slide"
            transparent={true}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.configModalContainer}>
                <View style={styles.configModalHeader}>
                  <Text style={styles.configModalTitle}>Connect {provider.name}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setConfigModalVisible(null);
                      setApiKeyInput('');
                      setSelectedModel('');
                      setAvailableModels([]);
                      setTestConnectionResult(null);
                    }}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeText}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.configModalScroll} contentContainerStyle={styles.configModalContent}>
                  <Text style={styles.configLabel}>API Key</Text>
                  <TextInput
                    style={styles.apiKeyInput}
                    placeholder="Paste your API key here"
                    placeholderTextColor={colors.textPlaceholder}
                    value={apiKeyInput}
                    onChangeText={setApiKeyInput}
                    secureTextEntry={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <TouchableOpacity
                    onPress={() => {
                      const url = getDocsUrl(provider.id);
                      if (url) {
                        Linking.openURL(url);
                      }
                    }}
                  >
                    <Text style={styles.docsLink}>
                      Get your API key from {provider.name} →
                    </Text>
                  </TouchableOpacity>

                  {/* Fetch Models Button (only for Gemini) */}
                  {provider.id === 'google_gemini_provider' && (
                    <>
                      <TouchableOpacity
                        style={[styles.fetchModelsButton, fetchingModels && styles.buttonDisabled]}
                        onPress={async () => {
                          if (!apiKeyInput.trim()) {
                            setTestConnectionResult({
                              success: false,
                              message: 'Please enter an API key first',
                            });
                            return;
                          }
                          setFetchingModels(true);
                          setTestConnectionResult(null);
                          try {
                            const models = await fetchAvailableModels(provider.id, apiKeyInput);
                            setAvailableModels(models);
                            if (models.length > 0) {
                              setSelectedModel(models[0].name); // Default to first model
                              setTestConnectionResult({
                                success: true,
                                message: `✓ Found ${models.length} available models`,
                              });
                            } else {
                              setTestConnectionResult({
                                success: false,
                                message: '✗ No models found. Check your API key.',
                              });
                            }
                          } catch (err) {
                            setTestConnectionResult({
                              success: false,
                              message: '✗ Failed to fetch models: ' + (err instanceof Error ? err.message : String(err)),
                            });
                          } finally {
                            setFetchingModels(false);
                          }
                        }}
                        disabled={fetchingModels}
                      >
                        {fetchingModels ? (
                          <ActivityIndicator color={colors.accent} size="small" />
                        ) : (
                          <Text style={styles.fetchModelsButtonText}>📋 Fetch Available Models</Text>
                        )}
                      </TouchableOpacity>

                      {/* Model Selection Picker */}
                      {availableModels.length > 0 && (
                        <View style={styles.modelSelectionContainer}>
                          <Text style={styles.configLabel}>Select Model</Text>
                          <View style={styles.modelPickerContainer}>
                            {availableModels.map((model) => (
                              <TouchableOpacity
                                key={model.name}
                                style={[
                                  styles.modelOption,
                                  selectedModel === model.name && styles.modelOptionSelected,
                                ]}
                                onPress={() => setSelectedModel(model.name)}
                              >
                                <View style={styles.modelOptionHeader}>
                                  <Text style={[
                                    styles.modelOptionName,
                                    selectedModel === model.name && styles.modelOptionNameSelected,
                                  ]}>
                                    {model.displayName}
                                  </Text>
                                  <View
                                    style={[
                                      styles.modelRadio,
                                      selectedModel === model.name && styles.modelRadioSelected,
                                    ]}
                                  >
                                    {selectedModel === model.name && (
                                      <View style={styles.modelRadioInner} />
                                    )}
                                  </View>
                                </View>
                                {model.description && (
                                  <Text style={styles.modelOptionDescription}>
                                    {model.description}
                                  </Text>
                                )}
                                <Text style={styles.modelOptionId}>ID: {model.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </>
                  )}

                  <View style={styles.privacyNotice}>
                    <Text style={styles.privacyNoticeText}>
                      🔒 Your API key is stored securely in Android Keystore and never shared.
                    </Text>
                  </View>

                  {testConnectionResult && (
                    <View style={[
                      styles.providerTestResultBox,
                      testConnectionResult.success ? styles.testResultSuccess : styles.testResultError,
                    ]}>
                      <Text style={[
                        styles.providerTestResultText,
                        testConnectionResult.success ? styles.testResultTextSuccess : styles.testResultTextError,
                      ]}>
                        {testConnectionResult.message}
                      </Text>
                    </View>
                  )}

                  <View style={styles.configActions}>
                    <TouchableOpacity
                      style={[styles.testButton, isTesting && styles.buttonDisabled]}
                      onPress={async () => {
                        if (!apiKeyInput.trim()) {
                          setTestConnectionResult({
                            success: false,
                            message: 'Please enter an API key',
                          });
                          return;
                        }
                        setIsTesting(true);
                        setTestConnectionResult(null);
                        try {
                          // Store key temporarily to test
                          await connectProvider(provider.id, apiKeyInput);
                          const result = await testConnection(provider.id);
                          setTestConnectionResult({
                            success: result,
                            message: result ? '✓ Connection successful!' : '✗ Connection failed. Check your API key.',
                          });
                        } catch (err) {
                          setTestConnectionResult({
                            success: false,
                            message: '✗ Connection failed: ' + (err instanceof Error ? err.message : String(err)),
                          });
                        } finally {
                          setIsTesting(false);
                        }
                      }}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <ActivityIndicator color={colors.accent} size="small" />
                      ) : (
                        <Text style={styles.testButtonText}>Test Connection</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.saveButton, externalLoading && styles.buttonDisabled]}
                      onPress={async () => {
                        if (!apiKeyInput.trim()) {
                          setTestConnectionResult({
                            success: false,
                            message: 'Please enter an API key',
                          });
                          return;
                        }
                        
                        // For Gemini, require model selection
                        if (provider.id === 'google_gemini_provider' && availableModels.length > 0 && !selectedModel) {
                          setTestConnectionResult({
                            success: false,
                            message: 'Please select a model',
                          });
                          return;
                        }
                        
                        const success = await connectProvider(provider.id, apiKeyInput, selectedModel);
                        if (success) {
                          setConfigModalVisible(null);
                          setApiKeyInput('');
                          setSelectedModel('');
                          setAvailableModels([]);
                          setTestConnectionResult(null);
                        }
                      }}
                      disabled={externalLoading}
                    >
                      {externalLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        );
      })}
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
  // External AI Provider Styles
  providerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 16,
    marginBottom: 12,
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  providerInfo: {
    flex: 1,
    marginRight: 12,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  providerModels: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  statusBadge: {
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statusBadgeConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusBadgeInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusBadgeTextConnected: {
    color: colors.success,
  },
  statusBadgeTextInvalid: {
    color: colors.error,
  },
  connectButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.buttonPrimaryText,
  },
  disconnectButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  errorBox: {
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    lineHeight: 18,
  },
  // Config Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  configModalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '60%',                          // Ensure sufficient height
    maxHeight: '85%',                          // Increased from 80%
  },
  configModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  configModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  configModalScroll: {
    flex: 1,
  },
  configModalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  apiKeyInput: {
    backgroundColor: colors.surfaceHover,    // Slightly lighter for visibility
    borderWidth: 2,                           // Thicker border for visibility
    borderColor: colors.accent,               // Accent color border
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,                      // More padding
    fontSize: 15,                             // Larger font
    color: colors.textPrimary,                // White text
    marginBottom: 12,
    minHeight: 50,                            // Ensure minimum height
  },
  docsLink: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: 16,
  },
  privacyNotice: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  privacyNoticeText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  providerTestResultBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  testResultSuccess: {
    backgroundColor: colors.successBackground,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  testResultError: {
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  providerTestResultText: {
    fontSize: 13,
    lineHeight: 18,
  },
  testResultTextSuccess: {
    color: colors.success,
  },
  testResultTextError: {
    color: colors.error,
  },
  configActions: {
    gap: 10,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.buttonPrimaryText,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  fetchModelsButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  fetchModelsButtonText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  modelSelectionContainer: {
    marginBottom: 16,
  },
  modelPickerContainer: {
    gap: 10,
  },
  modelOption: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    padding: 12,
  },
  modelOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  modelOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modelOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  modelOptionNameSelected: {
    color: colors.accent,
  },
  modelOptionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  modelOptionId: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: 'monospace',
  },
  modelRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modelRadioSelected: {
    borderColor: colors.accent,
  },
  modelRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  modelSwitcherContainer: {
    marginBottom: 12,
  },
  modelSwitcherLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  modelButtonsContainer: {
    gap: 8,
  },
  modelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelButtonSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  modelButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  modelButtonTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  modelButtonCheck: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: 'bold',
  },
});
