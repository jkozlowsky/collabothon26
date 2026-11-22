import { formatPlayerName } from '@/lib/duel/meta';

describe('formatPlayerName', () => {
  it('formats "Alex Krause" to "Alex K."', () => {
    expect(formatPlayerName('Alex Krause')).toBe('Alex K.');
  });

  it('keeps single names intact, e.g. "Ola" to "Ola"', () => {
    expect(formatPlayerName('Ola')).toBe('Ola');
  });

  it('handles extra leading, trailing, and multiple spaces', () => {
    expect(formatPlayerName('   Alex    Krause   ')).toBe('Alex K.');
    expect(formatPlayerName('  Ola  ')).toBe('Ola');
  });

  it('handles multi-part last names by taking initial of second word', () => {
    expect(formatPlayerName('Jan de Boer')).toBe('Jan D.');
    expect(formatPlayerName('Maria da Silva')).toBe('Maria D.');
  });

  it('handles empty strings', () => {
    expect(formatPlayerName('')).toBe('');
    expect(formatPlayerName('   ')).toBe('');
  });
});
