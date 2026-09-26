export type ReadinessColor = 'green' | 'yellow' | 'red';

export type PermissionStatus =
  | 'granted'
  | 'denied'
  | 'not_requested'
  | 'unknown';

export type TokenStatus = 'untested' | 'valid' | 'invalid' | 'rotated' | 'revoked';
export type ReceiveStatus = 'untested' | 'verified' | 'failed' | 'expired';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'partially_completed' | 'failed';
export type DispatchStatus = 'pending' | 'accepted' | 'rejected' | 'error';
export type ReceiptStatus = 'not_confirmed' | 'received' | 'opened' | 'expired';
export type ReceiptEventType = 'received' | 'displayed' | 'opened';

export type NotificationErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_FORBIDDEN'
  | 'PERMISSION_NOT_REQUESTED'
  | 'PERMISSION_DENIED'
  | 'FIREBASE_NOT_INITIALIZED'
  | 'FCM_TOKEN_MISSING'
  | 'FCM_TOKEN_MISMATCH'
  | 'FCM_TOKEN_INVALID'
  | 'FCM_TOKEN_UNREGISTERED'
  | 'DEVICE_RECORD_MISSING'
  | 'DEVICE_RECORD_INACTIVE'
  | 'FUNCTION_UNAVAILABLE'
  | 'FANOUT_ALREADY_RUNNING'
  | 'FANOUT_PARTIAL_FAILURE'
  | 'RECEIPT_UNAUTHORIZED'
  | 'RECEIPT_DUPLICATE'
  | 'RECEIPT_EXPIRED'
  | 'NETWORK_UNAVAILABLE'
  | 'UNKNOWN_NOTIFICATION_SCHEMA';

export type ReadinessState = {
  color: ReadinessColor;
  code: string;
  message: string;
};

export type NotificationData = {
  schemaVersion: '1';
  jobId: string;
  recipientRecordId: string;
  notificationType: 'system_test';
  receiptNonce?: string;
};

export type NotificationDisplay = {
  title: string;
  body: string;
  androidChannelId?: string;
  sound?: string;
};

export type DeviceTokenRecord = {
  $id: string;
  userId: string;
  deviceId: string;
  fcmToken: string;
  platform: 'android';
  appVersion: string;
  buildNumber?: string;
  permissionStatus: PermissionStatus;
  tokenStatus: TokenStatus;
  receiveStatus: ReceiveStatus;
  lastValidatedAt?: string | null;
  lastReceivedAt?: string | null;
  lastTokenRefreshAt?: string | null;
  isActive: boolean;
};

export type NotificationJob = {
  $id: string;
  jobId: string;
  requestedByUserId: string;
  notificationType: 'system_test';
  title: string;
  body: string;
  status: JobStatus;
  targetCount: number;
  providerAcceptedCount: number;
  providerRejectedCount: number;
  confirmedCount: number;
  createdAt: string;
  completedAt?: string | null;
};

export type NotificationRecipient = {
  $id: string;
  recipientRecordId: string;
  jobId: string;
  recipientUserId: string;
  username?: string;
  platform?: 'android';
  deviceTokenId: string;
  providerMessageId?: string | null;
  dispatchStatus: DispatchStatus;
  receiptStatus: ReceiptStatus;
  failureCode?: string | null;
  failureMessage?: string | null;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  openedAt?: string | null;
};

export type SubmitNotificationReceiptRequest = {
  jobId: string;
  recipientRecordId: string;
  deviceId: string;
  eventType: ReceiptEventType;
  clientTimestamp: string;
  idempotencyKey: string;
  receiptNonce?: string;
};

export type QueuedNotificationReceipt = SubmitNotificationReceiptRequest & {
  ownerUserId: string;
  firstAttemptAt: string;
  lastAttemptAt: string;
  attemptCount: number;
};

export type InvokeNotificationFanoutRequest = {
  notificationType: 'system_test';
  idempotencyKey: string;
};

export type InvokeNotificationFanoutResponse = {
  jobId: string;
  status: JobStatus;
};
