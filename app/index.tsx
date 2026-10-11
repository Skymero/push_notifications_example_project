import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { hasAppwriteConfig } from '@/lib/config';
import {
  type AuthStage,
  type AuthUser,
  AuthFlowError,
  getCurrentUser,
  registerWithUsername,
  signInWithUsername,
  signOut,
} from '@/lib/appwrite/auth';
import {
  getAuthErrorMessage,
  getNotificationProfileErrorMessage,
  logAuthError,
} from '@/lib/appwrite/authErrors';
import { finishAuthSubmission, tryBeginAuthSubmission } from '@/lib/appwrite/authSubmission';
import { ensureAppUserDocument } from '@/lib/appwrite/users';
import { deactivateCurrentDeviceToken } from '@/lib/push-notifications/deviceRegistration';
import { useNotificationReadiness } from '@/hooks/useNotificationReadiness';
import { useNotificationJob } from '@/hooks/useNotificationJob';
import { StatusLed } from '@/components/StatusLed';
import { NotificationJobSummary } from '@/components/NotificationJobSummary';
import { RecipientCard } from '@/components/RecipientCard';

type ProfileSetupState = 'idle' | 'loading' | 'ready' | 'error';

const authProgressLabel = (stage: AuthStage | null) => {
  switch (stage) {
    case 'creating-account': return 'Creating account…';
    case 'signing-in': return 'Signing in…';
    case 'checking-session': return 'Checking session…';
    case 'signing-out': return 'Signing out…';
    default: return 'Working…';
  }
};

export default function HomeScreen() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'sign-in' | 'register'>('sign-in');
  const [authLoading, setAuthLoading] = useState(true);
  const [authStage, setAuthStage] = useState<AuthStage | null>('checking-session');
  const [authError, setAuthError] = useState<string | null>(null);
  const [profileSetup, setProfileSetup] = useState<ProfileSetupState>('idle');
  const [profileError, setProfileError] = useState<string | null>(null);
  const mounted = useRef(true);
  const authSubmissionLock = useRef(false);
  const profileAttempt = useRef(0);

  const readinessUser = profileSetup === 'ready' ? user : null;
  const readiness = useNotificationReadiness(readinessUser);
  const notificationJob = useNotificationJob(readinessUser?.$id ?? null);

  const canSend = useMemo(
    () => Boolean(user) && profileSetup === 'ready' && !authLoading &&
      readiness.sendStatus.color === 'green' && !notificationJob.isSending,
    [user, profileSetup, authLoading, notificationJob.isSending, readiness.sendStatus.color],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      profileAttempt.current += 1;
    };
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        if (mounted.current) setUser(currentUser);
      })
      .catch((error) => {
        logAuthError(error, 'session-restore');
        if (mounted.current) setAuthError(getAuthErrorMessage(error, 'session-restore'));
      })
      .finally(() => {
        if (mounted.current) {
          setAuthStage(null);
          setAuthLoading(false);
        }
      });
  }, []);

  const prepareNotificationProfile = useCallback(async () => {
    if (!user) return;
    const attempt = ++profileAttempt.current;
    setProfileSetup('loading');
    setProfileError(null);
    try {
      await ensureAppUserDocument();
      if (mounted.current && profileAttempt.current === attempt) {
        setProfileSetup('ready');
      }
    } catch (error) {
      const candidate = error as {
        code?: number | string;
        status?: number;
        type?: string;
      };
      console.info('[AUTH] Notification profile setup unavailable', {
        code: candidate?.code,
        status: candidate?.status ??
          (typeof candidate?.code === 'number' ? candidate.code : undefined),
        type: candidate?.type,
      });
      if (mounted.current && profileAttempt.current === attempt) {
        setProfileSetup('error');
        setProfileError(getNotificationProfileErrorMessage(error));
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      profileAttempt.current += 1;
      setProfileSetup('idle');
      setProfileError(null);
      return;
    }
    void prepareNotificationProfile();
    return () => {
      profileAttempt.current += 1;
    };
  }, [prepareNotificationProfile, user]);

  async function submitAuth() {
    if (authLoading || !tryBeginAuthSubmission(authSubmissionLock)) return;
    const operation = authMode;
    const handleStage = (stage: AuthStage) => {
      if (mounted.current) setAuthStage(stage);
    };
    setAuthError(null);
    setAuthLoading(true);
    setAuthStage(operation === 'register' ? 'creating-account' : 'signing-in');

    try {
      const nextUser =
        operation === 'register'
          ? await registerWithUsername(username, password, handleStage)
          : await signInWithUsername(username, password, handleStage);
      if (mounted.current) {
        setUser(nextUser);
        setPassword('');
      }
    } catch (error) {
      logAuthError(error, operation);
      if (mounted.current) {
        setAuthError(getAuthErrorMessage(error, operation));
        if (error instanceof AuthFlowError && error.accountCreated) {
          setAuthMode('sign-in');
        }
      }
    } finally {
      finishAuthSubmission(authSubmissionLock);
      if (mounted.current) {
        setAuthStage(null);
        setAuthLoading(false);
      }
    }
  }

  async function handleSignOut() {
    setAuthLoading(true);
    setAuthStage('signing-out');
    try {
      if (user) await deactivateCurrentDeviceToken(user.$id);
      await signOut();
      setUser(null);
      setPassword('');
    } catch {
      Alert.alert('Sign out failed', 'This device could not be deactivated or the session could not be closed. Check your connection and retry.');
    } finally {
      if (mounted.current) {
        setAuthStage(null);
        setAuthLoading(false);
      }
    }
  }

  async function handleSend() {
    if (!canSend) {
      Alert.alert('Send unavailable', readiness.sendStatus.message);
      return;
    }

    await notificationJob.sendNotification();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Push Notification Console</Text>
            <Text style={styles.subtitle}>Database-defined FCM validation and fanout</Text>
          </View>
          {user ? (
            <Pressable style={styles.iconButton} disabled={authLoading} onPress={handleSignOut} accessibilityLabel="Sign out">
              <MaterialIcons name="logout" size={20} color="#111827" />
            </Pressable>
          ) : null}
        </View>

        {!hasAppwriteConfig() ? (
          <View style={styles.warning}>
            <MaterialIcons name="warning" size={20} color="#92400e" />
            <Text style={styles.warningText}>
              Add Appwrite public values from `.env.example` before real auth or fanout calls.
            </Text>
          </View>
        ) : null}

        {!user ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <TextInput
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              style={styles.input}
            />
            {authError ? <Text style={styles.error}>{authError}</Text> : null}
            <View style={styles.segment}>
              <Pressable
                style={[styles.segmentButton, authMode === 'sign-in' && styles.segmentActive]}
                disabled={authLoading}
                onPress={() => setAuthMode('sign-in')}
              >
                <Text style={styles.segmentText}>Sign in</Text>
              </Pressable>
              <Pressable
                style={[styles.segmentButton, authMode === 'register' && styles.segmentActive]}
                disabled={authLoading}
                onPress={() => setAuthMode('register')}
              >
                <Text style={styles.segmentText}>Register</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.primaryButton, authLoading && styles.disabledButton]}
              disabled={authLoading || !username || !password ||
                (authMode === 'register' && password.length < 8)}
              onPress={submitAuth}
            >
              {authLoading ? (
                <>
                  <ActivityIndicator color="#ffffff" />
                  <Text style={styles.primaryText}>{authProgressLabel(authStage)}</Text>
                </>
              ) : <Text style={styles.primaryText}>Continue</Text>}
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Signed in as {user.name || user.email}</Text>
              {profileSetup === 'loading' ? (
                <View style={styles.inlineStatus}>
                  <ActivityIndicator color="#2563eb" />
                  <Text style={styles.muted}>Preparing notification profile…</Text>
                </View>
              ) : null}
              {profileSetup === 'error' ? (
                <>
                  <Text style={styles.error}>{profileError}</Text>
                  <Pressable style={styles.secondaryButton} onPress={() => void prepareNotificationProfile()}>
                    <MaterialIcons name="refresh" size={18} color="#111827" />
                    <Text style={styles.secondaryText}>Retry notification setup</Text>
                  </Pressable>
                </>
              ) : null}
              <StatusLed label="Send notification readiness" status={readiness.sendStatus} />
              <StatusLed label="Receive notification readiness" status={readiness.receiveStatus} />
              <View style={styles.actions}>
                <Pressable
                  style={[styles.secondaryButton,
                    (profileSetup !== 'ready' || readiness.isTesting) && styles.disabledButton]}
                  disabled={profileSetup !== 'ready' || readiness.isTesting}
                  onPress={readiness.setupAndroidNotifications}
                >
                  <MaterialIcons name="notifications-active" size={18} color="#111827" />
                  <Text style={styles.secondaryText}>Setup Android notifications</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton,
                    (profileSetup !== 'ready' || readiness.isTesting) && styles.disabledButton]}
                  disabled={profileSetup !== 'ready' || readiness.isTesting}
                  onPress={readiness.refreshReadiness}
                >
                  <MaterialIcons name="refresh" size={18} color="#111827" />
                  <Text style={styles.secondaryText}>Retest</Text>
                </Pressable>
                {readiness.receiveStatus.code === 'PERMISSION_DENIED' ? (
                  <Pressable style={styles.secondaryButton} onPress={() => Linking.openSettings()}>
                    <MaterialIcons name="settings" size={18} color="#111827" />
                    <Text style={styles.secondaryText}>Settings</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Send</Text>
              <Pressable
                style={[styles.primaryButton, !canSend && styles.disabledButton]}
                disabled={!canSend}
                onPress={handleSend}
              >
                {notificationJob.isSending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={18} color="#ffffff" />
                    <Text style={styles.primaryText}>Send notification</Text>
                  </>
                )}
              </Pressable>
              {notificationJob.error ? <Text style={styles.error}>{notificationJob.error}</Text> : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Latest job</Text>
              <NotificationJobSummary job={notificationJob.job} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recipients</Text>
              <FlatList
                data={notificationJob.recipients}
                keyExtractor={(item) => item.$id}
                renderItem={({ item }) => <RecipientCard recipient={item} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={<Text style={styles.muted}>Recipient records will appear after fanout starts.</Text>}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    color: '#4b5563',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
  },
  warningText: {
    flex: 1,
    color: '#92400e',
    lineHeight: 18,
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 6,
    paddingVertical: 10,
  },
  segmentActive: {
    backgroundColor: '#ffffff',
  },
  segmentText: {
    color: '#111827',
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.45,
  },
  secondaryButton: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryText: {
    color: '#111827',
    fontWeight: '700',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  separator: {
    height: 10,
  },
  muted: {
    color: '#6b7280',
  },
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  error: {
    color: '#c2410c',
    lineHeight: 18,
  },
});
