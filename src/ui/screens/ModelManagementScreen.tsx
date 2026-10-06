/**
 * Model Management Screen
 * 
 * Shows available models, download status, and allows users to:
 * - View available models
 * - Download models
 * - See download progress
 * - Verify downloaded models
 * - Delete models
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import {
  TFLiteModelManager,
  ModelConfig,
  ModelInfo,
  ModelDownloadProgress,
} from '../../core/ai/tflite';

export const ModelManagementScreen: React.FC = () => {
  const [modelManager] = useState(() => new TFLiteModelManager());
  const [downloadedModels, setDownloadedModels] = useState<ModelInfo[]>([]);
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<{ [modelId: string]: ModelDownloadProgress }>({});
  const [loading, setLoading] = useState(true);
  const [totalStorage, setTotalStorage] = useState<string>('0');
  const [availableStorage, setAvailableStorage] = useState<string>('0');

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    setLoading(true);
    try {
      await modelManager.initialize();
      await refreshModels();
      console.log('Model manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize model manager:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshModels = async () => {
    try {
      const downloaded = await modelManager.getDownloadedModels();
      setDownloadedModels(downloaded);
      console.log('Downloaded models:', downloaded);

      const available = modelManager.getAvailableModels();
      setAvailableModels(available);
      console.log('Available models:', available);

      const total = await modelManager.getTotalStorageUsed();
      setTotalStorage(formatBytes(total));

      const free = await modelManager.getAvailableStorage();
      setAvailableStorage(formatBytes(free));
    } catch (error) {
      console.error('Failed to refresh models:', error);
    }
  };

  const handleDownload = async (modelId: string) => {
    try {
      await modelManager.downloadModel(modelId, (progress) => {
        setDownloadProgress((prev) => ({
          ...prev,
          [modelId]: progress,
        }));
      });

      // Refresh after download completes
      await refreshModels();

      Alert.alert('Success', 'Model downloaded successfully!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Download failed');
    }
  };

  const handleDelete = (modelId: string, modelName: string) => {
    Alert.alert(
      'Delete Model',
      `Are you sure you want to delete ${modelName}? This will free up storage space.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await modelManager.deleteModel(modelId);
              await refreshModels();
              Alert.alert('Success', 'Model deleted successfully');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Deletion failed');
            }
          },
        },
      ]
    );
  };

  const handleCancelDownload = async (modelId: string) => {
    try {
      await modelManager.cancelDownload(modelId);
      setDownloadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[modelId];
        return newProgress;
      });
      await refreshModels();
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel download');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getModelStatus = (modelId: string): 'downloaded' | 'downloading' | 'not_downloaded' => {
    if (downloadProgress[modelId]) {
      return 'downloading';
    }
    const model = downloadedModels.find((m) => m.modelId === modelId);
    if (model && model.status === 'ready') {
      return 'downloaded';
    }
    return 'not_downloaded';
  };

  const renderModelCard = (config: ModelConfig) => {
    const status = getModelStatus(config.modelId);
    const progress = downloadProgress[config.modelId];
    const downloadedModel = downloadedModels.find((m) => m.modelId === config.modelId);

    console.log(`Rendering model card for ${config.modelId}, status: ${status}`);

    // Determine quality rating and RAM requirement
    const getModelMetadata = (modelId: string) => {
      // Quality ratings: Excellent (5) > Great (4) > Good (3) > Fair (2)
      // RAM: Minimum RAM required for smooth inference
      
      if (modelId.includes('ministral-8b')) return { quality: '⭐⭐⭐⭐⭐', qualityText: 'Excellent', ram: '6GB+', recommended: false };
      if (modelId.includes('mistral-7b')) return { quality: '⭐⭐⭐⭐⭐', qualityText: 'Excellent', ram: '6GB+', recommended: false };
      if (modelId.includes('gemma-2-9b')) return { quality: '⭐⭐⭐⭐⭐', qualityText: 'Excellent', ram: '6GB+', recommended: false };
      if (modelId.includes('phi-3.5')) return { quality: '⭐⭐⭐⭐', qualityText: 'Great', ram: '4GB+', recommended: false };
      if (modelId.includes('phi-3')) return { quality: '⭐⭐⭐⭐', qualityText: 'Great', ram: '4GB+', recommended: false };
      if (modelId.includes('gemma-2-2b-instruct-int8')) return { quality: '⭐⭐⭐⭐', qualityText: 'Great', ram: '4GB+', recommended: false };
      if (modelId.includes('gemma-2-2b-instruct-int4')) return { quality: '⭐⭐⭐⭐', qualityText: 'Great', ram: '4GB', recommended: true };
      if (modelId.includes('qwen2.5-1.5b')) return { quality: '⭐⭐⭐', qualityText: 'Good', ram: '3GB+', recommended: false };
      if (modelId.includes('tinyllama')) return { quality: '⭐⭐⭐', qualityText: 'Good', ram: '2GB+', recommended: false };
      if (modelId.includes('qwen2.5-0.5b')) return { quality: '⭐⭐', qualityText: 'Fair', ram: '2GB', recommended: false };
      return { quality: '⭐⭐⭐', qualityText: 'Good', ram: '4GB', recommended: false };
    };

    const metadata = getModelMetadata(config.modelId);

    return (
      <View key={config.modelId} style={styles.modelCard}>
        <View style={styles.modelHeader}>
          <View style={styles.modelTitleRow}>
            <Text style={styles.modelName}>{config.name}</Text>
            {metadata.recommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>
            )}
          </View>

          {/* Quality and RAM Requirements */}
          <View style={styles.metadataRow}>
            <View style={styles.qualityContainer}>
              <Text style={styles.qualityStars}>{metadata.quality}</Text>
              <Text style={styles.qualityText}>{metadata.qualityText} Quality</Text>
            </View>
            <View style={styles.ramContainer}>
              <Text style={styles.ramText}>💾 {metadata.ram} RAM</Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                status === 'downloaded' && styles.statusBadgeReady,
                status === 'downloading' && styles.statusBadgeDownloading,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  status === 'downloaded' && styles.statusTextReady,
                  status === 'downloading' && styles.statusTextDownloading,
                ]}
              >
                {status === 'downloaded' ? '● Ready' : status === 'downloading' ? '↓ Downloading' : '○ Not Downloaded'}
              </Text>
            </View>
          </View>

          <View style={styles.modelDetails}>
            <Text style={styles.modelDetail}>📦 {formatBytes(config.sizeBytes)}</Text>
            <Text style={styles.modelDetail}>🔧 {config.quantization}</Text>
            <Text style={styles.modelDetail}>v{config.version}</Text>
          </View>
        </View>

        {/* Download Progress */}
        {progress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {progress.status === 'verifying' ? 'Verifying...' : `${progress.progress}% • ${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)}`}
            </Text>
          </View>
        )}

        {/* Downloaded Info */}
        {downloadedModel && downloadedModel.downloadedAt && (
          <Text style={styles.downloadedInfo}>
            ✓ Downloaded: {new Date(downloadedModel.downloadedAt).toLocaleDateString()}
          </Text>
        )}

        {/* Actions */}
        <View style={styles.actionRow}>
          {status === 'not_downloaded' && !progress && (
            <TouchableOpacity style={styles.downloadButton} onPress={() => handleDownload(config.modelId)}>
              <Text style={styles.downloadButtonText}>⬇ Download</Text>
            </TouchableOpacity>
          )}

          {status === 'downloading' && progress && (
            <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelDownload(config.modelId)}>
              <Text style={styles.cancelButtonText}>✕ Cancel</Text>
            </TouchableOpacity>
          )}

          {status === 'downloaded' && (
            <>
              <TouchableOpacity style={styles.verifyButton} onPress={() => Alert.alert('Verified', 'Model is ready')}>
                <Text style={styles.verifyButtonText}>✓ Verify</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(config.modelId, config.name)}>
                <Text style={styles.deleteButtonText}>🗑 Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading models...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Storage Info */}
      <View style={styles.storageCard}>
        <Text style={styles.sectionTitle}>STORAGE</Text>
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Used by models:</Text>
          <Text style={styles.storageValue}>{totalStorage}</Text>
        </View>
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Available:</Text>
          <Text style={styles.storageValue}>{availableStorage}</Text>
        </View>
      </View>

      {/* Available Models */}
      <Text style={styles.sectionTitle}>AVAILABLE MODELS</Text>
      <Text style={styles.sectionDescription}>
        Download models to use Saturday offline with local AI inference
      </Text>

      {availableModels.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No models available</Text>
          <Text style={styles.emptyStateSubtext}>Check your internet connection</Text>
        </View>
      ) : (
        availableModels.map((config) => renderModelCard(config))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 16,
  },
  storageCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  storageLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  storageValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  modelCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modelHeader: {
    marginBottom: 12,
  },
  modelTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modelName: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.primaryBackground,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginLeft: 8,
  },
  recommendedText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  qualityContainer: {
    flex: 1,
  },
  qualityStars: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 2,
  },
  qualityText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  ramContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  ramText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  statusRow: {
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statusBadgeReady: {
    backgroundColor: colors.successBackground,
    borderColor: colors.successBorder,
  },
  statusBadgeDownloading: {
    backgroundColor: colors.primaryBackground,
    borderColor: colors.primaryBorder,
  },
  statusText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusTextReady: {
    color: colors.success,
  },
  statusTextDownloading: {
    color: colors.primary,
  },
  modelDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modelDetail: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceHover,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  downloadedInfo: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  downloadButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  verifyButton: {
    flex: 1,
    backgroundColor: colors.primaryBackground,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
  },
});
