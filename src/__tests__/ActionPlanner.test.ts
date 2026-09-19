/**
 * Tests for ActionPlanner — multi-step action decomposition.
 */

import { ActionPlanner } from '../core/actions/ActionPlanner';

describe('ActionPlanner', () => {
  let planner: ActionPlanner;

  beforeEach(() => {
    planner = new ActionPlanner();
  });

  test('plans "open YouTube" as single app.launch', () => {
    const plan = planner.plan('open YouTube');
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.steps[0].capability).toBe('app.launch');
    expect(plan!.steps[0].params.packageName).toBe('com.google.android.youtube');
  });

  test('plans "open YouTube and search Imagine Dragons" as two steps', () => {
    const plan = planner.plan('open YouTube and search Imagine Dragons');
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(2);
    expect(plan!.steps[0].capability).toBe('app.launch');
    expect(plan!.steps[1].capability).toBe('url.open');
    expect((plan!.steps[1].params.url as string)).toContain('Imagine%20Dragons');
  });

  test('plans "launch Chrome" using launch keyword', () => {
    const plan = planner.plan('launch Chrome');
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.steps[0].params.packageName).toBe('com.android.chrome');
  });

  test('plans "search cats on YouTube"', () => {
    const plan = planner.plan('search cats on YouTube');
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(2);
    expect(plan!.steps[0].capability).toBe('app.launch');
    expect(plan!.steps[1].capability).toBe('url.open');
  });

  test('plans "play lofi beats on Spotify"', () => {
    const plan = planner.plan('play lofi beats on Spotify');
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(2);
    expect(plan!.steps[0].params.packageName).toBe('com.spotify.music');
    expect(plan!.steps[1].capability).toBe('media.play');
    expect(plan!.steps[1].params.query).toBe('lofi beats');
  });

  test('plans "play Imagine Dragons on YouTube" with media.play', () => {
    const plan = planner.plan('play Imagine Dragons on YouTube');
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(2);
    expect(plan!.steps[0].capability).toBe('app.launch');
    expect(plan!.steps[0].params.packageName).toBe('com.google.android.youtube');
    expect(plan!.steps[1].capability).toBe('media.play');
    expect(plan!.steps[1].params.query).toBe('Imagine Dragons');
    expect(plan!.description).toContain('Imagine Dragons');
  });

  test('plans "play Imagine Dragons" defaulting to YouTube media.play', () => {
    const plan = planner.plan('play Imagine Dragons');
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(2);
    expect(plan!.steps[0].capability).toBe('app.launch');
    expect(plan!.steps[0].params.packageName).toBe('com.google.android.youtube');
    expect(plan!.steps[1].capability).toBe('media.play');
    expect(plan!.steps[1].params.query).toBe('Imagine Dragons');
  });

  test('returns null for non-actionable input', () => {
    const plan = planner.plan('what is the weather today');
    expect(plan).toBeNull();
  });

  test('returns null for empty input', () => {
    const plan = planner.plan('');
    expect(plan).toBeNull();
  });

  test('open unknown app still produces plan with undefined package', () => {
    const plan = planner.plan('open SomeRandomApp');
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.steps[0].params.packageName).toBeUndefined();
    expect(plan!.steps[0].params.appName).toBe('somerandomapp');
  });

  test('search with deep link includes encoded query', () => {
    const plan = planner.plan('open YouTube and search for hello world');
    expect(plan).not.toBeNull();
    const urlStep = plan!.steps.find((s) => s.capability === 'url.open');
    expect(urlStep).toBeDefined();
    expect((urlStep!.params.url as string)).toContain('hello%20world');
  });
});
