import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { CelebrationOverlay } from '../components/Celebrations';
import '../lib/notifications';
import { StoreProvider } from '../lib/store';
import { useColors } from '../lib/theme';

export default function RootLayout() {
  const c = useColors();
  const modalHeader = {
    presentation: 'modal' as const,
    headerShown: true,
    headerStyle: { backgroundColor: c.bg },
    headerTintColor: c.text,
    headerShadowVisible: false,
  };
  return (
    <StoreProvider>
      <StatusBar style="auto" />
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="picker" options={{ ...modalHeader, title: 'Books' }} />
          <Stack.Screen name="goal" options={{ ...modalHeader, title: 'Goal & Reminders' }} />
          <Stack.Screen name="note" options={{ ...modalHeader, title: '' }} />
        </Stack>
        <CelebrationOverlay />
      </View>
    </StoreProvider>
  );
}
