import { cms } from '../lib/cms';

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

/** Built-in company / contact data — the defaults the admin's "Kontakt" tab edits. */
export const defaultCompany = {
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

type Text = string | Record<Lang, string>;
export interface CompanyBranch {
  id: string;
  city: Text;
  street: Text;
  postal: Text;
  phones: readonly string[];
  email: string;
  mapsUrl: string;
}
export interface Company {
  name: string;
  legalName: string;
  configurator: string;
  email: string;
  whatsapp: string;
  socials: { facebook: string; instagram: string };
  branches: readonly CompanyBranch[];
}

/** Defaults with the client's published contact edits (admin → Kontakt) applied. */
function withSettings(): Company {
  const s = cms.settings;
  const base: Company = {
    ...defaultCompany,
    // WhatsApp chat link number — historically the 2nd Niš phone.
    whatsapp: defaultCompany.branches[0].phones[1],
  };
  if (!s) return base;
  const branches = defaultCompany.branches.map((b) => {
    const o = s.branches?.find((x) => x.id === b.id);
    if (!o) return b;
    const phones = o.phones.map((p) => p.trim()).filter(Boolean);
    return {
      id: b.id,
      city: o.city.sr ? o.city : b.city,
      street: o.street.sr ? o.street : b.street,
      postal: o.postal.sr ? o.postal : b.postal,
      phones: phones.length ? phones : b.phones,
      email: o.email || b.email,
      mapsUrl: o.mapsUrl || b.mapsUrl,
    };
  });
  return {
    ...base,
    email: s.email || base.email,
    whatsapp: s.whatsapp || base.whatsapp,
    socials: {
      facebook: s.facebook || base.socials.facebook,
      instagram: s.instagram || base.socials.instagram,
    },
    branches,
  };
}

/** Shared company / contact data — single source of truth for Header, Footer, Contact, JSON-LD. */
export const company: Company = withSettings();

/** Stats shown on the home page (count-up animated). */
export const stats = [
  { num: 2, suffix: '', key: 'branches' },
  { num: 16, suffix: '', key: 'employees' },
  { num: 3000, suffix: '+', key: 'products' },
  { num: 1400, suffix: '+', key: 'customers' },
] as const;
