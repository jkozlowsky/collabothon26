import { BigButton } from '@/components/onboarding/ui';

type Props = {
  /** False when the same call would fail the same way again: Retry is left out and Continue becomes the main button. */
  retryable: boolean;
  onRetry: () => void;
  onSkip: () => void;
  retryTestID: string;
  skipTestID: string;
};

/** Footer of the flow's error screens: try again, or go on to Learn with the general lessons. */
export function ErrorActions({ retryable, onRetry, onSkip, retryTestID, skipTestID }: Props) {
  return (
    <>
      {retryable && <BigButton label="Retry" onPress={onRetry} testID={retryTestID} />}
      <BigButton label="Continue to Learn" variant={retryable ? 'ghost' : 'primary'} onPress={onSkip} testID={skipTestID} />
    </>
  );
}
