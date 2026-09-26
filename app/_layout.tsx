import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  registerForegroundNotificationHandlers,
} from '@/lib/push-notifications/backgroundHandler';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    return registerForegroundNotificationHandlers();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
