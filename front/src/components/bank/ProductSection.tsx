import { useState } from 'react';

import { DetailSheet } from '@/components/bank/DetailSheet';
import { ListCard } from '@/components/bank/ListCard';
import { ProductRow } from '@/components/bank/ProductRow';
import { Section } from '@/components/bank/Section';
import { SpotTarget } from '@/components/spotlight/SpotTarget';
import { useToast } from '@/hooks/useToast';
import { productsIn, type BankProduct, type ProductTab } from '@/lib/bank/products';

type Props = { title: string; tab: ProductTab };

/** The products of one bank tab. A button opens the product's start sheet; the application stops at a demo note. */
export function ProductSection({ title, tab }: Props) {
  const { show } = useToast();
  const [open, setOpen] = useState<BankProduct | null>(null);

  return (
    <Section title={title}>
      <ListCard testID={`products-${tab}`}>
        {productsIn(tab).map((product) => (
          <SpotTarget key={product.id} id={product.id}>
            <ProductRow product={product} onPress={() => setOpen(product)} />
          </SpotTarget>
        ))}
      </ListCard>
      <DetailSheet
        detail={open && { title: open.title, subtitle: open.meta, icon: open.icon, rows: open.terms, note: open.steps }}
        onClose={() => setOpen(null)}
        action={
          open
            ? {
                label: `${open.cta} · start application`,
                onPress: () => {
                  setOpen(null);
                  show(`Demo · the ${open.title.toLowerCase()} application is not part of this prototype`);
                },
                testID: 'product-start',
              }
            : undefined
        }
      />
    </Section>
  );
}
