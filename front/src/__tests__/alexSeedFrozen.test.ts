import { DEFAULT_SEED, seedAccount } from '@/lib/bank/seed';

describe('Alex seed frozen', () => {
  it('matches snapshot', () => {
    expect(seedAccount(DEFAULT_SEED)).toMatchSnapshot();
  });
});
