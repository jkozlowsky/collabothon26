import { StyleSheet, Text, View } from 'react-native';

import { ListCard } from '@/components/bank/ListCard';
import { ListRow } from '@/components/bank/ListRow';
import { Sheet } from '@/components/bank/Sheet';
import { colors, spacing, type } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { dayLabel } from '@/lib/bank/details';
import type { Transaction } from '@/types/bank';

type Props = { visible: boolean; onClose: () => void; onSelect: (t: Transaction) => void };

/** "See all" for Recent activity: the full seeded history grouped by day. */
export function TransactionsSheet({ visible, onClose, onSelect }: Props) {
  const { state, money } = useBank();
  const groups = new Map<number, Transaction[]>();
  for (const t of state.transactions) groups.set(t.daysAgo, [...(groups.get(t.daysAgo) ?? []), t]);

  return (
    <Sheet visible={visible} onClose={onClose} title="All activity" testID="transactions-sheet">
      {[...groups.entries()].map(([days, rows]) => (
        <View key={days} style={styles.group}>
          <Text style={styles.day}>{dayLabel(days)}</Text>
          <ListCard>
            {rows.map((t) => (
              <ListRow
                key={t.id}
                icon={t.icon}
                title={t.title}
                meta={`${t.category} · ${t.time}`}
                value={money(t.amount, { signed: true })}
                valueNote={t.source}
                tone={t.amount > 0 ? 'positive' : 'default'}
                onPress={() => onSelect(t)}
              />
            ))}
          </ListCard>
        </View>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm, marginBottom: spacing.sm },
  day: { ...type.overline, color: colors.textMuted },
});
