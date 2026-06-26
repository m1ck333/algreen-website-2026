export const languages = {
  sr: 'Srpski',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'sr';

/** External configurator app (kept from the existing infrastructure). */
export const CONFIGURATOR_URL = 'https://konfigurator.algreen.rs';

/** Google Tag Manager container (carried over from the old site). Set '' to disable. */
export const GTM_ID = 'GTM-N9D9PRC';

/** Shared company / contact data — single source of truth. */
export const company = {
  name: 'Algreen',
  legalName: 'Algreen d.o.o.',
  configurator: CONFIGURATOR_URL,
  // Primary public contact address — where the website form delivers and what we display.
  email: 'info@algreen.rs',
  socials: {
    facebook:
      'https://www.facebook.com/profile.php?id=100083236694516&mibextid=LQQJ4d',
    instagram: 'https://www.instagram.com/algreen.srbija/',
  },
  branches: [
    {
      id: 'nis',
      city: { sr: 'Niš', en: 'Niš' },
      street: 'Bulevar Svetog Cara Konstantina 168',
      postal: { sr: '18000 Niš, Srbija', en: '18000 Niš, Serbia' },
      phones: ['+381 18 540 054', '+381 63 581 217'],
      email: 'nis@algreen.rs',
      mapsUrl: 'https://maps.google.com/?q=Bulevar+Svetog+Cara+Konstantina+168,+Niš',
    },
    {
      id: 'beograd',
      city: { sr: 'Beograd', en: 'Belgrade' },
      street: { sr: 'Auto put za Novi Sad 296H', en: 'Highway to Novi Sad 296H' },
      postal: { sr: '11080 Beograd-Zemun, Srbija', en: '11080 Beograd-Zemun, Serbia' },
      phones: ['+381 11 440 7415', '+381 63 581 041'],
      email: 'beograd@algreen.rs',
      mapsUrl: 'https://maps.google.com/?q=Auto+put+za+Novi+Sad+296H,+Beograd-Zemun',
    },
  ],
} as const;

/** Stats shown on the home page (count-up animated). */
export const stats = [
  { num: 2, suffix: '', key: 'branches' },
  { num: 16, suffix: '', key: 'employees' },
  { num: 3000, suffix: '+', key: 'products' },
  { num: 1400, suffix: '+', key: 'customers' },
] as const;
