/**
 * Tests for MemoryExtractionService.
 */

import { MemoryExtractionService } from '../core/memory/MemoryExtractionService';

describe('MemoryExtractionService', () => {
  let extractor: MemoryExtractionService;

  beforeEach(() => {
    extractor = new MemoryExtractionService();
  });

  test('extracts name from "My name is Uday."', () => {
    const candidates = extractor.extract('My name is Uday.');
    expect(candidates).toHaveLength(1);
    expect(candidates[0].key).toBe('user.name');
    expect(candidates[0].value).toBe('Uday');
    expect(candidates[0].type).toBe('PERSONAL_FACT');
    expect(candidates[0].confidence).toBe(1.0);
  });

  test('extracts name from "My name\'s Uday."', () => {
    const candidates = extractor.extract("My name's Uday.");
    expect(candidates).toHaveLength(1);
    expect(candidates[0].key).toBe('user.name');
    expect(candidates[0].value).toBe('Uday');
  });

  test('extracts name from "Call me Uday."', () => {
    const candidates = extractor.extract('Call me Uday.');
    expect(candidates).toHaveLength(1);
    expect(candidates[0].key).toBe('user.name');
    expect(candidates[0].value).toBe('Uday');
  });

  test('extracts name from "Hey my name is uk"', () => {
    const candidates = extractor.extract('Hey my name is uk');
    expect(candidates).toHaveLength(1);
    expect(candidates[0].key).toBe('user.name');
    expect(candidates[0].value).toBe('uk');
  });

  test('extracts name from "You can call me Alex"', () => {
    const candidates = extractor.extract('You can call me Alex');
    expect(candidates).toHaveLength(1);
    expect(candidates[0].key).toBe('user.name');
    expect(candidates[0].value).toBe('Alex');
  });

  test('extracts name from "I am Uday" but ignores transient states', () => {
    const nameCandidate = extractor.extract('I am Uday');
    expect(nameCandidate).toHaveLength(1);
    expect(nameCandidate[0].value).toBe('Uday');

    // Should NOT extract transient states as names
    expect(extractor.extract('I am hungry right now')).toHaveLength(0);
    expect(extractor.extract("I'm tired")).toHaveLength(0);
    expect(extractor.extract('I am testing')).toHaveLength(0);
  });

  test('extracts preferences and instructions', () => {
    const pref = extractor.extract('I prefer dark mode');
    expect(pref).toHaveLength(1);
    expect(pref[0].type).toBe('PREFERENCE');
    expect(pref[0].value).toBe('dark mode');

    const fav = extractor.extract('My favorite programming language is TypeScript');
    expect(fav).toHaveLength(1);
    expect(fav[0].type).toBe('PREFERENCE');
    expect(fav[0].key).toBe('user.preference.programming_language');
    expect(fav[0].value).toBe('TypeScript');

    const instruction = extractor.extract('Remember that my project is called Saturday');
    expect(instruction).toHaveLength(1);
    expect(instruction[0].key).toBe('project.name');
    expect(instruction[0].value).toBe('Saturday');
  });

  test('does not extract memories from general queries', () => {
    expect(extractor.extract('What is the weather?')).toHaveLength(0);
    expect(extractor.extract('Explain APIs')).toHaveLength(0);
    expect(extractor.extract('Open YouTube')).toHaveLength(0);
    expect(extractor.extract("What's 10 + 20?")).toHaveLength(0);
  });
});
