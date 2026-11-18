import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SERIF, useColors } from '../lib/theme';

type Props = {
  visible: boolean;
  icon: SymbolViewProps['name'];
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Red confirm button for actions that undo progress. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** In-app confirmation card styled like the celebration overlay (instead of a native alert). */
export function ConfirmDialog({
  visible,
  icon,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  const c = useColors();
  const [scale] = useState(() => new Animated.Value(0.85));
  const [fade] = useState(() => new Animated.Value(0));
  const tint = destructive ? c.heart : c.accent;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.85);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, fade]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={cancelLabel} />
        <Animated.View
          style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, transform: [{ scale }] }]}
          accessibilityViewIsModal
        >
          <View style={[styles.iconWrap, { backgroundColor: destructive ? `${c.heart}22` : c.accentSoft }]}>
            <SymbolView name={icon} size={40} tintColor={tint} />
          </View>
          <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>{message}</Text>
          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [styles.primary, { backgroundColor: tint }, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>{confirmLabel}</Text>
          </Pressable>
          <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.secondary, { color: c.muted }]}>{cancelLabel}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: 'rgba(0,0,0,0.55)' },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontFamily: SERIF, fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  primary: { alignSelf: 'stretch', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondary: { fontSize: 16, fontWeight: '600', paddingVertical: 6 },
});
