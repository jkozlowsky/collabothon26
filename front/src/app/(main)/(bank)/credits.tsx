import { useState } from 'react';

import { BankScreen } from '@/components/bank/BankScreen';
import { DetailSheet } from '@/components/bank/DetailSheet';
import { FqTeaserCard } from '@/components/bank/FqTeaserCard';
import { HeroCard } from '@/components/bank/HeroCard';
import { IconButton } from '@/components/bank/IconButton';
import { ListCard } from '@/components/bank/ListCard';
import { ListRow } from '@/components/bank/ListRow';
import { LoanCalculatorSheet } from '@/components/bank/LoanCalculatorSheet';
import { ProductSection } from '@/components/bank/ProductSection';
import { Section } from '@/components/bank/Section';
import { SpotTarget } from '@/components/spotlight/SpotTarget';
import { useBank } from '@/hooks/useBank';
import { useOpenLearnFocus } from '@/hooks/useOpenLearn';
import { useToast } from '@/hooks/useToast';
import { creditProductDetail } from '@/lib/bank/details';
import type { Detail } from '@/types/bank';

/** Bank — Credits (Figma 26:932). */
export default function CreditsScreen() {
  const { state, money, amountsHidden, toggleAmountsHidden } = useBank();
  const { demoOnly } = useToast();
  const openLearnFocus = useOpenLearnFocus();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [calculator, setCalculator] = useState(false);
  const { loan } = state;

  return (
    <BankScreen title="Credits" actions={<IconButton icon="calendar" label="Payment calendar" onPress={demoOnly} />} testID="screen-credits">
      <HeroCard
        label="Instalment loan · remaining"
        amount={money(loan.remaining)}
        caption={`${loan.paidInstalments} of ${loan.totalInstalments} instalments paid`}
        hidden={amountsHidden}
        onToggleHidden={toggleAmountsHidden}
        stats={[
          { label: 'Next payment', value: `${money(loan.nextPayment)} · ${loan.nextDate}` },
          { label: 'Interest rate', value: `${loan.apr}% APR` },
        ]}
      />

      <FqTeaserCard teaser={state.teasers.credits} onPress={() => openLearnFocus(state.teasers.credits.focus)} testID="fq-teaser-credits" />

      <Section title="Your credit products" action={{ label: 'See all', onPress: demoOnly }}>
        <ListCard>
          {state.creditProducts.map((p) => (
            <ListRow
              key={p.id}
              icon={p.icon}
              title={p.title}
              meta={p.meta}
              value={money(p.amount)}
              valueNote={p.amountNote}
              onPress={() => setDetail(creditProductDetail(p, money))}
            />
          ))}
        </ListCard>
      </Section>

      <ProductSection title="Apply" tab="credits" />

      <Section title="Explore">
        <ListCard>
          <SpotTarget id="loan-calculator">
            <ListRow icon="pie" title="Loan calculator" meta="See the monthly cost first" value="From 4.9%" valueNote="APR" onPress={() => setCalculator(true)} testID="open-loan-calculator" />
          </SpotTarget>
        </ListCard>
      </Section>

      <DetailSheet detail={detail} onClose={() => setDetail(null)} />
      <LoanCalculatorSheet visible={calculator} onClose={() => setCalculator(false)} />
    </BankScreen>
  );
}
