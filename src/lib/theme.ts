import { useColorScheme } from 'react-native';

const light = {
  bg: '#F7F3EA',
  surface: '#FFFFFF',
  text: '#1F1B16',
  muted: '#7C7266',
  border: '#E4DCCB',
  accent: '#A07C1C',
  accentSoft: '#F0E4C2',
  heart: '#D2453B',
  done: '#2E9E5B',
  current: '#1F1B16',
};

const dark: typeof light = {
  bg: '#0F0E0C',
  surface: '#1B1916',
  text: '#F1ECE2',
  muted: '#9C9385',
  border: '#2E2A24',
  accent: '#D4AF4A',
  accentSoft: '#3A3120',
  heart: '#FF6B5E',
  done: '#43C478',
  current: '#F1ECE2',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const SERIF = 'Georgia';
