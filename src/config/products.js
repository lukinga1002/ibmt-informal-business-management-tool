import { CalendarHeart, House } from 'lucide-react';

/**
 * L1 — the one place a product is declared.
 *
 * Everything on the landing page is driven from this list: the cards, the hero,
 * the action, the selection order. To add a product, add one entry here and
 * nothing else. `route: null` means the product cannot be opened yet; it must
 * never point at a parked module.
 *
 * All wording below is PLACEHOLDER and is meant to be replaced.
 */
export const PRODUCTS = [
  {
    order: 1,
    id: 'makazi',
    name: 'MAKAZI',
    status: 'live',
    route: '/rent',
    hero: 'https://media.base44.com/images/public/6addd095d984bcd6f356be2b/bd73dddde_generated_image.png',
    icon: House,
    tagline: {
      sw: 'Nyumba za kupanga, mikataba na kodi yenye risiti.',
      en: 'Rental homes, leases and rent with receipts.',
    },
  },
  {
    order: 2,
    id: 'sherehe',
    name: 'SHEREHE',
    status: 'coming_soon',
    route: null,
    hero: 'https://media.base44.com/images/public/6addd095d984bcd6f356be2b/bccdd0617_generated_image.png',
    icon: CalendarHeart,
    tagline: {
      sw: 'Sherehe na hafla zilizosajiliwa. Bado tunajenga.',
      en: 'Registered events and gatherings. Still being built.',
    },
  },
];

/** Selection on first load. Falls back to the first product if it is missing. */
export const DEFAULT_PRODUCT_ID = 'makazi';

export const orderedProducts = [...PRODUCTS].sort((a, b) => a.order - b.order);

/** PLACEHOLDER landing wording, bilingual, in one place. */
export const LANDING_COPY = {
  products: { sw: 'Bidhaa', en: 'Products' },
  verify: { sw: 'Hakiki', en: 'Verify' },
  language: { sw: 'Lugha', en: 'Language' },
  login: { sw: 'Ingia', en: 'Login' },
  headline: { sw: 'Chagua huduma yako', en: 'Choose your service' },
  headlineNote: {
    sw: 'Bidhaa za IBMT. Ongeza bidhaa mpya bila kubadilisha ukurasa.',
    en: 'IBMT products. New products appear here without changing this page.',
  },
  selected: { sw: 'Imechaguliwa', en: 'Selected' },
  live: { sw: 'Iko hai', en: 'Live' },
  comingSoon: { sw: 'Inakuja hivi karibuni', en: 'Coming soon' },
  open: { sw: 'Fungua', en: 'Open' },
  imagePlaceholder: { sw: 'Picha ya mfano', en: 'Placeholder image' },
  privacy: { sw: 'Faragha', en: 'Privacy' },
};

export const pick = (value, lang) => (value && typeof value === 'object' ? value[lang] || value.en : value);

export const statusLabel = (status, lang) =>
  status === 'live' ? pick(LANDING_COPY.live, lang) : pick(LANDING_COPY.comingSoon, lang);