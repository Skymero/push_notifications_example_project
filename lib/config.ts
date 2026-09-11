const required = (name: string) => process.env[name] ?? '';

export const appConfig = {
  appwrite: {
    endpoint: required('EXPO_PUBLIC_APPWRITE_ENDPOINT'),
    projectId: required('EXPO_PUBLIC_APPWRITE_PROJECT_ID'),
    databaseId: required('EXPO_PUBLIC_APPWRITE_DATABASE_ID'),
    collections: {
      users: required('EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID') || 'users',
      deviceTokens: required('EXPO_PUBLIC_APPWRITE_DEVICE_TOKENS_COLLECTION_ID') || 'device_tokens',
      notificationJobs:
        required('EXPO_PUBLIC_APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID') || 'notification_jobs',
      notificationRecipients:
        required('EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID') ||
        'notification_recipients',
      notificationReceipts:
        required('EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID') ||
        'notification_receipts',
    },
    functions: {
      fanout: required('EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID') || 'notification-fanout',
      support: required('EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID') || 'notification-support',
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
