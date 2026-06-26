import type { Lang } from './config';

/**
 * Full bilingual content dictionary. Copy carried over from the existing
 * algreen.rs site and lightly polished. `sr` is the source of truth.
 */
export const ui = {
  sr: {
    nav: {
      home: 'Početna',
      about: 'O nama',
      works: 'Naši radovi',
      equipment: 'Oprema',
      technical: 'Tehnički detalji',
      configurator: 'Konfigurator',
      contact: 'Kontakt',
    },
    common: {
      configurator: 'Konfigurator',
      learnMore: 'Saznaj više',
      readMore: 'Pročitaj više',
      seeMore: 'Vidi još',
      contactUs: 'Kontaktirajte nas',
      requestQuote: 'Zatražite ponudu',
      getInTouch: 'Stupite u kontakt',
      followUs: 'Pratite nas',
      allRights: 'Sva prava zadržana.',
      backToHome: 'Nazad na početnu',
      menu: 'Meni',
    },
    home: {
      metaTitle: 'Ekskluzivna aluminijumska ulazna vrata | Algreen Niš & Beograd',
      metaDescription:
        'Izvanredan kvalitet i dizajn aluminijumskih ulaznih vrata po meri. Više od 400 modela, vrhunska bezbednost i izolacija. Dizajnirajte vrata sami pomoću konfiguratora.',
      heroEyebrow: 'Ekskluzivna, moderna, aluminijumska',
      heroTitle: 'Ulazna vrata',
      heroSubtitle:
        'Algreen je kompanija sa višegodišnjim iskustvom u izradi aluminijumskih ulaznih vrata vrhunskog kvaliteta, sigurnosti i dizajna.',
      heroCtaPrimary: 'Pokreni konfigurator',
      heroCtaSecondary: 'Pogledaj kolekciju',
      introHeading: 'Ulazna vrata čine najbolji prvi utisak',
      introP1:
        'Ulazna vrata su jedna od najvažnijih građevinskih komponenti cele fasade. Ona moraju da izoluju toplotu i zvuk, pružaju zaštitu od provalnika i stvore estetski prijatan eksterijer kuće.',
      introP2:
        'Sa druge strane, vrata moraju biti jednostavna za upotrebu uz niske zahteve za održavanjem. Moderna aluminijumska ulazna vrata lako ispunjavaju ove uslove: štite od vetra i vremenskih prilika, nepremostiva su prepreka za provalnike i stvaraju jedinstven izgled doma.',
      featuresHeading: 'Zašto Algreen vrata',
      features: [
        {
          title: 'Bezbednost na prvom mestu',
          text: 'Bezbednost je, pored dugotrajnosti, jedna od glavnih prednosti aluminijumskih ulaznih vrata. Provalniku je veoma teško da prođe kroz vrata bez upotrebe teških alata.',
        },
        {
          title: 'Izvanredne tehničke karakteristike',
          text: 'Pored savremenog dizajna, naša vrata karakteriše dugotrajnost, visok nivo sigurnosti, statička čvrstoća, jednostavno održavanje, termo i zvučna izolacija.',
        },
        {
          title: 'Vaš prst je ključ Vašeg doma',
          text: 'Pored ključeva, nudimo dodatne vidove bezbednosti poput brave sa čitačem otiska prsta i šifratora, kao i veliki izbor rukohvata, brava i cilindara.',
        },
      ],
      configHeading: 'Dizajnirajte svoja vrata',
      configP1: 'Klasična, moderna, ekstravagantna, jednostavna…',
      configP2:
        'U našoj ponudi nalazi se više od 400 modela vrata koja možete prilagoditi svojim željama i potrebama.',
      configP3:
        'U konfiguratoru birate boje, modele i opremu i jednostavno sastavljate idealna vrata za Vas.',
      systemsHeading: 'Sistemi ulaznih vrata',
      systemsSubheading:
        'Četiri sistema za svaki budžet i nivo zahteva — od pouzdane osnove do vrhunske izolacije.',
      catalogHeading: 'Preuzmite kataloge',
      catalogSubheading: 'Sve naše kolekcije i opremu pregledajte u PDF katalozima.',
      catalogs: [
        { title: 'Ekskluzivna ulazna vrata', file: '/files/Katalog ulaznih vrata 2024.pdf', img: '/img/katalog1.png' },
        { title: 'Flajer', file: '/files/Algreen info.pdf', img: '/img/katalog2.png' },
        { title: 'Rukohvati, kvake i kontrola pristupa', file: '/files/Katalog Rukohvata.pdf', img: '/img/katalog3.png' },
        { title: 'Aluminijumski sistemi za ograde', file: '/files/Katalog Rukohvata.pdf', img: '/img/aluminijumski_sistemi_za_ograde.jpeg' },
      ],
      ctaHeading: 'Spremni za vrata po Vašoj meri?',
      ctaText: 'Posetite jednu od naših poslovnica ili nas kontaktirajte — pomoći ćemo Vam da odaberete idealno rešenje.',
    },
    statsLabels: {
      branches: 'poslovnice',
      employees: 'zaposlenih',
      products: 'proizvoda',
      customers: 'zadovoljnih kupaca',
    },
    about: {
      metaTitle: 'O nama — Umetnost izrade ulaznih vrata | Algreen',
      metaDescription:
        'Algreen — tim posvećen dizajnu, izradi, isporuci i montaži aluminijumskih ulaznih vrata vrhunskog kvaliteta. Upoznajte našu misiju, viziju i vrednosti.',
      title: 'O nama',
      subtitle: 'Ideja • Dizajn • Analiza • Testiranje',
      steps: ['Ideja', 'Dizajn', 'Analiza', 'Testiranje'],
      mainHeading: 'Umetnost dizajna i izrade ulaznih vrata',
      mainText:
        'Naše znanje i dugogodišnje iskustvo pomoći će Vam u potrazi za idealnim vratima. Posvećeni smo i pažljivo pristupamo dizajnu, izradi, isporuci i montaži naših proizvoda jer nam je zadovoljstvo klijenta na prvom mestu. Osim visoke bezbednosti, aluminijumska vrata iz naše ponude predstavljaće Vaš stil i enterijer Vašeg doma. Bilo da tražite sofisticirana, moderna ili elegantna vrata — sigurno ćete ih naći u našim ekskluzivnim kolekcijama.',
      teamHeading: 'Ko čini naš tim?',
      team: [
        { title: 'Prodaja', text: 'Prodajni tim čine specijalisti prodaje i stručni saradnici koji nude usluge prodaje na terenu i marketinške promocije. Osnovni zadatak je da u što kraćem roku i na najkvalitetniji način odgovori na zahteve klijenata.' },
        { title: 'Marketing i promocija', text: 'Fokus ovog odeljenja je promocija programa naših proizvoda i unapređenje odnosa sa klijentima. Jedinstvena baza marketinških podataka koristi se za poboljšanje tržišnog pozicioniranja.' },
        { title: 'Logistika', text: 'Osnovna uloga logistike je pružanje čitavog niza usluga logističke podrške: upravljanje dostavom sopstvenim vozilom, magacinsko poslovanje i transport do krajnjih korisnika.' },
        { title: 'Finansije i računovodstvo', text: 'Odeljenje finansija i računovodstva u predviđenim rokovima obezbeđuje neophodne finansijske analize poslovanja i sredstva za funkcionisanje kompanije, uz vođenje poslovnih knjiga.' },
        { title: 'Stručnjaci u proizvodnji', text: 'Zadatak proizvodnog tima je pažljiv izbor i kombinacija materijala za izradu gotovog proizvoda. Adekvatno korišćenje i nadzor mašina obezbeđuju proizvod visokog kvaliteta.' },
        { title: 'Tehnička podrška', text: 'Tehničko osoblje klijentima pruža detaljne informacije o proizvodima i uslugama, kompletna tehnička rešenja, preliminarni proračun za sisteme i podršku putem telefona ili e-maila.' },
      ],
      valuesHeading: 'Naše vrednosti',
      values: [
        { title: 'Misija', text: 'Isporuka robe saglasno obećanim rokovima, dogovorenog kvaliteta i po uslovima povoljnijim od konkurencije. Ispunjenje zahteva i zadovoljenje potreba kupaca, zaposlenih i društvenog okruženja.' },
        { title: 'Vizija', text: 'Bićemo preduzeće čiji će proizvodi, usluge, cene i načini distribucije biti korak ispred konkurencije. Stvaraćemo dugoročne partnerske odnose sa kupcima i donositi savremene poslovne trendove na tržište Srbije.' },
        { title: 'Ciljevi', text: 'Postati preduzeće prepoznatljivo po uslužnom i obučenom osoblju, kvalitetnoj i raznovrsnoj ponudi te povoljnim cenama — preduzeće čiji su kupci njegova najbolja preporuka.' },
      ],
    },
    equipment: {
      metaTitle: 'Oprema za ulazna vrata — rukohvati, brave, otisak prsta | Algreen',
      metaDescription:
        'Nadogradite vaša ulazna vrata: rukohvati, brave, cilindri, šarke, čitač otiska prsta, šifrator, špijunka sa ekranom, boje i finiš, kućni brojevi i sanduče.',
      title: 'Oprema',
      subtitle: 'Za najbolji izgled nadogradite svoja vrata dodatnom opremom',
      intro:
        'Učinite Vaša ulazna vrata jedinstvenim uz pomoć dodataka koje nudimo — od velikog izbora rukohvata do specijalnih sistema kao što su čitač otiska prsta i šifrator. Odabir boja i dizajna prepuštamo Vama, a nudimo i personalizovane pločice i kućne brojeve.',
      categories: [
        { title: 'Bezbednost', text: 'Brave (3 i 5 tačaka, mehaničke i automatske), cilindri i 3D šarke za maksimalnu zaštitu.', img: '/img/brava13.png' },
        { title: 'Estetika', text: 'Rukohvati (ovalni, ravni, pravougaoni), kvake, rozete i bogat izbor boja i finiša.', img: '/img/rukohvat1.png' },
        { title: 'Kontrola pristupa', text: 'Čitač otiska prsta, šifrator (beli i crni), glasovni asistent i špijunka sa ekranom.', img: '/img/fingerprint2.png' },
        { title: 'Ostalo', text: 'Maske, automati za zatvaranje, elektromagnetni prihvatnik, zaštita parapeta, kućni brojevi i sanduče.', img: '/img/sanduce.jpg' },
      ],
      accessHeading: 'Pametna kontrola pristupa',
      fingerprint: 'Otključavanje otiskom prsta',
      voiceAssistant: 'Glasovni asistent',
      voiceBullets: [
        'Pogodno otvorite ulazna vrata glasovnom komandom',
        'Nema potrebe da žurite do vrata svaki put kada neko zazvoni',
        'Otvorite vrata čak i kada ste zauzeti ili imate pune ruke',
        'Nema potrebe da otvarate vrata prljavim rukama',
      ],
      boxHeading: 'Poštansko sanduče',
      boxText:
        'Naše čvrsto poštansko sanduče izrađeno je od visokokvalitetnog aluminijuma i čuva Vašu poštu uz odličan izgled u dvorištu. Veoma je izdržljivo i jednostavno za ugradnju.',
    },
    technical: {
      metaTitle: 'Tehnički detalji ulaznih vrata — preseci i Ud vrednosti | Algreen',
      metaDescription:
        'Tehničke karakteristike sistema AG 70, AG 77 i AG 85: debljina panela, troslojno i četvoroslojno staklo, 3D šarke i Ud vrednosti do 0,6 W/m²K.',
      title: 'Tehnički detalji',
      subtitle: 'Otkrijte po čemu se naša vrata izdvajaju od ostalih',
      intro:
        'Aluminijumska vrata su pravi izbor jer pružaju potrebnu zaštitu, a i dalje izgledaju odlično. Naša vrata imaju deblje panele koji povećavaju čvrstoću i smanjuju gubitak energije. Pored toga, svaka vrata prilagođavamo Vašim specifikacijama radi savršene završne obrade.',
      sectionLabel: 'Presek',
      systemsHeading: 'Uporedite sisteme vrata',
      udValue: 'Ud-vrednost',
      hinges: '3D šarke',
      panelLabel: 'Debljina panela',
      glassLabel: 'Staklo',
      systems: [
        {
          name: 'CLASSIC AG 70',
          wing: 'Klasično krilo sa panelom',
          panel: '38 mm panel · 34 mm XPS (Stirodur)',
          glass: '4.4.1 mm VSG / 4 / 4 mm, warm-edge, do Ug=0,7 W/m²K',
          ud: 'do 1,2 W/m²K',
          hinges: '2 kom',
          img: '/img/presek1.png',
          pdf: '/files/CLASSIC AG 70.pdf',
        },
        {
          name: 'STANDARD AG 70',
          wing: 'Jednostrano skriveno krilo',
          panel: '53 mm panel · 48 mm troslojno staklo',
          glass: '4.4.1 mm VSG / 4 / 4 mm, warm-edge, do Ug=0,7 W/m²K',
          ud: 'do 1,0 W/m²K',
          hinges: '3 kom',
          img: '/img/presek2.png',
          pdf: '/files/STANDARD AG 70.pdf',
        },
        {
          name: 'EXCLUSIVE AG 77',
          wing: 'Obostrano skriveno krilo',
          panel: '77 mm panel · 69 mm četvoroslojno staklo',
          glass: '4.4.1 mm VSG / 4 / 4 / 4 mm, warm-edge, do Ug=0,6 W/m²K',
          ud: 'do 0,6 W/m²K',
          hinges: '3–5 kom',
          img: '/img/presek3.png',
          pdf: '/files/EXCLUSIVE AG 77.pdf',
        },
        {
          name: 'PREMIUM AG 85',
          wing: 'Obostrano skriveno krilo',
          panel: '85 mm panel · 78 mm četvoroslojno staklo',
          glass: '4.4.1 mm VSG / 4 / 4 / 4 mm, warm-edge, do Ug=0,6 W/m²K',
          ud: 'do 0,6 W/m²K',
          hinges: '3–5 kom',
          img: '/img/presek4.png',
          pdf: '/files/PREMIUM AG 85.pdf',
        },
      ],
    },
    works: {
      metaTitle: 'Naši radovi — galerija ugrađenih ulaznih vrata | Algreen',
      metaDescription:
        'Pogledajte galeriju realizovanih projekata — aluminijumska ulazna vrata Algreen ugrađena kod naših zadovoljnih kupaca širom Srbije.',
      title: 'Naši radovi',
      subtitle: 'Galerija realizovanih projekata kod naših zadovoljnih kupaca',
      intro:
        'Svaka vrata pričaju svoju priču. Pogledajte deo naših realizovanih projekata i pronađite inspiraciju za sopstveni dom.',
    },
    contact: {
      metaTitle: 'Kontakt — poslovnice Niš i Beograd | Algreen',
      metaDescription:
        'Kontaktirajte Algreen — poslovnice u Nišu i Beogradu. Telefon, e-mail i adrese. Tu smo da Vam pomognemo da odaberete idealna ulazna vrata.',
      title: 'Kontakt',
      subtitle: 'Tu smo za sva Vaša pitanja — javite nam se ili posetite poslovnicu',
      branchOffice: 'Poslovnica',
      phone: 'Telefon',
      email: 'E-mail',
      address: 'Adresa',
      openMaps: 'Otvori na mapi',
      formHeading: 'Pošaljite upit',
      formName: 'Ime i prezime',
      formEmail: 'E-mail',
      formPhone: 'Telefon',
      formMessage: 'Poruka',
      formSubmit: 'Pošalji',
      formNote: 'Odgovaramo u najkraćem mogućem roku.',
    },
  },

  en: {
    nav: {
      home: 'Home',
      about: 'About',
      works: 'Our Works',
      equipment: 'Equipment',
      technical: 'Technical Details',
      configurator: 'Configurator',
      contact: 'Contact',
    },
    common: {
      configurator: 'Configurator',
      learnMore: 'Learn more',
      readMore: 'Read more',
      seeMore: 'See more',
      contactUs: 'Contact us',
      requestQuote: 'Request a quote',
      getInTouch: 'Get in touch',
      followUs: 'Follow us',
      allRights: 'All rights reserved.',
      backToHome: 'Back to home',
      menu: 'Menu',
    },
    home: {
      metaTitle: 'Exclusive aluminium entrance doors | Algreen Niš & Belgrade',
      metaDescription:
        'Outstanding quality and design of custom aluminium entrance doors. Over 400 models, top security and insulation. Design your own door with our configurator.',
      heroEyebrow: 'Exclusive, modern, aluminium',
      heroTitle: 'Entrance doors',
      heroSubtitle:
        'Algreen is a company with many years of experience in manufacturing aluminium entrance doors of top quality, safety and design.',
      heroCtaPrimary: 'Launch configurator',
      heroCtaSecondary: 'View collection',
      introHeading: 'The front door makes the best first impression',
      introP1:
        'The entrance door is one of the most important building components of the entire facade. It must insulate heat and sound, provide protection against burglars and create an aesthetically pleasing exterior.',
      introP2:
        'At the same time, the door must be easy to use and low-maintenance. Modern aluminium entry doors easily meet these conditions: they protect against wind and weather, are an insurmountable obstacle for burglars and create a unique look for the home.',
      featuresHeading: 'Why Algreen doors',
      features: [
        {
          title: 'Safety first',
          text: 'Safety, alongside durability, is one of the main advantages of aluminium front doors. It is very difficult for a burglar to get through a door without heavy tools.',
        },
        {
          title: 'Outstanding technical characteristics',
          text: 'Beyond modern design, our doors offer durability, a high level of security, static strength, easy maintenance, and thermal and sound insulation.',
        },
        {
          title: 'Your finger is the key to your home',
          text: 'In addition to keys, we offer extra security such as a fingerprint reader and coder, plus a wide selection of handles, locks and cylinders.',
        },
      ],
      configHeading: 'Design your door',
      configP1: 'Classic, modern, extravagant, simple…',
      configP2:
        'Our range includes more than 400 door models that you can adapt to your wishes and needs.',
      configP3:
        'In the configurator you choose colours, models and equipment and easily assemble the ideal door for you.',
      systemsHeading: 'Entrance door systems',
      systemsSubheading:
        'Four systems for every budget and requirement — from a reliable base to premium insulation.',
      catalogHeading: 'Download catalogs',
      catalogSubheading: 'Browse all our collections and equipment in PDF catalogs.',
      catalogs: [
        { title: 'Exclusive entrance doors', file: '/files/Katalog ulaznih vrata 2024.pdf', img: '/img/katalog1.png' },
        { title: 'Flyer', file: '/files/Algreen info.pdf', img: '/img/katalog2.png' },
        { title: 'Handrails, handles & access control', file: '/files/Katalog Rukohvata.pdf', img: '/img/katalog3.png' },
        { title: 'Aluminium fence systems', file: '/files/Katalog Rukohvata.pdf', img: '/img/aluminijumski_sistemi_za_ograde.jpeg' },
      ],
      ctaHeading: 'Ready for a door made to measure?',
      ctaText: 'Visit one of our branches or get in touch — we will help you choose the ideal solution.',
    },
    statsLabels: {
      branches: 'branches',
      employees: 'employees',
      products: 'products',
      customers: 'happy customers',
    },
    about: {
      metaTitle: 'About us — The art of making entrance doors | Algreen',
      metaDescription:
        'Algreen — a team dedicated to the design, manufacture, delivery and installation of top-quality aluminium entrance doors. Discover our mission, vision and values.',
      title: 'About us',
      subtitle: 'Idea • Design • Analysis • Testing',
      steps: ['Idea', 'Design', 'Analysis', 'Testing'],
      mainHeading: 'The art of designing and making entrance doors',
      mainText:
        'Our knowledge and years of experience will help you find the ideal door. We are dedicated and carefully approach the design, manufacture, delivery and installation of our products because customer satisfaction comes first. Beyond high security, aluminium doors from our range will reflect your style and your home’s interior. Whether you seek sophisticated, modern or elegant doors, you will surely find them in our exclusive collections.',
      teamHeading: 'Who makes up our team?',
      team: [
        { title: 'Sales', text: 'Our sales team consists of sales specialists and professional associates offering field sales and marketing promotion. Their main task is to respond to client requests as quickly and to the highest standard.' },
        { title: 'Marketing & promotion', text: 'This department focuses on promoting our product program and improving customer relations. A unique marketing database is used to improve market positioning.' },
        { title: 'Logistics', text: 'The role of logistics is to provide a full range of support services: delivery management with our own vehicles, warehouse operations and transport to end users.' },
        { title: 'Finance & accounting', text: 'The finance and accounting department provides the necessary financial analyses and resources for the company to operate, and keeps the business books within planned deadlines.' },
        { title: 'Production experts', text: 'Our production team carefully selects and combines materials to make the finished product. Proper use and monitoring of machines deliver a high-quality product to end users.' },
        { title: 'Technical support', text: 'Our technical staff provide detailed information about products and services, complete technical solutions, preliminary calculations, and support by phone or e-mail for all technical questions.' },
      ],
      valuesHeading: 'Our values',
      values: [
        { title: 'Mission', text: 'Delivery of goods in line with promised terms and agreed quality, on conditions more favourable than the competition — fulfilling the needs of customers, employees and the wider community.' },
        { title: 'Vision', text: 'To be a company whose products, services, prices and distribution stay one step ahead of the competition, building long-term partnerships and bringing modern business trends to the Serbian market.' },
        { title: 'Goals', text: 'To become a company recognised for helpful, trained staff, a high-quality and diverse offer and fair prices — a company whose customers are its best recommendation.' },
      ],
    },
    equipment: {
      metaTitle: 'Door equipment — handrails, locks, fingerprint reader | Algreen',
      metaDescription:
        'Upgrade your entrance door: handrails, locks, cylinders, hinges, fingerprint reader, coder, spyhole with screen, colours and finishes, house numbers and mailbox.',
      title: 'Equipment',
      subtitle: 'For the best look, upgrade your door with accessories',
      intro:
        'Make your front door unique with the accessories we offer — from a wide selection of handles to special systems such as a fingerprint reader and coder. We leave the choice of colours and design to you, and also offer personalised plates and house numbers.',
      categories: [
        { title: 'Safety', text: 'Locks (3 and 5 point, mechanical and automatic), cylinders and 3D hinges for maximum protection.', img: '/img/brava13.png' },
        { title: 'Aesthetics', text: 'Handrails (oval, flat, rectangular), handles, rosettes and a rich choice of colours and finishes.', img: '/img/rukohvat1.png' },
        { title: 'Access control', text: 'Fingerprint reader, coder (white and black), voice assistant and a spyhole with screen.', img: '/img/fingerprint2.png' },
        { title: 'The rest', text: 'Masks, door closers, electromagnetic receiver, parapet protection, house numbers and mailbox.', img: '/img/sanduce.jpg' },
      ],
      accessHeading: 'Smart access control',
      fingerprint: 'Fingerprint unlock',
      voiceAssistant: 'Voice assistant',
      voiceBullets: [
        'Conveniently open the front door with a voice command',
        'No need to rush to the door every time someone rings',
        'Open the door even when busy or with your hands full',
        'No need to open the door with dirty hands',
      ],
      boxHeading: 'Mailbox',
      boxText:
        'Our sturdy mailbox is made of high-quality aluminium and keeps your mail safe while looking great in your yard. It is very durable and easy to install.',
    },
    technical: {
      metaTitle: 'Technical details — cross-sections and Ud values | Algreen',
      metaDescription:
        'Technical characteristics of the AG 70, AG 77 and AG 85 systems: panel thickness, three- and four-layer glass, 3D hinges and Ud values down to 0.6 W/m²K.',
      title: 'Technical details',
      subtitle: 'Find out what makes our doors stand out from the rest',
      intro:
        'Aluminium doors are the right choice because they provide the protection you need while still looking great. Our doors have thicker panels that increase strength and reduce energy loss. We also customise every door to your specifications for a perfect finish.',
      sectionLabel: 'Section',
      systemsHeading: 'Compare door systems',
      udValue: 'Ud-value',
      hinges: '3D hinges',
      panelLabel: 'Panel thickness',
      glassLabel: 'Glass',
      systems: [
        {
          name: 'CLASSIC AG 70',
          wing: 'Classic wing with panel',
          panel: '38 mm panel · 34 mm XPS (Stirodur)',
          glass: '4.4.1 mm VSG / 4 / 4 mm, warm-edge, up to Ug=0.7 W/m²K',
          ud: 'up to 1.2 W/m²K',
          hinges: '2 pcs',
          img: '/img/presek1.png',
          pdf: '/files/CLASSIC AG 70.pdf',
        },
        {
          name: 'STANDARD AG 70',
          wing: 'One-sided hidden wing',
          panel: '53 mm panel · 48 mm three-layer glass',
          glass: '4.4.1 mm VSG / 4 / 4 mm, warm-edge, up to Ug=0.7 W/m²K',
          ud: 'up to 1.0 W/m²K',
          hinges: '3 pcs',
          img: '/img/presek2.png',
          pdf: '/files/STANDARD AG 70.pdf',
        },
        {
          name: 'EXCLUSIVE AG 77',
          wing: 'Double-sided hidden wing',
          panel: '77 mm panel · 69 mm four-layer glass',
          glass: '4.4.1 mm VSG / 4 / 4 / 4 mm, warm-edge, up to Ug=0.6 W/m²K',
          ud: 'up to 0.6 W/m²K',
          hinges: '3–5 pcs',
          img: '/img/presek3.png',
          pdf: '/files/EXCLUSIVE AG 77.pdf',
        },
        {
          name: 'PREMIUM AG 85',
          wing: 'Double-sided hidden wing',
          panel: '85 mm panel · 78 mm four-layer glass',
          glass: '4.4.1 mm VSG / 4 / 4 / 4 mm, warm-edge, up to Ug=0.6 W/m²K',
          ud: 'up to 0.6 W/m²K',
          hinges: '3–5 pcs',
          img: '/img/presek4.png',
          pdf: '/files/PREMIUM AG 85.pdf',
        },
      ],
    },
    works: {
      metaTitle: 'Our works — gallery of installed entrance doors | Algreen',
      metaDescription:
        'Browse our gallery of completed projects — Algreen aluminium entrance doors installed for happy customers across Serbia.',
      title: 'Our works',
      subtitle: 'A gallery of completed projects for our happy customers',
      intro:
        'Every door tells its own story. Browse a selection of our completed projects and find inspiration for your own home.',
    },
    contact: {
      metaTitle: 'Contact — branches in Niš and Belgrade | Algreen',
      metaDescription:
        'Contact Algreen — branches in Niš and Belgrade. Phone, e-mail and addresses. We are here to help you choose the ideal entrance door.',
      title: 'Contact',
      subtitle: 'We are here for all your questions — reach out or visit a branch',
      branchOffice: 'Branch office',
      phone: 'Phone',
      email: 'E-mail',
      address: 'Address',
      openMaps: 'Open in maps',
      formHeading: 'Send an inquiry',
      formName: 'Full name',
      formEmail: 'E-mail',
      formPhone: 'Phone',
      formMessage: 'Message',
      formSubmit: 'Send',
      formNote: 'We reply as soon as possible.',
    },
  },
} as const;

export type UI = (typeof ui)['sr'];

export function useTranslations(lang: Lang) {
  return ui[lang];
}
