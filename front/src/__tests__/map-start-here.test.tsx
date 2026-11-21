import { router } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';

import { categorization } from '@/test-utils/categorization';
import { appRoutes as routes } from '@/test-utils/routes';

const lesson = (id: number) => ({ id, title: `Lesson ${id}`, emoji: '📘', summary: 's', questionCount: 3, xp: 10 });
const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
const fail = (status: number) => Promise.resolve({ ok: false, status, statusText: 'Error' });

let stored: () => Promise<unknown>;
function backend(reply: () => Promise<unknown>) {
  stored = reply;
  globalThis.fetch = jest.fn((url: string) => {
    if (url.endsWith('/api/lessons')) return ok([lesson(1), lesson(2), lesson(3)]);
    if (url.endsWith('/categorization')) return stored();
    if (url.endsWith('/profile')) return ok({ userId: 'demo-user', goals: [], onboardingCompleted: true });
    return ok([]);
  }) as jest.Mock;
}
const row = (patch: object) =>
  categorization({ startHere: { lessonId: 2, title: 'Lesson 2', area: 'saving' }, mastery: { saving: 0.5 }, ...patch });

async function openMap() {
  await renderRouter(routes, { initialUrl: '/map' });
  await screen.findByTestId('lesson-1');
}

test('the Start here badge and its why line sit on the startHere lesson only', async () => {
  backend(() => ok(row({})));
  await openMap();
  expect(await screen.findByTestId('start-here')).toBeOnTheScreen();
  expect(screen.getAllByTestId('start-here')).toHaveLength(1);
  expect(screen.getByTestId('lesson-2')).toHaveTextContent('Start here', { exact: false });
  expect(screen.getByTestId('lesson-1')).not.toHaveTextContent('Start here', { exact: false });
  expect(screen.getByTestId('why-here')).toHaveTextContent('Why here: Your answers about Saving', { exact: false });
});

test('an area with no answer says it is not checked yet', async () => {
  backend(() => ok(row({ mastery: { saving: null } })));
  await openMap();
  expect(await screen.findByTestId('why-here')).toHaveTextContent('Why here: Saving is not checked yet', { exact: false });
});

test('a ready path says the lesson is next on the path', async () => {
  backend(() => ok(row({ readyForNext: true, mastery: { saving: 0.9 } })));
  await openMap();
  expect(await screen.findByTestId('why-here')).toHaveTextContent('Why here: Next on your path', { exact: false });
});

test.each([
  { name: 'a 404', reply: () => fail(404) },
  { name: 'an error', reply: () => fail(500) },
  { name: 'a row with no startHere', reply: () => ok(row({ startHere: null })) },
  { name: 'a row whose startHere key is absent', reply: () => ok(row({ startHere: undefined })) },
])('$name leaves the list as it was', async ({ reply }) => {
  backend(reply);
  await openMap();
  await act(async () => {});
  expect(screen.queryByTestId('start-here')).toBeNull();
  expect(screen.getAllByTestId(/^lesson-/)).toHaveLength(3);
});

test('the badge moves on when the map is focused again after a completion', async () => {
  backend(() => ok(row({})));
  await openMap();
  expect(await screen.findByTestId('start-here')).toBeOnTheScreen();

  stored = () => ok(row({ startHere: { lessonId: 3, title: 'Lesson 3', area: 'investing' }, mastery: { saving: 0.5, investing: null } }));
  await act(async () => router.navigate('/glossary'));
  await act(async () => router.navigate('/map'));
  await screen.findByTestId('why-here');
  expect(screen.getByTestId('lesson-3')).toHaveTextContent('Start here', { exact: false });
  expect(screen.getByTestId('lesson-2')).not.toHaveTextContent('Start here', { exact: false });
  expect(screen.getByTestId('why-here')).toHaveTextContent('Why here: Investing is not checked yet', { exact: false });
});
