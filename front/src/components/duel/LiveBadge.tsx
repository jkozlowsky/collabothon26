import { StatusChip } from '@/components/duel/StatusChip';

/** "LIVE" pill on the rival of a live duel: a real person, not the simulated rival. */
export function LiveBadge({ testID = 'live-badge' }: { testID?: string }) {
  return <StatusChip label="LIVE" tone="online" dot testID={testID} />;
}
