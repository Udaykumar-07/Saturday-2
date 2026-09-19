/**
 * Integration Card component.
 *
 * Displays a third-party service integration in the Integrations screen:
 * - Service name and description
 * - Connection status indicator
 * - Connect / Disconnect button
 * - Granted permissions list
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { ConnectedService } from '../../core/types/external';

interface IntegrationCardProps {
  service: ConnectedService;
  onConnect: (serviceId: string) => void;
  onDisconnect: (serviceId: string) => void;
  loading?: boolean;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  service,
  onConnect,
  onDisconnect,
  loading = false,
}) => {
  const isConnected = service.status === 'connected';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.info}>
          <Text style={styles.name}>{service.name}</Text>
          <Text style={styles.description}>{service.description}</Text>
          {service.userEmail && (
            <Text style={styles.userEmail}>{service.userEmail}</Text>
          )}
        </View>

        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? colors.accent : colors.textTertiary },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isConnected ? colors.accent : colors.textTertiary },
            ]}
          >
            {isConnected ? 'Connected' : 'Available'}
          </Text>
        </View>
      </View>

      {service.permissions && service.permissions.length > 0 && (
        <View style={styles.permissionsContainer}>
          <Text style={styles.permissionsTitle}>Permissions:</Text>
          {service.permissions.map((perm, idx) => (
            <Text key={idx} style={styles.permissionItem}>
              • {perm.replace('https://www.googleapis.com/auth/', '')}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.actionRow}>
        {isConnected ? (
          <TouchableOpacity
            style={[styles.button, styles.disconnectButton]}
            onPress={() => onDisconnect(service.id)}
            disabled={loading}
          >
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.connectButton]}
            onPress={() => onConnect(service.id)}
            disabled={loading}
          >
            <Text style={styles.connectText}>Connect</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  userEmail: {
    fontSize: 12,
    color: colors.accent,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  permissionsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  permissionsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    marginBottom: 4,
  },
  permissionItem: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectButton: {
    backgroundColor: colors.accent,
  },
  connectText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: colors.surfaceBorder,
  },
  disconnectText: {
    color: '#FF4444',
    fontSize: 13,
    fontWeight: '600',
  },
});
