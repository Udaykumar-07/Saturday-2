/**
 * Local AI Settings Section for Saturday.
 *
 * Implements Section 58 Local Model Settings:
 *
 * Model: Qwen 2.5 0.5B Instruct
 * Status: Ready offline
 * Storage: [X] MB
 * Installed: [Date]
 * Runtime: On-Device Embedded Local Runtime (Qwen 2.5)
 * Delete local model: available only through explicit user action
 * Re-download: available for recovery
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import {
  LocalModelStorage,
  ModelDownloadManager,
  LocalAIReadinessService,
  ModelManifest,
} from '../../core/ai/qwen';

interface LocalAISettingsSectionProps {
  storage: LocalModelStorage;
  downloadManager: ModelDownloadManager;
  readinessService: LocalAIReadinessService;
  onModelDeleted?: () => void;
  onRedownloadRequested?: () => void;
}

export const LocalAISettingsSection: React.FC<LocalAISettingsSectionProps> = ({
  storage,
  downloadManager,
  readinessService,
  onModelDeleted,
  onRedownloadRequested,
}) => {
  const [manifest, setManifest] = useState<ModelManifest | null>(null);
  const [isReadyOffline, setIsReadyOffline] = useState<boolean>(false);
  const [storageUsedMB, setStorageUsedMB] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  const [readinessDetails, setReadinessDetails] = useState<{
    modelInstalled: boolean;
    integrityVerified: boolean;
    runtimeReady: boolean;
    warmupPassed: boolean;
  } | null>(null);

  const loadModelDetails = async () => {
    setIsLoading(true);
    try {
      const modelManifest = await storage.getModelManifest('qwen2.5:0.5b');
      setManifest(modelManifest);

      const readiness = await readinessService.checkReadiness('qwen2.5:0.5b');
      setIsReadyOffline(readiness.ready);
      setReadinessDetails({
        modelInstalled: readiness.modelInstalled,
        integrityVerified: readiness.integrityVerified,
        runtimeReady: readiness.runtimeReady,
        warmupPassed: readiness.warmupPassed,
      });

      const bytes = await storage.getStorageUsedBytes();
      setStorageUsedMB((bytes / (1024 * 1024)).toFixed(0));
      
      // Clear verification status on reload
      setVerificationStatus('');
    } catch {
      // Ignore load error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModelDetails();
  }, [storage, downloadManager, readinessService]);

  const handleDeleteModel = () => {
    Alert.alert(
      'Delete Local AI Model',
      'Are you sure you want to delete the local Qwen model? Offline AI capabilities will be unavailable until re-downloaded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await storage.deleteModel('qwen2.5:0.5b', true);
              await loadModelDetails();
              onModelDeleted?.();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Deletion failed');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleRedownload = async () => {
    onRedownloadRequested?.();
    await downloadManager.startDownload({ modelId: 'qwen2.5:0.5b' });
    await loadModelDetails();
  };

  const handleVerifyLocalAI = async () => {
    setIsVerifying(true);
    setVerificationStatus('Verifying...');
    try {
      const readiness = await readinessService.checkReadiness('qwen2.5:0.5b');
      
      if (readiness.ready) {
        setVerificationStatus('✓ Local AI is ready for offline use');
      } else {
        const issues = readiness.issues.join(', ');
        setVerificationStatus(`⚠ Verification failed: ${issues}`);
      }
      
      // Update readiness details
      setIsReadyOffline(readiness.ready);
      setReadinessDetails({
        modelInstalled: readiness.modelInstalled,
        integrityVerified: readiness.integrityVerified,
        runtimeReady: readiness.runtimeReady,
        warmupPassed: readiness.warmupPassed,
      });
    } catch (err) {
      setVerificationStatus(
        `⚠ Verification error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  const installedDate = manifest?.installDate
    ? new Date(manifest.installDate).toLocaleDateString()
    : 'Not installed';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>LOCAL AI MODEL (QWEN)</Text>

      <View style={styles.card}>
        {/* Model ID */}
        <View style={styles.row}>
          <Text style={styles.label}>Model</Text>
          <Text style={styles.value}>
            {manifest ? manifest.name : 'Qwen 2.5 0.5B Instruct'}
          </Text>
        </View>

        {/* Status */}
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isReadyOffline ? colors.success : colors.error },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isReadyOffline ? colors.success : colors.error },
              ]}
            >
              {isReadyOffline ? 'Ready offline' : 'Not installed'}
            </Text>
          </View>
        </View>

        {/* Storage */}
        <View style={styles.row}>
          <Text style={styles.label}>Storage</Text>
          <Text style={styles.value}>{storageUsedMB} MB</Text>
        </View>

        {/* Installed Date */}
        <View style={styles.row}>
          <Text style={styles.label}>Installed</Text>
          <Text style={styles.value}>{installedDate}</Text>
        </View>

        {/* Runtime */}
        <View style={styles.row}>
          <Text style={styles.label}>Runtime</Text>
          <Text style={styles.value}>On-Device Embedded (Qwen 2.5)</Text>
        </View>

        {/* Detailed Status (shown when verified) */}
        {readinessDetails && (
          <View style={[styles.row, styles.noBorder]}>
            <Text style={styles.label}>Details</Text>
            <View style={styles.detailsColumn}>
              <Text style={[styles.detailText, readinessDetails.modelInstalled && styles.detailSuccess]}>
                {readinessDetails.modelInstalled ? '✓' : '○'} Model files
              </Text>
              <Text style={[styles.detailText, readinessDetails.integrityVerified && styles.detailSuccess]}>
                {readinessDetails.integrityVerified ? '✓' : '○'} Integrity verified
              </Text>
              <Text style={[styles.detailText, readinessDetails.runtimeReady && styles.detailSuccess]}>
                {readinessDetails.runtimeReady ? '✓' : '○'} Runtime loaded
              </Text>
              <Text style={[styles.detailText, readinessDetails.warmupPassed && styles.detailSuccess]}>
                {readinessDetails.warmupPassed ? '✓' : '○'} Inference ready
              </Text>
            </View>
          </View>
        )}

        {/* Verification Status Message */}
        {verificationStatus && (
          <View style={styles.verificationStatusContainer}>
            <Text style={[
              styles.verificationStatusText,
              verificationStatus.startsWith('✓') && styles.verificationSuccess,
              verificationStatus.startsWith('⚠') && styles.verificationError,
            ]}>
              {verificationStatus}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {/* Verify Button - Always visible when model is ready */}
          {isReadyOffline && (
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerifyLocalAI}
              disabled={isVerifying}
            >
              <Text style={styles.verifyButtonText}>
                {isVerifying ? 'Verifying...' : 'Verify'}
              </Text>
            </TouchableOpacity>
          )}
          
          {isReadyOffline ? (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteModel}
              disabled={isDeleting}
            >
              <Text style={styles.deleteButtonText}>
                {isDeleting ? 'Deleting...' : 'Delete Model'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={handleRedownload}
            >
              <Text style={styles.downloadButtonText}>Download Model</Text>
            </TouchableOpacity>
          )}

          {isReadyOffline && (
            <TouchableOpacity
              style={styles.redownloadButton}
              onPress={handleRedownload}
            >
              <Text style={styles.redownloadButtonText}>Re-download</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  sectionHeader: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomColor: colors.surfaceBorder,
    borderBottomWidth: 1,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
  },
  detailsColumn: {
    alignItems: 'flex-end',
  },
  detailText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textTertiary,
    marginVertical: 2,
  },
  detailSuccess: {
    color: colors.success,
  },
  verificationStatusContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: colors.surfaceHover,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  verificationStatusText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textPrimary,
  },
  verificationSuccess: {
    color: colors.success,
  },
  verificationError: {
    color: colors.error,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  verifyButton: {
    backgroundColor: colors.primaryBackground,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  verifyButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  downloadButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  downloadButtonText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: colors.errorBackground,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  deleteButtonText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
  redownloadButton: {
    backgroundColor: colors.surfaceHover,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  redownloadButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
