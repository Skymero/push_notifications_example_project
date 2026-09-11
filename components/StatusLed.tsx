import { StyleSheet, Text, View } from 'react-native';
import type { ReadinessState } from '@/types/notifications';

const colors = {
  green: '#12805c',
  yellow: '#b7791f',
  red: '#c2410c',
};

type Props = {
  label: string;
  status: ReadinessState;
};

export function StatusLed({ label, status }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.led, { backgroundColor: colors[status.color] }]} />
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.code}>{status.code}</Text>
        <Text style={styles.message}>{status.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  led: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  code: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4b5563',
  },
});
