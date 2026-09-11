/**
 * Saturday Typography System.
 */

import { TextStyle } from 'react-native';

export const typography = {
  // Brand Header
  brandTitle: {
    fontSize: 22,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: 4,
  },
  // Hero Tagline
  heroPrompt: {
    fontSize: 24,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  // Headings
  h1: {
    fontSize: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  h2: {
    fontSize: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  // Body text
  body: {
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 22,
  },
  // Small / Secondary
  caption: {
    fontSize: 12,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 16,
  },
  captionMedium: {
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 16,
  },
  // Micro / Badges
  micro: {
    fontSize: 10,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.5,
  },
};
