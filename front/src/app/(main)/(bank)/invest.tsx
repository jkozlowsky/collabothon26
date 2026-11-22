import { useState } from 'react';

import { AllocationCard } from '@/components/bank/AllocationCard';
import { BankScreen } from '@/components/bank/BankScreen';
import { DepotCard } from '@/components/bank/DepotCard';
import { DetailSheet } from '@/components/bank/DetailSheet';
import { AtlasNudge } from '@/components/bank/AtlasNudge';
import { IconButton } from '@/components/bank/IconButton';
import { ListCard } from '@/components/bank/ListCard';
import { ListRow } from '@/components/bank/ListRow';
import { ProductSection } from '@/components/bank/ProductSection';
import { Section } from '@/components/bank/Section';
import { TradeSheet } from '@/components/bank/TradeSheet';
import { useBank } from '@/hooks/useBank';
import { useBankTeasers, useOpenTeaser } from '@/hooks/useBankTeasers';
import { useToast } from '@/hooks/useToast';
import { holdingDetail } from '@/lib/bank/details';
import { formatPercent } from '@/lib/bank/money';
import type { Holding } from '@/types/bank';

function changeTone(change: number) {
  if (change > 0) return 'positive';
  if (change < 0) return 'negative';
  return 'default';
}

/** Bank — Invest (Figma 26:1128). Buying goes through the Atlas nudge first. */
export default function InvestScreen() {
  const { state, money } = useBank();
  const { demoOnly } = useToast();
  const { teasers, ready } = useBankTeasers();
  const openTeaser = useOpenTeaser();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tradeId, setTradeId] = useState<string | null>(null);
  // New key per Buy, so the trade sheet starts at the nudge; closing keeps the key so it can slide out.
  const [tradeOpening, setTradeOpening] = useState(0);

  // Look holdings up by id so open sheets show values updated by an order.
  const selected = state.holdings.find((h) => h.id === selectedId) ?? null;
  const trading = state.holdings.find((h) => h.id === tradeId) ?? null;
  const teaser = teasers.invest;

  const buy = (h: Holding) => {
    setSelectedId(null);
    setTradeOpening((n) => n + 1);
    setTradeId(h.id);
  };

  return (
    <BankScreen
      title="Invest"
      actions={<IconButton icon="search" label="Search investments" onPress={demoOnly} />}
      overlay={<AtlasNudge placement="invest" teaser={teaser} ready={ready} onOpen={openTeaser} testID="fq-teaser-invest" />}
      testID="screen-invest"
    >
      <DepotCard />
      <AllocationCard />

      <ProductSection title="Start investing" tab="invest" />

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
              noteTone={changeTone(h.change)}
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
          openTeaser(teaser);
        }}
      />
    </BankScreen>
  );
}
