// Headless Android delivery must register before Expo Router mounts a layout.
import { registerBackgroundMessagingHandler } from './lib/push-notifications/backgroundHandler';

registerBackgroundMessagingHandler();
require('expo-router/entry');
