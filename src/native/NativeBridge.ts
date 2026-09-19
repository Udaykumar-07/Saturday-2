/**
 * Type-safe TypeScript wrapper around the native SaturdayActionBridge module.
 * Gracefully returns mock/empty data when not running on Android.
 */

import { NativeModules, Platform } from 'react-native';

const SaturdayActionBridge = NativeModules.SaturdayActionBridge;

// ---------------------------------------------------------------------------
// Bridge types
// ---------------------------------------------------------------------------

export interface DeviceBridgeInfo {
  brand: string;
  manufacturer: string;
  model: string;
  osVersion: string;
  sdkVersion: number;
  batteryLevel: number;
  network: {
    isConnected: boolean;
    isWifi: boolean;
    isCellular: boolean;
  };
}

export interface InstalledApp {
  name: string;
  packageName: string;
}

// ---------------------------------------------------------------------------
// Bridge API
// ---------------------------------------------------------------------------

function isAndroid(): boolean {
  return Platform.OS === 'android' && SaturdayActionBridge != null;
}

export const NativeBridge = {
  /** Get device info (battery, network, model, OS). */
  async getDeviceInfo(): Promise<DeviceBridgeInfo> {
    if (!isAndroid()) {
      return {
        brand: 'Mock',
        manufacturer: 'Mock',
        model: 'Development Device',
        osVersion: '0.0',
        sdkVersion: 0,
        batteryLevel: -1,
        network: { isConnected: false, isWifi: false, isCellular: false },
      };
    }
    return SaturdayActionBridge.getDeviceInfo();
  },

  /** Get list of installed apps with launcher activities. */
  async getInstalledApps(): Promise<InstalledApp[]> {
    if (!isAndroid()) return [];
    return SaturdayActionBridge.getInstalledApps();
  },

  /** Launch an app by package name. */
  async launchApp(packageName: string): Promise<boolean> {
    if (!isAndroid()) return false;
    return SaturdayActionBridge.launchApp(packageName);
  },

  /** Open a URL via Android intent. */
  async openUrl(url: string): Promise<boolean> {
    if (!isAndroid()) return false;
    return SaturdayActionBridge.openUrl(url);
  },

  /** Read text from clipboard. */
  async readClipboard(): Promise<string> {
    if (!isAndroid()) return '';
    return SaturdayActionBridge.readClipboard();
  },

  /** Write text to clipboard. */
  async writeClipboard(text: string): Promise<boolean> {
    if (!isAndroid()) return false;
    return SaturdayActionBridge.writeClipboard(text);
  },

  /** Check if Saturday's AccessibilityService is enabled. */
  async isAccessibilityEnabled(): Promise<boolean> {
    if (!isAndroid()) return false;
    return SaturdayActionBridge.isAccessibilityEnabled();
  },

  /** Get deep link schemes supported by an app. */
  async getAppDeepLinks(packageName: string): Promise<string[]> {
    if (!isAndroid()) return [];
    return SaturdayActionBridge.getAppDeepLinks(packageName);
  },

  /** Play media (song, artist, video) via Android MediaPlay intent. */
  async playMedia(query: string, packageName?: string): Promise<boolean> {
    if (!isAndroid()) return true;
    return SaturdayActionBridge.playMedia(query, packageName);
  },
};
