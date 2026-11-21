import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Keypad } from '@/components/bank/Keypad';
import { Sheet } from '@/components/bank/Sheet';
import { Button } from '@/components/Button';
import { GlobeSphere } from '@/components/onboarding/Globe';
import { motion } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { useToast } from '@/hooks/useToast';
import { formatEUR, parseAmount } from '@/lib/bank/money';
import { validateOrder } from '@/lib/bank/reducer';
import { largestPosition } from '@/lib/bank/selectors';
import type { Holding } from '@/types/bank';

type Props = {
  holding: Holding | null;
  onClose: () => void;
  /** "Learn first": opens the diversification lesson in Atlas. */
  onLearn: () => void;
};

/**
 * Buy flow with a Atlas nudge in front of it. The nudge explains, it does not advise:
 * it shows the user's own concentration and offers a short lesson before they decide.
 */
/** The parent re-keys this per opening, so it always starts at the nudge. */
export function TradeSheet({ holding: next, onClose, onLearn }: Props) {
  // Keep the last holding while the sheet slides out after it was closed.
  const [holding, setHolding] = useState(next);
  if (next && next !== holding) setHolding(next);
  const { state, placeOrder } = useBank();
  const { show } = useToast();
  const [step, setStep] = useState<'nudge' | 'ticket'>('nudge');
  const [amountText, setAmountText] = useState('');

  const amount = parseAmount(amountText) ?? 0;
  const error = holding && amount > 0 ? validateOrder(state, { holdingId: holding.id, amount }) : null;
  const cash = state.holdings.find((h) => h.assetClass === 'cash')?.value ?? 0;
  const top = largestPosition(state);
  const estUnits = holding?.units ? Math.round(((holding.units * amount) / holding.value) * 100) / 100 : null;

  const confirm = () => {
    if (!holding || placeOrder({ holdingId: holding.id, amount })) return;
    onClose();
    show(`Demo order placed · ${formatEUR(amount)} in ${holding.name}`);
  };

  return (
    <Sheet
      visible={!!next}
      onClose={onClose}
      title={step === 'nudge' ? 'Before you trade' : `Buy ${holding?.name ?? ''}`}
      onBack={step === 'ticket' ? () => setStep('nudge') : undefined}
      testID="trade-sheet"
    >
      <Animated.View key={step} style={[styles.step, motion.swap]}>
        {step === 'nudge' && (
          <>
            <View style={styles.nudge}>
              <GlobeSphere size={56} />
              <View style={styles.nudgeBody}>
                <Text style={styles.overline}>Atlas · 3 min</Text>
                <Text style={styles.nudgeTitle}>Diversification, before you decide</Text>
              </View>
            </View>
            <Text style={styles.body}>
              {Math.round(top.share * 100)}% of your depot is in one position ({top.name}). A short lesson shows what spreading money across
              positions does to risk, using your own numbers. We explain; the decision stays yours.
            </Text>
            <Button label="Learn first" onPress={onLearn} testID="trade-learn" />
            <Button label="Continue to order" variant="secondary" onPress={() => setStep('ticket')} testID="trade-continue" />
          </>
        )}
        {step === 'ticket' && holding && (
          <>
            <Text style={styles.amount} testID="trade-amount">
              € {amountText || '0'}
            </Text>
            <Text style={styles.meta}>
              {estUnits !== null && amount > 0 ? `≈ ${estUnits} units · ` : ''}Depot cash: {formatEUR(cash)}
            </Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <Keypad value={amountText} onChange={setAmountText} />
            <Text style={styles.disclaimer}>Demo · no real order is placed and no money moves.</Text>
            <Button label="Place demo order" disabled={amount <= 0 || !!error} onPress={confirm} testID="trade-confirm" />
          </>
        )}
      </Animated.View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  step: { gap: spacing.md },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.brandAccentSoft,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  nudgeBody: { flex: 1, gap: 2 },
  overline: { ...type.overline, color: colors.brandPrimary },
  nudgeTitle: type.titleCard,
  body: { ...type.bodyDefault, color: colors.textMuted },
  amount: { ...type.displayAmount, fontSize: 40, lineHeight: 48, textAlign: 'center' },
  meta: { ...type.labelDefault, color: colors.textMuted, textAlign: 'center', marginTop: -spacing.sm },
  error: { ...type.labelStrong, color: colors.feedbackDanger, textAlign: 'center' },
  disclaimer: { ...type.labelDefault, color: colors.textMuted, textAlign: 'center' },
});
