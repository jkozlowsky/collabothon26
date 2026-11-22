import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/AsyncContent';
import { RankingsContent } from '@/components/duel/rankings/RankingsContent';
import { RankingsHeader } from '@/components/duel/rankings/RankingsHeader';
import { colors } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { backToLobby } from '@/lib/duel/navigation';
import { useCurrentUser } from '@/lib/user';
import type { Rankings } from '@/types/duel';

const rankingsPath = (userId: string) => `/api/duel/rankings?userId=${encodeURIComponent(userId)}`;

/** Weekly overall rankings (Figma frames 04–06, nodes 166:5622 / 166:6337 / 166:7025). */
export default function DuelRankingsScreen() {
  const { userId } = useCurrentUser();
  const { data, loading, error, reload } = useApi<Rankings>(rankingsPath(userId));

  return (
    <SafeAreaView style={styles.safe} testID="screen-duel-rankings">
      <StatusBar style="light" />
      <RankingsHeader onBack={backToLobby} />
      <AsyncContent loading={loading} error={error} onRetry={reload}>
        {() => <RankingsContent top={data?.top ?? []} me={data?.me ?? null} currentUserId={userId} />}
      </AsyncContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
  },
});
