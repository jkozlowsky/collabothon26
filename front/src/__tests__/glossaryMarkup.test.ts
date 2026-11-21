import { parseDefinition } from '@/lib/glossaryMarkup';

test('plain text is a single text segment', () => {
  expect(parseDefinition('Just words.')).toEqual([{ type: 'text', value: 'Just words.' }]);
});

test('splits text around links and keeps the visible label', () => {
  expect(parseDefinition('A basket of [[stock|stocks]] and [[bond|bonds]].')).toEqual([
    { type: 'text', value: 'A basket of ' },
    { type: 'link', slug: 'stock', label: 'stocks' },
    { type: 'text', value: ' and ' },
    { type: 'link', slug: 'bond', label: 'bonds' },
    { type: 'text', value: '.' },
  ]);
});

test('a link without a label shows its slug', () => {
  expect(parseDefinition('See [[budget]]')).toEqual([
    { type: 'text', value: 'See ' },
    { type: 'link', slug: 'budget', label: 'budget' },
  ]);
});

test('a link at the very start or end produces no empty text segments', () => {
  expect(parseDefinition('[[etf|ETF]]')).toEqual([{ type: 'link', slug: 'etf', label: 'ETF' }]);
});

test('broken markers stay plain text and never throw', () => {
  for (const broken of ['[[stock|stocks', '[[|x]]', '[[Stock Name|x]]', 'a ]] b [[', '[[]]']) {
    expect(parseDefinition(broken)).toEqual([{ type: 'text', value: broken }]);
  }
});

test('empty input gives no segments', () => {
  expect(parseDefinition('')).toEqual([]);
});
