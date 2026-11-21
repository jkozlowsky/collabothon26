import { fireEvent, render } from '@testing-library/react-native';

import { ArenaCallout } from '@/components/globe/ArenaCallout';
import { ArenaPin } from '@/components/globe/ArenaPin';
import { ColosseumIcon } from '@/components/globe/ColosseumIcon';

describe('ArenaPin and ArenaCallout components', () => {
  it('renders ColosseumIcon svg correctly', async () => {
    const { toJSON } = await render(<ColosseumIcon size={24} color="#FFCC00" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders ArenaPin with label Arena and handles press', async () => {
    const onPress = jest.fn();
    const { getByTestId, getByText } = await render(<ArenaPin onPress={onPress} />);

    expect(getByTestId('globe-pin-arena')).toBeTruthy();
    expect(getByText('Arena')).toBeTruthy();

    fireEvent.press(getByTestId('globe-pin-arena'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders ArenaPin in active state', async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(<ArenaPin active={true} onPress={onPress} />);
    expect(getByTestId('globe-pin-arena')).toBeTruthy();
  });

  it('renders ArenaCallout with title, meta and button navigating to arena', async () => {
    const onOpen = jest.fn();
    const { getByTestId, getByText } = await render(<ArenaCallout onOpen={onOpen} />);

    expect(getByTestId('pin-callout-arena')).toBeTruthy();
    expect(getByText('Arena')).toBeTruthy();
    expect(getByText('Challenge others')).toBeTruthy();
    expect(getByText('Financial duels')).toBeTruthy();

    const openBtn = getByTestId('pin-callout-arena-open');
    fireEvent.press(openBtn);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
