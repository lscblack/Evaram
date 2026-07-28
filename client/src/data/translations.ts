/**
 * UI copy in English, Kinyarwanda and French.
 *
 * Scope: navigation, chrome, buttons, form labels, section headings and the
 * home page. Long-form editorial content (insight articles, legal text, FAQ
 * answers) stays English-only for now — translating it properly is a copywriting
 * job, not a string-table job.
 *
 * NOTE: the Kinyarwanda strings need review by a native speaker before launch.
 */

type Entry = { en: string; rw: string; fr: string }

export const TRANSLATIONS = {
  /* ---------------- navigation ---------------- */
  'nav.home': { en: 'Home', rw: 'Ahabanza', fr: 'Accueil' },
  'nav.properties': { en: 'Properties', rw: 'Imitungo', fr: 'Biens' },
  'nav.services': { en: 'Services', rw: 'Serivisi', fr: 'Services' },
  'nav.wealthCycle': { en: 'Wealth Cycle', rw: 'Uruziga rw’Ubukungu', fr: 'Cycle de Richesse' },
  'nav.construction': { en: 'Construction', rw: 'Ubwubatsi', fr: 'Construction' },
  'nav.team': { en: 'Our Team', rw: 'Ikipe Yacu', fr: 'Notre Équipe' },
  'nav.join': { en: 'Join Us', rw: 'Twifatanye', fr: 'Rejoignez-nous' },
  'nav.insights': { en: 'Insights', rw: 'Ubushishozi', fr: 'Analyses' },
  'nav.contact': { en: 'Contact', rw: 'Twandikire', fr: 'Contact' },
  'nav.about': { en: 'About', rw: 'Abo Turi Bo', fr: 'À propos' },
  'nav.sell': { en: 'Sell a property', rw: 'Gurisha umutungo', fr: 'Vendre un bien' },
  'nav.primary': { en: 'Primary', rw: 'Ibanze', fr: 'Principal' },
  'nav.menu': { en: 'Menu', rw: 'Ibikubiyemo', fr: 'Menu' },
  'nav.openMenu': { en: 'Open menu', rw: 'Fungura menu', fr: 'Ouvrir le menu' },
  'nav.closeMenu': { en: 'Close menu', rw: 'Funga menu', fr: 'Fermer le menu' },
  'nav.viewAll': { en: 'View all', rw: 'Reba byose', fr: 'Tout voir' },

  /* ---------------- actions ---------------- */
  'cta.bookConsultation': {
    en: 'Book a Consultation',
    rw: 'Fata Igihe cyo Kuganira',
    fr: 'Réserver une consultation',
  },
  'cta.bookFree': {
    en: 'Book a free consultation',
    rw: 'Fata igihe cyo kuganira ku buntu',
    fr: 'Réserver une consultation gratuite',
  },
  'cta.browseProperties': {
    en: 'Browse properties',
    rw: 'Reba imitungo',
    fr: 'Parcourir les biens',
  },
  'cta.viewAllProperties': {
    en: 'View all properties',
    rw: 'Reba imitungo yose',
    fr: 'Voir tous les biens',
  },
  'cta.seeWealthCycle': {
    en: 'See the Wealth Cycle',
    rw: 'Reba Uruziga rw’Ubukungu',
    fr: 'Voir le Cycle de Richesse',
  },
  'cta.listProperty': {
    en: 'List your property',
    rw: 'Andikisha umutungo wawe',
    fr: 'Publier votre bien',
  },
  'cta.learnMore': { en: 'Learn more', rw: 'Menya byinshi', fr: 'En savoir plus' },
  'cta.readMore': { en: 'Read more', rw: 'Soma byinshi', fr: 'Lire la suite' },
  'cta.whatsapp': { en: 'Chat on WhatsApp', rw: 'Vugana natwe kuri WhatsApp', fr: 'Discuter sur WhatsApp' },
  'cta.callUs': { en: 'Call us', rw: 'Duhamagare', fr: 'Appelez-nous' },
  'cta.search': { en: 'Search properties', rw: 'Shakisha imitungo', fr: 'Rechercher des biens' },
  'cta.loadMore': { en: 'Load more', rw: 'Reba ibindi', fr: 'Voir plus' },
  'cta.applyNow': { en: 'Apply to join', rw: 'Saba kwifatanya', fr: 'Postuler' },
  'cta.meetTeam': { en: 'Meet the team', rw: 'Menya ikipe yacu', fr: 'Rencontrer l’équipe' },
  'cta.backHome': { en: 'Back to home', rw: 'Subira ahabanza', fr: 'Retour à l’accueil' },

  /* ---------------- hero ---------------- */
  'hero.badge': {
    en: 'Realty · Construction · Wealth Building',
    rw: 'Imitungo · Ubwubatsi · Kubaka Ubukungu',
    fr: 'Immobilier · Construction · Patrimoine',
  },
  'hero.titleA': { en: 'We don’t just sell property.', rw: 'Ntitugurisha imitungo gusa.', fr: 'Nous ne vendons pas que des biens.' },
  'hero.titleB': { en: 'We build wealth.', rw: 'Twubaka ubukungu.', fr: 'Nous bâtissons la richesse.' },
  'hero.lede': {
    en: 'Kigali’s full-cycle real estate and construction company. We find the property, help you buy it, build on it, tenant it — then help you sell and reinvest.',
    rw: 'Isosiyete yo mu Kigali ikora imirimo yose y’imitungo n’ubwubatsi. Turashaka umutungo, tukagufasha kuwugura, kuwubakaho, kuwukodesha — hanyuma tukagufasha kuwugurisha no gushora bundi bushya.',
    fr: 'La société immobilière et de construction à cycle complet de Kigali. Nous trouvons le bien, vous aidons à l’acheter, à construire, à le louer — puis à le revendre et réinvestir.',
  },
  'hero.searchTitle': {
    en: 'Find your next property',
    rw: 'Shaka umutungo ukurikira',
    fr: 'Trouvez votre prochain bien',
  },

  /* ---------------- property / listing vocabulary ---------------- */
  'prop.forSale': { en: 'For sale', rw: 'Kigurishwa', fr: 'À vendre' },
  'prop.forRent': { en: 'For rent', rw: 'Gikodeshwa', fr: 'À louer' },
  'prop.buy': { en: 'Buy', rw: 'Kugura', fr: 'Acheter' },
  'prop.rent': { en: 'Rent', rw: 'Gukodesha', fr: 'Louer' },
  'prop.all': { en: 'All', rw: 'Byose', fr: 'Tous' },
  'prop.available': { en: 'Available', rw: 'Iraboneka', fr: 'Disponible' },
  'prop.reserved': { en: 'Reserved', rw: 'Yarafashwe', fr: 'Réservé' },
  'prop.sold': { en: 'Sold', rw: 'Yagurishijwe', fr: 'Vendu' },
  'prop.rented': { en: 'Rented', rw: 'Yarakodeshejwe', fr: 'Loué' },
  'prop.underOffer': { en: 'Under offer', rw: 'Iri mu masezerano', fr: 'Sous offre' },
  'prop.titleVerified': { en: 'Title verified', rw: 'Impapuro zemejwe', fr: 'Titre vérifié' },
  'prop.askingPrice': { en: 'Asking price', rw: 'Igiciro gisabwa', fr: 'Prix demandé' },
  'prop.rentFrom': { en: 'Rent from', rw: 'Ubukode guhera kuri', fr: 'Loyer à partir de' },
  'prop.perMonth': { en: '/mo', rw: '/ukwezi', fr: '/mois' },
  'prop.bed': { en: 'bed', rw: 'icyumba', fr: 'ch.' },
  'prop.bath': { en: 'bath', rw: 'ubwiherero', fr: 's.d.b.' },
  'prop.built': { en: 'built', rw: 'byubatswe', fr: 'bâti' },
  'prop.perYear': { en: '/yr', rw: '/umwaka', fr: '/an' },
  'prop.save': { en: 'Save property', rw: 'Bika umutungo', fr: 'Enregistrer le bien' },
  'prop.unsave': { en: 'Remove from saved', rw: 'Kura mu byabitswe', fr: 'Retirer des favoris' },
  'prop.viewDetails': { en: 'View details', rw: 'Reba amakuru arambuye', fr: 'Voir les détails' },

  /* ---------------- marketplace ---------------- */
  'market.title': { en: 'Marketplace', rw: 'Isoko', fr: 'Place de marché' },
  'market.resultsFound': {
    en: '{count} properties found',
    rw: 'Imitungo {count} yabonetse',
    fr: '{count} biens trouvés',
  },
  'market.oneResult': { en: '1 property found', rw: 'Umutungo 1 wabonetse', fr: '1 bien trouvé' },
  'market.filters': { en: 'Filters', rw: 'Muyunguruzi', fr: 'Filtres' },
  'market.clearFilters': { en: 'Clear all filters', rw: 'Siba muyunguruzi zose', fr: 'Effacer les filtres' },
  'market.keyword': { en: 'Keyword', rw: 'Ijambo fatizo', fr: 'Mot-clé' },
  'market.listingType': { en: 'Listing type', rw: 'Ubwoko bw’itangazo', fr: 'Type d’annonce' },
  'market.category': { en: 'Category', rw: 'Icyiciro', fr: 'Catégorie' },
  'market.propertyType': { en: 'Property type', rw: 'Ubwoko bw’umutungo', fr: 'Type de bien' },
  'market.district': { en: 'District', rw: 'Akarere', fr: 'District' },
  'market.allDistricts': { en: 'All districts', rw: 'Uturere twose', fr: 'Tous les districts' },
  'market.allCategories': { en: 'All categories', rw: 'Ibyiciro byose', fr: 'Toutes catégories' },
  'market.allTypes': { en: 'All types', rw: 'Ubwoko bwose', fr: 'Tous types' },
  'market.maxPrice': { en: 'Max sale price', rw: 'Igiciro ntarengwa', fr: 'Prix maximum' },
  'market.any': { en: 'Any', rw: 'Icyo ari cyo cyose', fr: 'Indifférent' },
  'market.verifiedOnly': {
    en: 'RLA-verified titles only',
    rw: 'Impapuro zemejwe na RLA gusa',
    fr: 'Titres vérifiés RLA uniquement',
  },
  'market.sort': { en: 'Sort', rw: 'Shungura', fr: 'Trier' },
  'market.sortNewest': { en: 'Newest first', rw: 'Ibishya mbere', fr: 'Plus récents' },
  'market.sortPriceAsc': { en: 'Price: low to high', rw: 'Igiciro: gito ku kinini', fr: 'Prix croissant' },
  'market.sortPriceDesc': { en: 'Price: high to low', rw: 'Igiciro: kinini ku gito', fr: 'Prix décroissant' },
  'market.sortSize': { en: 'Largest parcel', rw: 'Ubuso bunini', fr: 'Plus grande parcelle' },
  'market.sortYield': { en: 'Highest yield', rw: 'Inyungu nyinshi', fr: 'Meilleur rendement' },
  'market.noResults': {
    en: 'Nothing matches those filters',
    rw: 'Nta kintu gihuye n’ibyo washyizemo',
    fr: 'Aucun résultat pour ces filtres',
  },
  'market.noResultsBody': {
    en: 'Our catalogue moves quickly and we source off-market parcels every week. Tell us what you are looking for and we will find it.',
    rw: 'Urutonde rwacu ruhinduka vuba, kandi buri cyumweru dushakisha imitungo itari ku isoko. Tubwire icyo ushaka tukigushakire.',
    fr: 'Notre catalogue évolue vite et nous sourçons chaque semaine des biens hors marché. Dites-nous ce que vous cherchez.',
  },
  'market.showing': {
    en: 'Showing {shown} of {total}',
    rw: 'Hagaragazwa {shown} kuri {total}',
    fr: 'Affichage de {shown} sur {total}',
  },
  'market.gridView': { en: 'Grid view', rw: 'Igaragaza ry’utubari', fr: 'Vue grille' },
  'market.listView': { en: 'List view', rw: 'Igaragaza ry’urutonde', fr: 'Vue liste' },

  /* ---------------- team ---------------- */
  'team.title': { en: 'Our Team', rw: 'Ikipe Yacu', fr: 'Notre Équipe' },
  'team.deals': { en: 'deals closed', rw: 'amasezerano yasojwe', fr: 'transactions conclues' },
  'team.speaks': { en: 'Speaks', rw: 'Avuga', fr: 'Parle' },
  'team.specialties': { en: 'Specialties', rw: 'Inzobere muri', fr: 'Spécialités' },
  'team.call': { en: 'Call', rw: 'Hamagara', fr: 'Appeler' },
  'team.email': { en: 'Email', rw: 'Imeyili', fr: 'E-mail' },
  'team.division': { en: 'Division', rw: 'Ishami', fr: 'Division' },

  /* ---------------- common ---------------- */
  'common.free': { en: 'Free', rw: 'Ku buntu', fr: 'Gratuit' },
  'common.from': { en: 'From', rw: 'Guhera kuri', fr: 'À partir de' },
  'common.new': { en: 'New', rw: 'Gishya', fr: 'Nouveau' },
  'common.readTime': { en: '{n} min read', rw: 'Isoma mu minota {n}', fr: '{n} min de lecture' },
  'common.loading': { en: 'Loading', rw: 'Birimo gutegurwa', fr: 'Chargement' },
  'common.language': { en: 'Language', rw: 'Ururimi', fr: 'Langue' },
  'common.theme': { en: 'Theme', rw: 'Isura', fr: 'Thème' },
  'common.lightMode': { en: 'Light mode', rw: 'Isura y’umucyo', fr: 'Mode clair' },
  'common.darkMode': { en: 'Dark mode', rw: 'Isura y’umwijima', fr: 'Mode sombre' },
  'common.openingHours': { en: 'Opening hours', rw: 'Amasaha y’akazi', fr: 'Heures d’ouverture' },

  /* ---------------- footer ---------------- */
  'footer.ctaTitleA': {
    en: 'One property is a purchase.',
    rw: 'Umutungo umwe ni ukugura.',
    fr: 'Un bien, c’est un achat.',
  },
  'footer.ctaTitleB': {
    en: 'Five is a portfolio.',
    rw: 'Itanu ni ishoramari.',
    fr: 'Cinq, c’est un patrimoine.',
  },
  'footer.newsletter': { en: 'Kigali Market Report', rw: 'Raporo y’Isoko rya Kigali', fr: 'Rapport du marché de Kigali' },
  'footer.newsletterBody': {
    en: 'One email a month: land price movements, new development zones and what we are seeing on the ground. No listings spam.',
    rw: 'Imeyili imwe buri kwezi: ihindagurika ry’ibiciro by’ubutaka, uduce dushya tw’iterambere, n’ibyo tubona ku butaka. Nta bwoba bw’amatangazo menshi.',
    fr: 'Un e-mail par mois : évolution des prix du foncier, nouvelles zones de développement et ce que nous observons sur le terrain. Sans spam.',
  },
  'footer.subscribed': {
    en: 'You’re on the list — the next report lands at the start of the month.',
    rw: 'Uri ku rutonde — raporo ikurikira izaza mu ntangiriro z’ukwezi.',
    fr: 'Vous êtes inscrit — le prochain rapport arrive en début de mois.',
  },
  'footer.rights': { en: 'All rights reserved.', rw: 'Uburenganzira bwose bwihariwe.', fr: 'Tous droits réservés.' },
  'footer.privacy': { en: 'Privacy', rw: 'Ibanga', fr: 'Confidentialité' },
  'footer.terms': { en: 'Terms', rw: 'Amabwiriza', fr: 'Conditions' },
  'footer.company': { en: 'Company', rw: 'Isosiyete', fr: 'Entreprise' },
  'footer.emailPlaceholder': { en: 'you@example.com', rw: 'wowe@urugero.com', fr: 'vous@exemple.com' },
  'footer.subscribe': { en: 'Subscribe', rw: 'Iyandikishe', fr: 'S’abonner' },
} satisfies Record<string, Entry>

export type TranslationKey = keyof typeof TRANSLATIONS
