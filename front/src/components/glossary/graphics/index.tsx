import type { ReactElement } from 'react';

import { BarGraphic } from '@/components/glossary/graphics/BarGraphic';
import { DiversificationGraphic } from '@/components/glossary/graphics/DiversificationGraphic';

function CompoundGrowthGraphic() {
  return (
    <BarGraphic
      testID="graphic-compound-growth"
      title="How € 1,000 grows at 5% a year"
      caption="Interest earns interest, so growth speeds up over time."
      emphasis={3}
      bars={[
        { label: 'Today', valueLabel: '€ 1,000', value: 1000 },
        { label: '10 yrs', valueLabel: '€ 1,630', value: 1629 },
        { label: '20 yrs', valueLabel: '€ 2,650', value: 2653 },
        { label: '30 yrs', valueLabel: '€ 4,320', value: 4322 },
      ]}
    />
  );
}

function InflationPowerGraphic() {
  return (
    <BarGraphic
      testID="graphic-inflation-power"
      title="What € 100 can buy at 3% inflation"
      caption="The same money buys less every year if prices keep rising."
      emphasis={2}
      bars={[
        { label: 'Today', valueLabel: '100%', value: 100 },
        { label: '10 yrs', valueLabel: '74%', value: 74 },
        { label: '20 yrs', valueLabel: '55%', value: 55 },
      ]}
    />
  );
}

/** graphic_key from the backend -> drawing. An unknown key draws nothing instead of crashing. */
const GRAPHICS: Record<string, () => ReactElement> = {
  'compound-growth': CompoundGrowthGraphic,
  'inflation-power': InflationPowerGraphic,
  diversification: DiversificationGraphic,
};

export function TermGraphic({ graphicKey }: { graphicKey: string | null }) {
  const Graphic = graphicKey ? GRAPHICS[graphicKey] : undefined;
  return Graphic ? <Graphic /> : null;
}
