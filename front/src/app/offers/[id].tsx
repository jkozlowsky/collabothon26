import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { LessonTopBar } from '@/components/lesson/LessonTopBar';
import { StepLayout } from '@/components/lesson/StepLayout';
import { OfferCard } from '@/components/offers/OfferCard';
import { OffersNote } from '@/components/offers/OffersNote';
import { PathRecap } from '@/components/offers/PathRecap';
import { motion } from '@/components/onboarding/ui';
import { colors } from '@/constants/theme';
import { useSpotlight } from '@/hooks/useSpotlight';
import { offersFor } from '@/lib/offers';
import type { BankOffer, OfferTarget, PathOffers } from '@/types/offers';

const TAB: Record<OfferTarget, Href> = { home: '/', payments: '/payments', credits: '/credits', invest: '/invest' };

const close = () => (router.canGoBack() ? router.back() : router.replace('/map'));

/** Back to the tabs first, then the bank tab: the bank is where the user acts. */
function openTab(target: OfferTarget) {
  if (router.canDismiss()) router.dismissAll();
  router.navigate(TAB[target]);
}

/** The end of a story: what it taught and a push to act, then what the bank offers in the story's area. */
export default function OffersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const path = offersFor(id);
  return (
    <SafeAreaView style={styles.screen} testID="screen-offers">
      {path ? <OffersFlow key={path.story} path={path} /> : <EmptyState icon="briefcase" title="Nothing here for this story" />}
    </SafeAreaView>
  );
}

function OffersFlow({ path }: { path: PathOffers }) {
  const [part, setPart] = useState<'recap' | 'offers'>('recap');
  const spotlight = useSpotlight();
  // The bank tab opens with the picked product's button lit and the rest dimmed.
  const openOffer = (offer: BankOffer) => {
    spotlight.show({ id: offer.spot, title: offer.title, hint: offer.hint });
    openTab(offer.target);
  };

  return (
    <>
      <LessonTopBar
        progress={part === 'recap' ? 0.5 : 1}
        onClose={part === 'recap' ? close : () => setPart('recap')}
        closeLabel={part === 'recap' ? 'Close' : 'Back'}
      />
      <Animated.View key={part} style={[styles.fill, motion.swap]}>
        {part === 'recap' ? (
          <StepLayout footer={<Button label="Take the first step" onPress={() => setPart('offers')} testID="offers-continue" />}>
            <PathRecap path={path} />
          </StepLayout>
        ) : (
          <StepLayout
            kicker="Your first step · in the bank"
            prompt={`**${path.title}**: pick one to see where it is. You decide if and when.`}
            footer={<Button label={path.cta} variant="secondary" onPress={() => openTab(path.target)} testID="offers-open-bank" />}
          >
            {path.offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} onPress={() => openOffer(offer)} />
            ))}
            <OffersNote />
          </StepLayout>
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgCanvas },
  fill: { flex: 1 },
});
