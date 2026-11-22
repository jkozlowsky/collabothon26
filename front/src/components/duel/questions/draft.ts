/** True once every slot of a sort or match draft is filled, which makes it a submittable answer. */
export function isComplete(slots: (number | null)[]): slots is number[] {
  return slots.length > 0 && slots.every((slot) => slot !== null);
}
