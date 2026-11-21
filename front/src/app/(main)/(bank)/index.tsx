import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { BankCard } from '@/components/bank/BankCard';
import { BankScreen } from '@/components/bank/BankScreen';
import { CommerzbankLogo } from '@/components/bank/CommerzbankLogo';
import { DepotCard } from '@/components/bank/DepotCard';
import { DetailSheet } from '@/components/bank/DetailSheet';
import { AtlasNudge } from '@/components/bank/AtlasNudge';
import { HeroCard } from '@/components/bank/HeroCard';
import { ListCard } from '@/components/bank/ListCard';
import { ListRow } from '@/components/bank/ListRow';
import { ProductSection } from '@/components/bank/ProductSection';
import { QuickAction } from '@/components/bank/QuickAction';
import { Section } from '@/components/bank/Section';
import { TransactionsSheet } from '@/components/bank/TransactionsSheet';
import { ProfileButton } from '@/components/profile/ProfileButton';
import { colors, spacing, type } from '@/constants/theme';
import { useAccount } from '@/hooks/useAccount';
import { useBank } from '@/hooks/useBank';
import { useBankTeasers, useOpenTeaser } from '@/hooks/useBankTeasers';
import { useToast } from '@/hooks/useToast';
import { useTransferSheet } from '@/hooks/useTransferSheet';
import { cardDetail, creditProductDetail, dayLabel, loanDetail, savingsDetail, transactionDetail } from '@/lib/bank/details';
import { maskIban } from '@/lib/bank/money';
import type { Detail } from '@/types/bank';

/** Width of a payment card in the carousel: the next card peeks in from the right, as in Figma. */
const CARD_PEEK = 70;
const PHONE_MAX = 430;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** Bank — Home (Figma 11:452): the first screen of the app. */
export default function OverviewScreen() {
  const { state, money, amountsHidden, toggleAmountsHidden } = useBank();
  const { demoOnly } = useToast();
  const { openTransfer } = useTransferSheet();
  const { teasers, ready } = useBankTeasers();
  const openTeaser = useOpenTeaser();
  const { account: customer, stats } = useAccount();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [allActivity, setAllActivity] = useState(false);
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width, PHONE_MAX) - spacing.xl * 2 - CARD_PEEK;

  const { account, loan, savings, creditProducts, creditCard } = state;
  const cardLimit = creditProducts.find((p) => p.id === 'credit-card');

  return (
    <BankScreen
      testID="screen-overview"
      overlay={<AtlasNudge placement="home" teaser={teasers.home} ready={ready} streak={stats?.currentStreak} onOpen={openTeaser} testID="fq-teaser-home" />}
    >
      {/* Commerzbank emblem top left; the greeting sits by the profile avatar on the right. */}
      <View style={styles.header}>
        <CommerzbankLogo height={32} />
        <View style={styles.hello}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.name} testID="owner-name" numberOfLines={1}>
            {customer ? `${customer.firstName} ${customer.lastName}` : state.owner.name}
          </Text>
        </View>
        <ProfileButton />
      </View>

      <HeroCard
        label="Main account · available"
        amount={money(account.balance)}
        amountTestID="main-balance"
        caption={maskIban(account.iban)}
        hidden={amountsHidden}
        onToggleHidden={toggleAmountsHidden}
        stats={[
          { label: 'In this month', value: money(account.monthIn, { signed: true }), tone: 'positive' },
          { label: 'Out this month', value: money(-account.monthOut) },
        ]}
      />

      <View style={styles.actions}>
        <QuickAction icon="transfer" label="Transfer" onPress={() => openTransfer()} testID="action-transfer" />
        <QuickAction icon="scan" label="Scan & pay" onPress={demoOnly} />
        <QuickAction icon="plus" label="Top up" onPress={demoOnly} />
        <QuickAction icon="more" label="More" onPress={demoOnly} />
      </View>

      <Section title="Cards" action={{ label: 'Manage', onPress: demoOnly }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + spacing.md}
          decelerationRate="fast"
          style={styles.cardsBleed}
          contentContainerStyle={styles.cards}
        >
          {state.cards.map((c) => (
            <BankCard key={c.id} card={c} width={cardWidth} onPress={() => setDetail(cardDetail(c, creditCard, money))} />
          ))}
        </ScrollView>
      </Section>

      <Section title="Investments" action={{ label: 'Open depot', onPress: () => router.navigate('/invest') }}>
        <DepotCard />
      </Section>

      <Section title="Credits & savings" action={{ label: 'See all', onPress: () => router.navigate('/credits') }}>
        <ListCard>
          {loan.remaining > 0 && (
            <ListRow
              icon="percent"
              title="Instalment loan"
              meta={`${loan.paidInstalments} of ${loan.totalInstalments} instalments paid`}
              value={money(loan.remaining)}
              valueNote="remaining"
              onPress={() => setDetail(loanDetail(loan, money))}
            />
          )}
          {cardLimit && (
            <ListRow
              icon="card"
              title={cardLimit.title}
              meta={cardLimit.meta}
              value={money(cardLimit.amount)}
              valueNote={cardLimit.amountNote}
              onPress={() => setDetail(creditProductDetail(cardLimit, money))}
            />
          )}
          <ListRow
            icon="safe"
            title="Savings account"
            meta={`${savings.rate}% p.a. · daily access`}
            value={money(savings.balance)}
            valueNote={`${money(savings.interestYtd, { signed: true })} interest`}
            onPress={() => setDetail(savingsDetail(savings, money))}
          />
        </ListCard>
      </Section>

      <ProductSection title="Save" tab="home" />

      <Section title="Recent activity" action={{ label: 'See all', onPress: () => setAllActivity(true), testID: 'activity-see-all' }}>
        <ListCard testID="recent-activity">
          {state.transactions.slice(0, 4).map((t) => (
            <ListRow
              key={t.id}
              icon={t.icon}
              title={t.title}
              meta={`${dayLabel(t.daysAgo)} · ${t.category}`}
              value={money(t.amount, { signed: true })}
              valueNote={t.source}
              tone={t.amount > 0 ? 'positive' : 'default'}
              onPress={() => setDetail(transactionDetail(t, money))}
              testID={`activity-${t.id}`}
            />
          ))}
        </ListCard>
      </Section>

      <TransactionsSheet visible={allActivity} onClose={() => setAllActivity(false)} onSelect={(t) => setDetail(transactionDetail(t, money))} />
      <DetailSheet detail={detail} onClose={() => setDetail(null)} />
    </BankScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: -spacing.sm },
  hello: { flex: 1, alignItems: 'flex-end' },
  greeting: { ...type.labelDefault, color: colors.textMuted },
  name: type.titleCard,
  actions: { flexDirection: 'row', marginTop: -spacing.xs },
  // The carousel runs to the screen edge while its first card lines up with the page padding.
  cardsBleed: { marginHorizontal: -spacing.xl },
  cards: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.sm },
});
