import { StyleSheet, Text, View } from 'react-native';
import type { NotificationJob } from '@/types/notifications';

type Props = {
  job: NotificationJob | null;
};

export function NotificationJobSummary({ job }: Props) {
  if (!job) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No notification job has been sent yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Job {job.jobId}</Text>
      <Text style={styles.status}>{job.status}</Text>
      <View style={styles.metrics}>
        <Metric label="Targets" value={job.targetCount} />
        <Metric label="Accepted" value={job.providerAcceptedCount} />
        <Metric label="Rejected" value={job.providerRejectedCount} />
        <Metric label="Confirmed" value={job.confirmedCount} />
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: 14,
  },
  emptyText: {
    color: '#6b7280',
  },
  container: {
    gap: 8,
    paddingVertical: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  status: {
    color: '#4b5563',
    textTransform: 'capitalize',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    minWidth: 72,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
});
