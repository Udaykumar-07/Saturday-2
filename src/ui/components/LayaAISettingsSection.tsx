/**
 * Laya AI Settings Section for Saturday.
 *
 * Provides user controls for the on-device Laya System-1 decision model:
 * - Model status (Installed, Ready offline, Not installed)
 * - Storage usage (~262MB INT4 quantized)
 * - One-time model download with live progress
 * - Model deletion
 * - On-device test decision / intent classification benchmark
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
import { getServices } from '../../services/container';
import type { LayaDownloadProgress, LayaClassificationResult } from '../../core/ai/laya';

export const LayaAISettingsSection: React.FC = () => {
  const services = getServices();
  const modelManager = services.layaModelManager;
  const runtime = services.layaRuntime;
  const classifier = services.layaClassifier;

  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(runtime.isReady);
  const [storageUsedMB, setStorageUsedMB] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<LayaDownloadProgress | null>(null);
  const [testResult, setTestResult] = useState<LayaClassificationResult | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const installed = await modelManager.isInstalled();
      setIsInstalled(installed);
      setIsReady(runtime.isReady);

      if (installed) {
        const info = await modelManager.getStorageInfo();
        setStorageUsedMB((info.totalBytes / (1024 * 1024)).toFixed(0));
      } else {
        setStorageUsedMB('0');
      }
    } catch {
      // Ignore error on status check
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(null);
    try {
      await modelManager.download((progress) => {
        setDownloadProgress(progress);
      });

      // Load model into runtime after download
      await modelManager.loadRuntime(runtime);

      await checkStatus();
      Alert.alert('Success', 'Laya decision model installed and ready offline!');
    } catch (error) {
      Alert.alert(
        'Download Error',
        error instanceof Error ? error.message : 'Failed to download Laya model'
      );
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Laya Decision Model',
      'Are you sure you want to delete the local Laya model? Intent classification will fall back to keyword matching.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await runtime.close();
              await modelManager.deleteModel();
              await checkStatus();
              setTestResult(null);
              Alert.alert('Deleted', 'Laya model removed from device.');
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

  const handleTestInference = async () => {
    setIsTesting(true);
    try {
      const result = await classifier.classify('My name is Uday and I need to book a flight');
      setTestResult(result);
    } catch (error) {
      Alert.alert('Test Failed', error instanceof Error ? error.message : 'Inference error');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>ON-DEVICE INTENT ROUTER (LAYA AI)</Text>

      <View style={styles.card}>
        {/* Model ID */}
        <View style={styles.row}>
          <Text style={styles.label}>Decision Model</Text>
          <Text style={styles.value}>Laya ModernBERT (INT4)</Text>
        </View>

        {/* Status */}
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isReady ? colors.success : isInstalled ? colors.accent : colors.error },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isReady ? colors.success : isInstalled ? colors.accent : colors.error },
              ]}
            >
              {isReady ? 'Active (~33ms)' : isInstalled ? 'Files Ready' : 'Not Installed'}
            </Text>
          </View>
        </View>

        {/* Function */}
        <View style={styles.row}>
          <Text style={styles.label}>Purpose</Text>
          <Text style={styles.value}>Fast Intent Classification & Personal Facts</Text>
        </View>

        {/* Storage */}
        <View style={styles.row}>
          <Text style={styles.label}>Storage</Text>
          <Text style={styles.value}>
            {isInstalled ? `${storageUsedMB} MB` : '~262 MB (when downloaded)'}
          </Text>
        </View>

        {/* Runtime */}
        <View style={[styles.row, styles.noBorder]}>
          <Text style={styles.label}>Runtime</Text>
          <Text style={styles.value}>ONNX Runtime (Offline On-Device)</Text>
        </View>

        {/* Download Progress */}
        {isDownloading && downloadProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(downloadProgress.overallPercent)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              Downloading {downloadProgress.file} ({downloadProgress.fileIndex + 1}/{downloadProgress.totalFiles}) •{' '}
              {Math.round(downloadProgress.overallPercent)}%
            </Text>
          </View>
        )}

        {/* Test Result Display */}
        {testResult && (
          <View style={styles.testResultBox}>
            <Text style={styles.testResultTitle}>Test Decision Result:</Text>
            <Text style={styles.testResultText}>
              • Intent Type: {testResult.type} ({(testResult.confidence * 100).toFixed(1)}% confidence)
            </Text>
            <Text style={styles.testResultText}>
              • Personal Fact Detected: {testResult.isPersonalFact ? 'Yes' : 'No'}
            </Text>
            {testResult.urgencyScore !== undefined && (
              <Text style={styles.testResultText}>
                • Urgency Level: {testResult.urgencyScore.toFixed(1)} / 3.0
              </Text>
            )}
            <Text style={styles.testResultLatency}>
              Latency: {testResult.latencyMs}ms (Classified by: {testResult.classifiedBy})
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {isReady && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestInference}
              disabled={isTesting}
            >
              <Text style={styles.testButtonText}>
                {isTesting ? 'Testing...' : '⚡ Test Laya'}
              </Text>
            </TouchableOpacity>
          )}

          {isInstalled ? (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isDeleting || isDownloading}
            >
              <Text style={styles.deleteButtonText}>
                {isDeleting ? 'Deleting...' : 'Delete Model'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.downloadButtonText}>⬇ Download Laya (~262MB)</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
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
  progressContainer: {
    marginTop: 12,
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
  testResultBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.surfaceHover,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  testResultTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  testResultText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textPrimary,
    marginVertical: 2,
  },
  testResultLatency: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  testButton: {
    backgroundColor: colors.primaryBackground,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  testButtonText: {
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
});
