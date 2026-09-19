/**
 * Model Download Screen for Saturday.
 *
 * Implements Section 57 Clean First-Run Experience:
 *
 * SATURDAY
 * Your private local AI
 * Qwen runs directly on your phone.
 *
 * One-time setup:
 * Download local AI model
 *
 * [ 42% ]
 * 1.2 GB / 2.8 GB
 *
 * After installation, basic AI features can work without internet.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { ModelDownloadManager, DownloadProgress } from '../../core/ai/qwen';

interface ModelDownloadScreenProps {
  downloadManager: ModelDownloadManager;
  onComplete?: () => void;
  onSkip?: () => void;
}

export const ModelDownloadScreen: React.FC<ModelDownloadScreenProps> = ({
  downloadManager,
  onComplete,
  onSkip,
}) => {
  const [progress, setProgress] = useState<DownloadProgress>(downloadManager.getProgress());
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = downloadManager.addProgressListener((p) => {
      setProgress(p);
      if (p.state === 'READY') {
        setIsDownloading(false);
        onComplete?.();
      } else if (p.state === 'FAILED' || p.state === 'CORRUPTED') {
        setIsDownloading(false);
        setErrorMessage(p.error || 'Download failed. Please try again.');
      }
    });

    return unsubscribe;
  }, [downloadManager, onComplete]);

  const handleStartDownload = async () => {
    setErrorMessage(null);
    setIsDownloading(true);
    try {
      const success = await downloadManager.startDownload();
      if (success) {
        onComplete?.();
      }
    } catch (err) {
      setIsDownloading(false);
      setErrorMessage(err instanceof Error ? err.message : 'Download failed.');
    }
  };

  const handlePauseResume = async () => {
    if (progress.state === 'DOWNLOADING') {
      downloadManager.pauseDownload();
      setIsDownloading(false);
    } else if (progress.state === 'PAUSED') {
      setIsDownloading(true);
      await downloadManager.resumeDownload();
    }
  };

  const downloadedMB = (progress.bytesDownloaded / (1024 * 1024)).toFixed(0);
  const totalMB = (progress.totalBytes / (1024 * 1024)).toFixed(0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Brand Header */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>SATURDAY</Text>
          <Text style={styles.brandSubtitle}>Your private local AI</Text>
          <Text style={styles.brandTagline}>Qwen runs directly on your phone.</Text>
        </View>

        {/* Setup Card */}
        <View style={styles.setupCard}>
          <Text style={styles.setupLabel}>One-time setup:</Text>
          <Text style={styles.setupTitle}>Download local AI model</Text>

          {/* Progress Bar */}
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.max(2, progress.percentage)}%` },
              ]}
            />
          </View>

          {/* Progress Metrics */}
          <View style={styles.metricsRow}>
            <Text style={styles.percentageText}>[ {progress.percentage}% ]</Text>
            <Text style={styles.bytesText}>
              {downloadedMB} MB / {totalMB} MB
            </Text>
          </View>

          {/* Status message */}
          {progress.state === 'VERIFYING' && (
            <Text style={styles.verifyingText}>Verifying model integrity & tokenizer...</Text>
          )}
          {progress.state === 'LOADING' && (
            <Text style={styles.verifyingText}>Loading & running warmup self-test...</Text>
          )}
          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {progress.state === 'NOT_INSTALLED' || progress.state === 'FAILED' ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleStartDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator color={colors.buttonPrimaryText} />
                ) : (
                  <Text style={styles.primaryButtonText}>Download Model</Text>
                )}
              </TouchableOpacity>
            ) : progress.state === 'DOWNLOADING' || progress.state === 'PAUSED' ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handlePauseResume}
              >
                <Text style={styles.secondaryButtonText}>
                  {progress.state === 'DOWNLOADING' ? 'Pause' : 'Resume Download'}
                </Text>
              </TouchableOpacity>
            ) : progress.state === 'READY' ? (
              <TouchableOpacity style={styles.primaryButton} onPress={onComplete}>
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Offline benefit caption */}
          <Text style={styles.offlineNote}>
            After installation, basic AI features can work without internet.
          </Text>
        </View>

        {/* Skip button for testing or cloud-only */}
        {onSkip && progress.state !== 'READY' && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Set up later in Settings</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  brandTitle: {
    ...typography.brandTitle,
    fontSize: 28,
    letterSpacing: 4,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  brandSubtitle: {
    ...typography.body,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 6,
  },
  brandTagline: {
    ...typography.caption,
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 4,
  },
  setupCard: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
  },
  setupLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  setupTitle: {
    ...typography.h1,
    fontSize: 20,
    color: colors.textPrimary,
    marginTop: 4,
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.highlight,
    borderRadius: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  percentageText: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  bytesText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  verifyingText: {
    ...typography.caption,
    color: colors.warning,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.buttonPrimaryText,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.surfaceHover,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  offlineNote: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  skipButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  skipButtonText: {
    ...typography.caption,
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },
});
