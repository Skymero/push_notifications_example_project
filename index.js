// Appwrite's React Native SDK expects the WHATWG URL implementation used in
// the reference application. Load it before any module can import Appwrite.
import 'react-native-url-polyfill/auto';

// Headless Android delivery must register before Expo Router mounts a layout.
import { registerBackgroundMessagingHandler } from './lib/push-notifications/backgroundHandler';

registerBackgroundMessagingHandler();
require('expo-router/entry');
