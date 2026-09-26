export const appConfig = {
  appwrite: {
    // Expo inlines only statically named public environment properties.
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? '',
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? '',
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ?? '',
    collections: {
      users: process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID || 'users',
      deviceTokens: process.env.EXPO_PUBLIC_APPWRITE_DEVICE_TOKENS_COLLECTION_ID || 'device_tokens',
      notificationJobs:
        process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID || 'notification_jobs',
      notificationRecipients:
        process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID ||
        'notification_recipients',
      notificationReceipts:
        process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID ||
        'notification_receipts',
    },
    functions: {
      fanout: process.env.EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID || 'notification-fanout',
      support: process.env.EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID || 'notification-support',
    },
  },
};

export function hasAppwriteConfig() {
  return Boolean(
    appConfig.appwrite.endpoint &&
      appConfig.appwrite.projectId &&
      appConfig.appwrite.databaseId,
  );
}
