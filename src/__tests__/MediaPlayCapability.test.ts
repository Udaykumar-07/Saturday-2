/**
 * Tests for MediaPlayCapability.
 */

import { MediaPlayCapability } from '../capabilities/MediaPlayCapability';
import { NativeBridge } from '../native/NativeBridge';

jest.mock('../native/NativeBridge', () => ({
  NativeBridge: {
    playMedia: jest.fn(),
  },
}));

describe('MediaPlayCapability', () => {
  let capability: MediaPlayCapability;

  beforeEach(() => {
    capability = new MediaPlayCapability();
    jest.clearAllMocks();
  });

  test('has correct capability definition', () => {
    expect(capability.definition.id).toBe('media.play');
    expect(capability.definition.category).toBe('app');
    expect(capability.definition.riskLevel).toBe('low');
  });

  test('executes media playback successfully via NativeBridge', async () => {
    (NativeBridge.playMedia as jest.Mock).mockResolvedValue(true);

    const result = await capability.execute({
      query: 'Imagine Dragons',
      packageName: 'com.google.android.youtube',
      appName: 'youtube',
    });

    expect(result.success).toBe(true);
    expect(result.data?.played).toBe(true);
    expect(result.data?.query).toBe('Imagine Dragons');
    expect(NativeBridge.playMedia).toHaveBeenCalledWith('Imagine Dragons', 'com.google.android.youtube');
  });

  test('fails if query is missing or empty', async () => {
    const result = await capability.execute({});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing media query parameter');
  });

  test('handles native failure gracefully', async () => {
    (NativeBridge.playMedia as jest.Mock).mockRejectedValue(new Error('Device error'));

    const result = await capability.execute({
      query: 'Radioactive',
      packageName: 'com.spotify.music',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Device error');
  });
});
