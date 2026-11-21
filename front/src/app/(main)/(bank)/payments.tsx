import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BankScreen } from '@/components/bank/BankScreen';
import { ContactAvatar } from '@/components/bank/ContactAvatar';
import { DetailSheet } from '@/components/bank/DetailSheet';
import { IconButton } from '@/components/bank/IconButton';
import { ListCard } from '@/components/bank/ListCard';
import { ListRow } from '@/components/bank/ListRow';
import { ProductSection } from '@/components/bank/ProductSection';
import { QuickAction } from '@/components/bank/QuickAction';
import { Section } from '@/components/bank/Section';
import { spacing } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { useToast } from '@/hooks/useToast';
import { useTransferSheet } from '@/hooks/useTransferSheet';
import { standingOrderDetail } from '@/lib/bank/details';
import type { Detail } from '@/types/bank';

/** Bank — Payments (Figma 26:725). */
export default function PaymentsScreen() {
  const { state, money } = useBank();
  const { demoOnly } = useToast();
  const { openTransfer } = useTransferSheet();
  const [detail, setDetail] = useState<Detail | null>(null);

  return (
    <BankScreen title="Payments" actions={<IconButton icon="search" label="Search payments" onPress={demoOnly} />} testID="screen-payments">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.contacts}>
        <View style={styles.newContact}>
          <QuickAction icon="plus" label="New" variant="accent" onPress={() => openTransfer({ kind: 'new' })} testID="contact-new" />
        </View>
        {state.contacts.map((c) => (
          <ContactAvatar key={c.id} contact={c} onPress={() => openTransfer({ kind: 'contact', contactId: c.id })} />
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <QuickAction icon="card" label="To card" onPress={demoOnly} />
        <QuickAction icon="transfer" label="By IBAN" onPress={() => openTransfer({ kind: 'new' })} testID="action-by-iban" />
        <QuickAction icon="scan" label="Scan & pay" onPress={demoOnly} />
        <QuickAction icon="phone" label="Top up phone" onPress={demoOnly} />
      </View>

      <ProductSection title="Set up" tab="payments" />

      <Section title="Standing orders" action={{ label: 'Add', onPress: demoOnly }}>
        <ListCard>
          {state.standingOrders.map((o) => (
            <ListRow
              key={o.id}
              icon={o.icon}
              title={o.title}
              meta={o.interval}
              value={money(o.amount, { signed: true })}
              valueNote={o.next}
              onPress={() => setDetail(standingOrderDetail(o, money))}
            />
          ))}
        </ListCard>
      </Section>

      <Section title="Pending" action={{ label: 'See all', onPress: demoOnly }}>
        <ListCard testID="pending-list">
          {state.pending.map((p) => (
            <ListRow key={p.id} icon={p.icon} title={p.title} meta={p.meta} value={money(p.amount, { signed: true })} valueNote={p.when} />
          ))}
        </ListCard>
      </Section>

      <DetailSheet detail={detail} onClose={() => setDetail(null)} />
    </BankScreen>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -spacing.xl },
  contacts: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  newContact: { width: 60 },
  actions: { flexDirection: 'row' },
});
