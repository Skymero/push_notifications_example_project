import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  registerBackgroundMessagingHandler,
  registerForegroundNotificationHandlers,
  retryPendingReceipts,
} from '@/lib/push-notifications/backgroundHandler';
import { useEffect } from 'react';

registerBackgroundMessagingHandler();

export default function RootLayout() {
  useEffect(() => {
    void retryPendingReceipts();
    return registerForegroundNotificationHandlers();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
