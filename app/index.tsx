import { useEffect, useMemo, useState } from 'react';
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
  type AuthUser,
  getCurrentUser,
  registerWithUsername,
  signInWithUsername,
  signOut,
} from '@/lib/appwrite/auth';
import { deactivateCurrentDeviceToken } from '@/lib/push-notifications/deviceRegistration';
import { useNotificationReadiness } from '@/hooks/useNotificationReadiness';
import { useNotificationJob } from '@/hooks/useNotificationJob';
import { StatusLed } from '@/components/StatusLed';
import { NotificationJobSummary } from '@/components/NotificationJobSummary';
import { RecipientCard } from '@/components/RecipientCard';

export default function HomeScreen() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'sign-in' | 'register'>('sign-in');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const readiness = useNotificationReadiness(authLoading ? null : user);
  const notificationJob = useNotificationJob(user?.$id ?? null);

  const canSend = useMemo(
    () => Boolean(user) && !authLoading && readiness.sendStatus.color === 'green' && !notificationJob.isSending,
    [user, authLoading, notificationJob.isSending, readiness.sendStatus.color],
  );

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .finally(() => setAuthLoading(false));
  }, []);

  async function submitAuth() {
    setAuthError(null);
    setAuthLoading(true);
    console.log('[AUTH] Starting auth, mode:', authMode, 'username:', username);

    try {
      const nextUser =
        authMode === 'register'
          ? await registerWithUsername(username, password)
          : await signInWithUsername(username, password);
       console.log('[AUTH] Success, user:', nextUser);
      setUser(nextUser);
    } catch (error) {
      console.error('[AUTH] Failed:', error);
      setAuthError('Authentication failed. Check Appwrite config, username, and password.');
    } finally {
      console.log('[AUTH] Finally block, setting loading false');
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    setAuthLoading(true);
    try {
      if (user) await deactivateCurrentDeviceToken(user.$id);
      await signOut();
      setUser(null);
      setPassword('');
    } catch {
      Alert.alert('Sign out failed', 'This device could not be deactivated or the session could not be closed. Check your connection and retry.');
    } finally {
      setAuthLoading(false);
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
                onPress={() => setAuthMode('sign-in')}
              >
                <Text style={styles.segmentText}>Sign in</Text>
              </Pressable>
              <Pressable
                style={[styles.segmentButton, authMode === 'register' && styles.segmentActive]}
                onPress={() => setAuthMode('register')}
              >
                <Text style={styles.segmentText}>Register</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.primaryButton, authLoading && styles.disabledButton]}
              disabled={!username || password.length < 3}
              onPress={submitAuth}
            >
              {authLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryText}>Continue</Text>}
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Signed in as {user.name || user.email}</Text>
              <StatusLed label="Send notification readiness" status={readiness.sendStatus} />
              <StatusLed label="Receive notification readiness" status={readiness.receiveStatus} />
              <View style={styles.actions}>
                <Pressable
                  style={[styles.secondaryButton, readiness.isTesting && styles.disabledButton]}
                  disabled={readiness.isTesting}
                  onPress={readiness.setupAndroidNotifications}
                >
                  <MaterialIcons name="notifications-active" size={18} color="#111827" />
                  <Text style={styles.secondaryText}>Setup Android notifications</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton, readiness.isTesting && styles.disabledButton]}
                  disabled={readiness.isTesting}
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
  error: {
    color: '#c2410c',
    lineHeight: 18,
  },
});
