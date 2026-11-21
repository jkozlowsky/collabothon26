/** The app's route tree for expo-router/testing-library `renderRouter`. Keep in sync with src/app. */
import MainLayout from '@/app/(main)/_layout';
import BankLayout from '@/app/(main)/(bank)/_layout';
import CreditsScreen from '@/app/(main)/(bank)/credits';
import OverviewScreen from '@/app/(main)/(bank)/index';
import InvestScreen from '@/app/(main)/(bank)/invest';
import PaymentsScreen from '@/app/(main)/(bank)/payments';
import LearnLayout from '@/app/(main)/(learn)/_layout';
import DuelLobbyScreen from '@/app/(main)/(learn)/duel';
import DefinitionScreen from '@/app/(main)/(learn)/glossary/[slug]';
import GlossaryLayout from '@/app/(main)/(learn)/glossary/_layout';
import GlossaryScreen from '@/app/(main)/(learn)/glossary/index';
import MapScreen from '@/app/(main)/(learn)/map';
import ProfileScreen from '@/app/(main)/(learn)/profile';
import ScenePreviewScreen from '@/app/dev/scene/[lessonId]/[sceneId]';
import DuelMatchScreen from '@/app/duel/match';
import DuelRankingsScreen from '@/app/duel/rankings';
import RootLayout from '@/app/_layout';
import CategorizingScreen from '@/app/categorizing';
import LearningPathScreen from '@/app/learning-path';
import LessonScreen from '@/app/lesson/[id]';
import OnboardingScreen from '@/app/onboarding';
import StoryScreen from '@/app/story/[id]';

export const appRoutes = {
  _layout: RootLayout,
  onboarding: OnboardingScreen,
  categorizing: CategorizingScreen,
  'learning-path': LearningPathScreen,
  'lesson/[id]': LessonScreen,
  'story/[id]': StoryScreen,
  '(main)/_layout': MainLayout,
  '(main)/(bank)/_layout': BankLayout,
  '(main)/(bank)/index': OverviewScreen,
  '(main)/(bank)/payments': PaymentsScreen,
  '(main)/(bank)/credits': CreditsScreen,
  '(main)/(bank)/invest': InvestScreen,
  '(main)/(learn)/_layout': LearnLayout,
  '(main)/(learn)/map': MapScreen,
  '(main)/(learn)/glossary/_layout': GlossaryLayout,
  '(main)/(learn)/glossary/index': GlossaryScreen,
  '(main)/(learn)/glossary/[slug]': DefinitionScreen,
  '(main)/(learn)/duel': DuelLobbyScreen,
  '(main)/(learn)/profile': ProfileScreen,
  'duel/match': DuelMatchScreen,
  'duel/rankings': DuelRankingsScreen,
  'dev/scene/[lessonId]/[sceneId]': ScenePreviewScreen,
};
