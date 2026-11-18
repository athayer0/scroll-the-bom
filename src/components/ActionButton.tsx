import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

type Props = { children: ReactNode; onPress: () => void; accessibilityLabel: string };

/** Icon-only button for the verse action rail. */
export function ActionButton({ children, onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.5, transform: [{ scale: 0.9 }] }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', padding: 4 },
});
