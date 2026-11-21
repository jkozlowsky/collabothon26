import { splitMatch } from '@/lib/glossarySearch';

test('highlights the first match regardless of case', () => {
  expect(splitMatch('Dividend', 'div')).toEqual({ before: '', match: 'Div', after: 'idend' });
  expect(splitMatch('Compound interest', 'INT')).toEqual({ before: 'Compound ', match: 'int', after: 'erest' });
});

test('no match or blank query leaves the text untouched', () => {
  expect(splitMatch('ETF', 'xyz')).toEqual({ before: 'ETF', match: '', after: '' });
  expect(splitMatch('ETF', '  ')).toEqual({ before: 'ETF', match: '', after: '' });
});
