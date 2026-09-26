module.exports = {
  name: 'Push Notification Example',
  slug: 'push-notification-example',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'pushnotificationexample',
  userInterfaceStyle: 'automatic',

  android: {
    package: 'com.pushnotificationexample.app',
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON || './google-services.json',
    permissions: ['POST_NOTIFICATIONS'],
  },

  plugins: [
    'expo-router',
    'expo-notifications',
    '@react-native-firebase/app',
    '@react-native-firebase/messaging',
  ],

  extra: {
    router: {},
    eas: {
      projectId: '',
    },
  },
};