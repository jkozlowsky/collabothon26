import { useState } from 'react';

import { AllocationCard } from '@/components/bank/AllocationCard';
import { BankScreen } from '@/components/bank/BankScreen';
import { DepotCard } from '@/components/bank/DepotCard';
import { DetailSheet } from '@/components/bank/DetailSheet';
import { FqTeaserCard } from '@/components/bank/FqTeaserCard';
import { IconButton } from '@/components/bank/IconButton';
import { ListCard } from '@/components/bank/ListCard';
import { ListRow } from '@/components/bank/ListRow';
import { Section } from '@/components/bank/Section';
import { TradeSheet } from '@/components/bank/TradeSheet';
import { useBank } from '@/hooks/useBank';
import { useOpenLearnFocus } from '@/hooks/useOpenLearn';
import { useToast } from '@/hooks/useToast';
import { holdingDetail } from '@/lib/bank/details';
import { formatPercent } from '@/lib/bank/money';
import type { Holding } from '@/types/bank';

/** Bank — Invest (Figma 26:1128). Buying goes through the Atlas nudge first. */
export default function InvestScreen() {
  const { state, money } = useBank();
  const { demoOnly } = useToast();
  const openLearnFocus = useOpenLearnFocus();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tradeId, setTradeId] = useState<string | null>(null);
  // New key per Buy, so the trade sheet starts at the nudge; closing keeps the key so it can slide out.
  const [tradeOpening, setTradeOpening] = useState(0);

  // Look holdings up by id so open sheets show values updated by an order.
  const selected = state.holdings.find((h) => h.id === selectedId) ?? null;
  const trading = state.holdings.find((h) => h.id === tradeId) ?? null;
  const teaser = state.teasers.invest;

  const buy = (h: Holding) => {
    setSelectedId(null);
    setTradeOpening((n) => n + 1);
    setTradeId(h.id);
  };

  return (
    <BankScreen title="Invest" actions={<IconButton icon="search" label="Search investments" onPress={demoOnly} />} testID="screen-invest">
      <DepotCard />
      <AllocationCard />
      <FqTeaserCard teaser={teaser} onPress={() => openLearnFocus(teaser.focus)} testID="fq-teaser-invest" />

      <Section title="Holdings" action={{ label: 'Sort', onPress: demoOnly }}>
        <ListCard testID="holdings">
          {state.holdings.map((h) => (
            <ListRow
              key={h.id}
              icon={h.icon}
              title={h.name}
              meta={h.meta}
              value={money(h.value)}
              valueNote={formatPercent(h.change)}
              noteTone={h.change > 0 ? 'positive' : h.change < 0 ? 'negative' : 'default'}
              onPress={() => setSelectedId(h.id)}
              testID={`holding-${h.id}`}
            />
          ))}
        </ListCard>
      </Section>

      <DetailSheet
        detail={selected && holdingDetail(selected, money)}
        onClose={() => setSelectedId(null)}
        action={selected && selected.assetClass !== 'cash' ? { label: 'Buy', onPress: () => buy(selected), testID: 'holding-buy' } : undefined}
      />
      <TradeSheet
        key={tradeOpening}
        holding={trading}
        onClose={() => setTradeId(null)}
        onLearn={() => {
          setTradeId(null);
          openLearnFocus(teaser.focus);
        }}
      />
    </BankScreen>
  );
}
