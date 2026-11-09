import { CalendarHeart, House } from 'lucide-react';

export const LANDING_COPY = {
  wordmark: { sw: 'IBMT', en: 'IBMT' },
  subtitle: { sw: 'Huduma za Kidijitali Tanzania', en: 'Digital Public Services Tanzania' },
  home: { sw: 'Nyumbani', en: 'Home' },
  services: { sw: 'Huduma', en: 'Services' },
  about: { sw: 'Kuhusu', en: 'About' },
  contact: { sw: 'Wasiliana', en: 'Contact' },
  verify: { sw: 'Hakiki', en: 'Verify' },
  login: { sw: 'Ingia', en: 'Sign in' },
  privacy: { sw: 'Faragha', en: 'Privacy' },
  language: { sw: 'Badili lugha', en: 'Switch language' },
  menu: { sw: 'Menyu', en: 'Menu' },
  close: { sw: 'Funga menyu', en: 'Close menu' },
  headline: { sw: 'Chagua huduma yako', en: 'Choose your service' },
  subline: { sw: 'Pata huduma za umma za Tanzania kwa njia ya kidijitali.', en: 'Access Tanzania’s public services online.' },
  scene: { sw: 'Bandari ya Dar es Salaam na majengo ya katikati ya jiji yakionekana kutoka juu.', en: 'Aerial view of Dar es Salaam harbour and downtown buildings.' },
  title: { sw: 'Huduma zetu', en: 'Our services' },
  live: { sw: 'Inapatikana', en: 'Live' },
  comingSoon: { sw: 'Inakuja hivi karibuni', en: 'Coming soon' },
  open: { sw: 'Fungua', en: 'Open' },
  intro: { sw: 'IBMT ni jukwaa la kidijitali linalowawezesha wananchi kupata huduma za umma Tanzania.', en: 'IBMT is a Tanzanian digital platform where people can find and access public services.' },
  statement: { sw: 'Huduma moja · Kwa kila Mtanzania', en: 'One service · For every Tanzanian' },
  phone: { sw: 'Simu', en: 'Phone' },
  email: { sw: 'Barua pepe', en: 'Email' },
  office: { sw: 'Ofisi', en: 'Office location' },
  pending: { sw: 'Mwanzilishi ataweka taarifa hapa.', en: 'Founder to add details here.' },
  copyright: { sw: 'Haki zote zimehifadhiwa.', en: 'All rights reserved.' },
  housing: { sw: 'Nyumba za kupanga, mikataba na risiti za kodi.', en: 'Rental homes, leases and rent receipts.' },
  events: { sw: 'Vibali vya sherehe na hafla.', en: 'Permits for celebrations and events.' },
};

export const PRODUCTS = [
  { id: 'makazi', name: 'MAKAZI', status: 'live', route: '/rent', icon: House, order: 1, tagline: LANDING_COPY.housing },
  { id: 'sherehe', name: 'SHEREHE', status: 'coming_soon', route: null, icon: CalendarHeart, order: 2, tagline: LANDING_COPY.events },
];

export const orderedProducts = [...PRODUCTS].sort((a, b) => a.order - b.order);
export const pick = (value, lang) => typeof value === 'object' && value ? value[lang] || value.en : value;
export const statusLabel = (status, lang) => pick(status === 'live' ? LANDING_COPY.live : LANDING_COPY.comingSoon, lang);
