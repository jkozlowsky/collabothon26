import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/bank/Sheet';
import { Slider } from '@/components/bank/Slider';
import { colors, radii, spacing, type } from '@/constants/theme';
import { loanQuote } from '@/lib/bank/loan';
import { formatEUR } from '@/lib/bank/money';

type Props = { visible: boolean; onClose: () => void };

/** Rate shown on the Credits tab ("From 4.9% APR"). */
const APR = 4.9;

/** Read-only maths: what a loan costs per month and in total. No "apply" button on purpose. */
export function LoanCalculatorSheet({ visible, onClose }: Props) {
  const [principal, setPrincipal] = useState(1000000);
  const [months, setMonths] = useState(48);
  const quote = loanQuote(principal, months, APR);

  return (
    <Sheet visible={visible} onClose={onClose} title="Loan calculator" testID="loan-calculator">
      <View style={styles.result}>
        <Text style={styles.resultLabel}>Monthly instalment</Text>
        <Text style={styles.monthly} testID="loan-monthly">
          {formatEUR(quote.monthly)}
        </Text>
        <Text style={styles.resultLabel}>at {APR}% APR</Text>
      </View>

      <View style={styles.control}>
        <View style={styles.controlTop}>
          <Text style={styles.controlLabel}>Amount</Text>
          <Text style={styles.controlValue}>{formatEUR(principal, { whole: true })}</Text>
        </View>
        <Slider value={principal} min={100000} max={5000000} step={50000} onChange={setPrincipal} accessibilityLabel="Loan amount" testID="loan-amount" />
      </View>
      <View style={styles.control}>
        <View style={styles.controlTop}>
          <Text style={styles.controlLabel}>Term</Text>
          <Text style={styles.controlValue}>{months} months</Text>
        </View>
        <Slider value={months} min={12} max={96} step={6} onChange={setMonths} accessibilityLabel="Loan term in months" testID="loan-term" />
      </View>

      <View style={styles.totals}>
        <View style={styles.total}>
          <Text style={styles.controlLabel}>Total interest</Text>
          <Text style={styles.totalValue} testID="loan-interest">
            {formatEUR(quote.totalInterest)}
          </Text>
        </View>
        <View style={styles.total}>
          <Text style={styles.controlLabel}>Total repaid</Text>
          <Text style={styles.totalValue}>{formatEUR(quote.totalRepaid)}</Text>
        </View>
      </View>
      <Text style={styles.note}>
        APR is the yearly cost of borrowing, interest and fees included. A longer term lowers the monthly instalment but raises the total
        interest — move the term slider to see by how much.
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  result: { alignItems: 'center', gap: 2, paddingVertical: spacing.sm },
  resultLabel: { ...type.labelDefault, color: colors.textMuted },
  monthly: type.displayAmount,
  control: { gap: spacing.xs },
  controlTop: { flexDirection: 'row', justifyContent: 'space-between' },
  controlLabel: { ...type.labelDefault, color: colors.textMuted },
  controlValue: type.labelStrong,
  totals: { flexDirection: 'row', gap: spacing.sm },
  total: { flex: 1, backgroundColor: colors.bgCanvas, borderRadius: radii.button, padding: spacing.md, gap: 2 },
  totalValue: type.titleCard,
  note: { ...type.bodyDefault, color: colors.textMuted },
});
