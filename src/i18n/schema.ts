import { useTranslations } from './ui';
import { company, type Lang } from './config';

/** ItemList of the door systems as Products — eligible for richer SERP display. */
export function doorSystemsSchema(lang: Lang) {
  const t = useTranslations(lang);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: t.technical.systems.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: `${company.name} ${s.name}`,
        category: lang === 'sr' ? 'Aluminijumska ulazna vrata' : 'Aluminium entrance door',
        brand: { '@type': 'Brand', name: company.name },
        description: `${s.wing} — ${s.panel}. ${t.technical.udValue}: ${s.ud}.`,
      },
    })),
  };
}
