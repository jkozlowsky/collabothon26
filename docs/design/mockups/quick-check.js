// Mockup behaviour only: the counter follows the text and "Next" unlocks once there is an answer.
for (const field of document.querySelectorAll('.field')) {
  const box = field.querySelector('textarea');
  const counter = field.querySelector('.counter');
  const next = field.closest('.phone').querySelector('[data-next]');
  const sync = () => {
    counter.textContent = `${box.value.length} / ${box.maxLength}`;
    if (next) next.disabled = box.value.trim() === '';
  };
  box.addEventListener('input', sync);
  sync();
}
