/** Scrolls a ScrollView-like ref to `to` over `durationMs` with ease-in-out. Returns a cancel function. */
export function animateScroll(
  scrollTo: (y: number) => void,
  from: number,
  to: number,
  durationMs: number
): () => void {
  if (durationMs <= 0 || from === to) {
    scrollTo(to);
    return () => {};
  }
  let frame = 0;
  let start = 0;
  const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
  const step = (now: number) => {
    start ||= now;
    const k = Math.min(1, (now - start) / durationMs);
    scrollTo(from + (to - from) * ease(k));
    if (k < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}
