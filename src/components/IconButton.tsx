import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useColors } from '../lib/theme';

type Props = {
  icon: SymbolViewProps['name'];
  label?: string;
  color?: string;
  size?: number;
  onPress: () => void;
  accessibilityLabel: string;
};

export function IconButton({ icon, label, color, size = 28, onPress, accessibilityLabel }: Props) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.5, transform: [{ scale: 0.92 }] }]}
    >
      <SymbolView name={icon} size={size} tintColor={color ?? c.text} />
      {label ? <Text style={[styles.label, { color: c.muted }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', gap: 4, paddingVertical: 6 },
  label: { fontSize: 11, fontWeight: '600' },
});
