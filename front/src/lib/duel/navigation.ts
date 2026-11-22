import { router } from 'expo-router';

/** Back to the duel lobby; a duel screen opened by deep link has no history, so it replaces instead. */
export function backToLobby() {
  if (router.canGoBack()) router.back();
  else router.replace('/duel');
}
