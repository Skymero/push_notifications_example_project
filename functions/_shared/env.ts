export type FunctionConfig = {
  endpoint: string;
  projectId: string;
  apiKey: string;
  databaseId: string;
  usersCollectionId: string;
  deviceTokensCollectionId: string;
  notificationJobsCollectionId: string;
  notificationRecipientsCollectionId: string;
  notificationReceiptsCollectionId: string;
  firebaseProjectId: string;
  firebaseClientEmail: string;
  firebasePrivateKey: string;
  includeSender: boolean;
  fanoutLimit: number;
  jobStaleSeconds: number;
};

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing function environment variable: ${name}`);
  }
  return value;
}

function optionalPositiveInteger(name: string, defaultValue: number) {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid function environment variable: ${name}`);
  }

  return value;
}

export function loadConfig(): FunctionConfig {
  return {
    endpoint: required('APPWRITE_ENDPOINT'),
    projectId: required('APPWRITE_PROJECT_ID'),
    apiKey: required('APPWRITE_API_KEY'),
    databaseId: required('APPWRITE_DATABASE_ID'),
    usersCollectionId: required('APPWRITE_USERS_COLLECTION_ID'),
    deviceTokensCollectionId: required('APPWRITE_DEVICE_TOKENS_COLLECTION_ID'),
    notificationJobsCollectionId: required('APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID'),
    notificationRecipientsCollectionId: required('APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID'),
    notificationReceiptsCollectionId: required('APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID'),
    firebaseProjectId: required('FIREBASE_PROJECT_ID'),
    firebaseClientEmail: required('FIREBASE_CLIENT_EMAIL'),
    firebasePrivateKey: required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    includeSender: process.env.NOTIFICATION_INCLUDE_SENDER !== 'false',
    fanoutLimit: optionalPositiveInteger('NOTIFICATION_FANOUT_LIMIT', 100),
    jobStaleSeconds: optionalPositiveInteger('NOTIFICATION_JOB_STALE_SECONDS', 300),
  };
}
