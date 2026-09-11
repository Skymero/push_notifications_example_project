import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createOptimisticJob,
  getNotificationJob,
  invokeNotificationFanout,
  listNotificationRecipients,
  subscribeToNotificationJob,
  subscribeToNotificationRecipients,
} from '@/lib/appwrite/notifications';
import type { NotificationJob, NotificationRecipient } from '@/types/notifications';

export function useNotificationJob() {
  const [job, setJob] = useState<NotificationJob | null>(null);
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshJob = useCallback(async (jobId: string) => {
    const [nextJob, nextRecipients] = await Promise.all([
      getNotificationJob(jobId),
      listNotificationRecipients(jobId),
    ]);

    if (nextJob) {
      setJob(nextJob);
    }
    setRecipients(nextRecipients);
  }, []);

  const sendNotification = useCallback(async () => {
    if (isSending) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await invokeNotificationFanout({
        notificationType: 'system_test',
        idempotencyKey: `fanout:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      });
      setJob(createOptimisticJob(response.jobId));
      await refreshJob(response.jobId);
    } catch {
      setError('Fanout could not be started. Confirm Appwrite function configuration.');
    } finally {
      setIsSending(false);
    }
  }, [isSending, refreshJob]);

  useEffect(() => {
    if (!job?.jobId) {
      return;
    }

    const unsubscribeJob = subscribeToNotificationJob(job.jobId, setJob);
    const unsubscribeRecipients = subscribeToNotificationRecipients(job.jobId, (recipient) => {
      setRecipients((current) => {
        const existingIndex = current.findIndex((item) => item.$id === recipient.$id);
        if (existingIndex === -1) {
          return [recipient, ...current];
        }

        const next = [...current];
        next[existingIndex] = recipient;
        return next;
      });
    });

    return () => {
      unsubscribeJob();
      unsubscribeRecipients();
    };
  }, [job?.jobId]);

  return useMemo(
    () => ({
      job,
      recipients,
      isSending,
      error,
      sendNotification,
      refreshJob,
    }),
    [error, isSending, job, recipients, refreshJob, sendNotification],
  );
}
