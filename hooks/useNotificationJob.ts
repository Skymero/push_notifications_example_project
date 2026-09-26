import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  createOptimisticJob, getNotificationJob, invokeNotificationFanout,
  listNotificationRecipients, subscribeToNotificationJob, subscribeToNotificationRecipients,
  NotificationFunctionError,
} from '@/lib/appwrite/notifications';
import type { NotificationJob, NotificationRecipient } from '@/types/notifications';

export function useNotificationJob(userId: string | null) {
  const [job, setJob] = useState<NotificationJob | null>(null);
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const generation = useRef(0);
  const currentJob = useRef<string | null>(null);
  const sending = useRef(false);
  const pendingKey = useRef<string | null>(null);

  const refreshJob = useCallback(async (jobId: string) => {
    const run = generation.current;
    const [nextJob, nextRecipients] = await Promise.all([getNotificationJob(jobId), listNotificationRecipients(jobId)]);
    if (run !== generation.current || currentUser.current !== userId || currentJob.current !== jobId) return;
    if (nextJob) setJob(nextJob);
    setRecipients(nextRecipients);
  }, [userId]);

  const sendNotification = useCallback(async () => {
    if (sending.current || !userId) return;
    sending.current = true;
    const run = generation.current;
    const isCancelled = () => run !== generation.current || currentUser.current !== userId;
    setIsSending(true);
    setError(null);
    pendingKey.current ??= `fanout:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    try {
      const response = await invokeNotificationFanout({
        notificationType: 'system_test', idempotencyKey: pendingKey.current,
      }, userId, isCancelled);
      if (isCancelled()) return;
      pendingKey.current = null;
      currentJob.current = response.jobId;
      setRecipients([]);
      setJob({ ...createOptimisticJob(response.jobId), status: response.status });
      await refreshJob(response.jobId);
    } catch (failure) {
      if (!isCancelled()) {
        if (failure instanceof NotificationFunctionError && failure.code === 'FANOUT_EXECUTION_FAILED') pendingKey.current = null;
        setError('Fanout could not be confirmed. Retry to check the same request, or check your Appwrite deployment.');
      }
    } finally {
      if (!isCancelled()) { sending.current = false; setIsSending(false); }
    }
  }, [userId, refreshJob]);

  useEffect(() => {
    generation.current += 1;
    currentJob.current = null;
    sending.current = false;
    pendingKey.current = null;
    setJob(null);
    setRecipients([]);
    setError(null);
    setIsSending(false);
    return () => { generation.current += 1; };
  }, [userId]);

  useEffect(() => {
    if (!job?.jobId || !userId) return;
    const jobId = job.jobId;
    let disposed = false;
    let refreshing = false;
    const refresh = async () => {
      if (disposed || refreshing || AppState.currentState !== 'active') return;
      refreshing = true;
      try { await refreshJob(jobId); } catch { /* Reconcile on next foreground poll. */ }
      finally { refreshing = false; }
    };
    const unsubscribeJob = subscribeToNotificationJob(jobId, (next) => {
      if (!disposed && currentUser.current === userId) setJob(next);
    });
    const unsubscribeRecipients = subscribeToNotificationRecipients(jobId, (recipient) => {
      if (disposed || currentUser.current !== userId) return;
      setRecipients((current) => {
        const existingIndex = current.findIndex((item) => item.$id === recipient.$id);
        if (existingIndex === -1) return [recipient, ...current];
        const next = [...current];
        next[existingIndex] = recipient;
        return next;
      });
    });
    void refresh(); // Reconcile after subscribing, closing the initial read/subscription gap.
    const timer = setInterval(() => { void refresh(); }, 5000);
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => {
      disposed = true;
      unsubscribeJob();
      unsubscribeRecipients();
      clearInterval(timer);
      appState.remove();
    };
  }, [job?.jobId, userId, refreshJob]);

  return useMemo(() => ({ job, recipients, isSending, error, sendNotification, refreshJob }),
    [error, isSending, job, recipients, refreshJob, sendNotification]);
}
