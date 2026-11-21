import { StyleSheet, Text } from 'react-native';

type Props = {
  /** Read out politely by screen readers when it changes (the current loading step, the current question). */
  status?: string;
  /** Read out at once by screen readers when it appears (an error). */
  alert?: string;
};

/**
 * Mounted once above every screen of the flow: a live region that appears already holding its text is not announced,
 * so these must outlive the screens whose messages they carry.
 */
export function LiveRegions({ status, alert }: Props) {
  return (
    <>
      <Text style={styles.offscreen} aria-live="polite" testID="flow-status">
        {status}
      </Text>
      <Text style={styles.offscreen} aria-live="assertive" testID="flow-alert">
        {alert}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
