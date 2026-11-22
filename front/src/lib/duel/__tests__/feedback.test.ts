import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { haptic, playSound } from '@/lib/duel/feedback';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

describe('feedback helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('playSound', () => {
    it('plays sound effects without throwing', () => {
      expect(() => {
        playSound('correct');
        playSound('wrong');
        playSound('win');
        playSound('level-up');
        playSound('rank-up');
      }).not.toThrow();
    });
  });

  describe('haptic', () => {
    const originalOS = Platform.OS;

    afterEach(() => {
      (Platform as { OS: string }).OS = originalOS;
    });

    it('triggers haptics on native platforms', () => {
      (Platform as { OS: string }).OS = 'ios';

      haptic('success');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);

      haptic('error');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);

      haptic('light');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('is a no-op on web', () => {
      (Platform as { OS: string }).OS = 'web';

      haptic('success');
      haptic('error');
      haptic('light');

      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });
});
