import { StyleSheet, Text, View } from 'react-native';
import type { NotificationRecipient } from '@/types/notifications';

type Props = {
  recipient: NotificationRecipient;
};

export function RecipientCard({ recipient }: Props) {
  const lastChange =
    recipient.openedAt ?? recipient.receivedAt ?? recipient.dispatchedAt ?? 'Waiting for update';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{recipient.username || recipient.recipientUserId}</Text>
        <Text style={styles.platform}>{recipient.platform || 'device'}</Text>
      </View>
      <Text style={styles.line}>Provider: {recipient.dispatchStatus}</Text>
      <Text style={styles.line}>Device receipt: {recipient.receiptStatus}</Text>
      <Text style={styles.timestamp}>{lastChange}</Text>
      {recipient.failureMessage ? <Text style={styles.failure}>{recipient.failureMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    gap: 4,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  platform: {
    color: '#6b7280',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  line: {
    color: '#374151',
  },
  timestamp: {
    color: '#6b7280',
    fontSize: 12,
  },
  failure: {
    color: '#c2410c',
    fontSize: 13,
  },
});
