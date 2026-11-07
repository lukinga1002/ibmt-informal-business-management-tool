/**
 * The same product card is mounted twice (flank layout, and the mobile rail).
 * Only the visible one may take focus, so pick the first mounted card that is
 * actually laid out.
 */
export function focusProductCard(id) {
  const cards = document.querySelectorAll(`[data-product-card="${id}"]`);
  for (const card of cards) {
    if (card.offsetParent !== null) {
      card.focus();
      return true;
    }
  }
  return false;
}