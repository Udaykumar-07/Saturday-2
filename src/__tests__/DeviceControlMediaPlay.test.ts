/**
 * Tests for Device Control & Media Playback Integration.
 * Verifies that requests like "open YouTube and play a song"
 * decompose into actions, execute, and verify playback on device.
 */

import { ActionPlanner } from '../core/actions/ActionPlanner';
import { ActionEngine } from '../core/actions/ActionEngine';
import { CapabilityRegistry } from '../core/actions/CapabilityRegistry';
import { MediaPlayCapability } from '../capabilities/MediaPlayCapability';
import { AppLaunchCapability } from '../capabilities/AppLaunchCapability';
import { NativeBridge } from '../native/NativeBridge';
import { Linking, Platform } from 'react-native';

jest.mock('../native/NativeBridge', () => ({
  NativeBridge: {
    playMedia: jest.fn(),
    launchApp: jest.fn(),
  },
}));

describe('Device Control & Media Playback Integration', () => {
  let planner: ActionPlanner;
  let registry: CapabilityRegistry;
  let engine: ActionEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true, writable: true });
    planner = new ActionPlanner();
    registry = new CapabilityRegistry();
    registry.register(new AppLaunchCapability());
    registry.register(new MediaPlayCapability());
    engine = new ActionEngine(registry);
  });

  test('user request "open YouTube and play Radioactive" plans and executes completely', async () => {
    (NativeBridge.launchApp as jest.Mock).mockResolvedValue(true);
    (NativeBridge.playMedia as jest.Mock).mockResolvedValue(true);

    const plan = planner.plan('open YouTube and play Radioactive');
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(2);
    expect(plan!.steps[0].capability).toBe('app.launch');
    expect(plan!.steps[1].capability).toBe('media.play');
    expect(plan!.steps[1].params.query).toBe('Radioactive');

    const { results, allSucceeded } = await engine.executePlan(plan!.steps);
    expect(allSucceeded).toBe(true);
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
    expect(results[1].data?.played).toBe(true);
    expect(results[1].data?.message).toBe('Playing "Radioactive" on YouTube');
  });

  test('user request "can you play Starboy on Spotify" triggers Spotify playback with verification', async () => {
    (NativeBridge.launchApp as jest.Mock).mockResolvedValue(true);
    (NativeBridge.playMedia as jest.Mock).mockResolvedValue(true);

    const plan = planner.plan('can you play Starboy on Spotify');
    expect(plan).not.toBeNull();
    expect(plan!.steps[1].capability).toBe('media.play');
    expect(plan!.steps[1].params.packageName).toBe('com.spotify.music');

    const { results, allSucceeded } = await engine.executePlan(plan!.steps);
    expect(allSucceeded).toBe(true);
    expect(results[1].data?.played).toBe(true);
    expect(results[1].data?.message).toBe('Playing "Starboy" on Spotify');
  });

  test('when native bridge fails, Linking fallback opens YouTube and confirms playback initiated', async () => {
    (NativeBridge.launchApp as jest.Mock).mockResolvedValue(true);
    // Native bridge returns false (e.g. SaturdayActionBridge not available on device)
    (NativeBridge.playMedia as jest.Mock).mockResolvedValue(false);

    const plan = planner.plan('play Believer on YouTube');
    expect(plan).not.toBeNull();

    const { results, allSucceeded } = await engine.executePlan(plan!.steps);
    expect(allSucceeded).toBe(true);
    expect(results[1].success).toBe(true);
    expect(results[1].data?.verified).toBe(true);
    expect(results[1].data?.message).toBe('Playing "Believer" on YouTube');
    expect(Linking.openURL).toHaveBeenCalled();
  });
});
