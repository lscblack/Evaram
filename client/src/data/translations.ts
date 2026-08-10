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
  'prop.virtualTour': { en: 'Virtual tour', rw: 'Urugendo rwa VR', fr: 'Visite virtuelle' },
  'prop.video360': { en: '360° video', rw: 'Video ya 360°', fr: 'Vidéo 360°' },
  'prop.parcelOutline': { en: 'Plot outline', rw: 'Imbibi z’ikibanza', fr: 'Contour du terrain' },
  'prop.immersive': { en: 'Explore the property', rw: 'Sura umutungo', fr: 'Explorer le bien' },

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
    en: 'NLA-verified titles only',
    rw: 'Impapuro zemejwe na NLA gusa',
    fr: 'Titres vérifiés NLA uniquement',
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
  'footer.startCycle': { en: 'Start the cycle', rw: 'Tangira uruziga', fr: 'Commencer le cycle' },
  'footer.ctaBody': {
    en: 'Book a free 30-minute consultation. Tell us your budget and your goal — we will tell you honestly what is achievable and how long it will take.',
    rw: 'Fata igihe cy’iminota 30 cyo kuganira ku buntu. Tubwire ingengo y’imari n’intego yawe — tuzakubwira ukuri ku byashoboka n’igihe bizatwara.',
    fr: 'Réservez une consultation gratuite de 30 minutes. Dites-nous votre budget et votre objectif — nous vous dirons honnêtement ce qui est réalisable et en combien de temps.',
  },
  'footer.emailLabel': { en: 'Email address', rw: 'Aderesi ya imeyili', fr: 'Adresse e-mail' },
  'footer.allListings': { en: 'All listings', rw: 'Amatangazo yose', fr: 'Toutes les annonces' },
  'footer.landPlots': { en: 'Land & plots', rw: 'Ubutaka n’ibibanza', fr: 'Terrains et parcelles' },
  'footer.housesApartments': {
    en: 'Houses & apartments',
    rw: 'Amazu n’apartema',
    fr: 'Maisons et appartements',
  },
  'footer.commercialIndustrial': {
    en: 'Commercial & industrial',
    rw: 'Iby’ubucuruzi n’inganda',
    fr: 'Commercial et industriel',
  },
  'footer.sellYours': { en: 'Sell your property', rw: 'Gurisha umutungo wawe', fr: 'Vendre votre bien' },
  'footer.constructionRenovation': {
    en: 'Construction & renovation',
    rw: 'Ubwubatsi no kuvugurura',
    fr: 'Construction et rénovation',
  },
  'footer.propertyManagement': {
    en: 'Property management',
    rw: 'Gucunga imitungo',
    fr: 'Gestion immobilière',
  },
  'footer.diasporaServices': {
    en: 'Diaspora services',
    rw: 'Serivisi z’abo mu mahanga',
    fr: 'Services diaspora',
  },
  'footer.aboutEvaramu': { en: 'About Evaramu', rw: 'Ibyerekeye Evaramu', fr: 'À propos d’Evaramu' },
  'footer.joinAgency': { en: 'Join our agency', rw: 'Injira mu kigo cyacu', fr: 'Rejoindre notre agence' },
  'footer.insightsReports': {
    en: 'Insights & market reports',
    rw: 'Ubushishozi na raporo z’isoko',
    fr: 'Analyses et rapports de marché',
  },
  'footer.contactUs': { en: 'Contact us', rw: 'Twandikire', fr: 'Nous contacter' },

  /* ---------------- home sections ---------------- */
  'filter.featured': { en: 'Featured', rw: 'Byatoranyijwe', fr: 'En vedette' },
  'filter.residential': { en: 'Residential', rw: 'Iby’ubuturo', fr: 'Résidentiel' },
  'filter.commercial': { en: 'Commercial', rw: 'Iby’ubucuruzi', fr: 'Commercial' },
  'filter.agricultural': { en: 'Agricultural', rw: 'Iby’ubuhinzi', fr: 'Agricole' },
  'filter.toRent': { en: 'To rent', rw: 'Bikodeshwa', fr: 'À louer' },

  'division.Realty': { en: 'Realty', rw: 'Imitungo', fr: 'Immobilier' },
  'division.Construction': { en: 'Construction', rw: 'Ubwubatsi', fr: 'Construction' },
  'division.Group': { en: 'Group', rw: 'Ikigo', fr: 'Groupe' },

  'section.forDiaspora': { en: 'For the diaspora', rw: 'Ku bo mu mahanga', fr: 'Pour la diaspora' },
  'section.joinAgency': { en: 'Join the agency', rw: 'Injira mu kigo', fr: 'Rejoindre l’agence' },

  'stories.previous': { en: 'Previous story', rw: 'Inkuru ibanza', fr: 'Témoignage précédent' },
  'stories.next': { en: 'Next story', rw: 'Inkuru ikurikira', fr: 'Témoignage suivant' },
  'stories.ratingNote': {
    en: 'Average client rating across verified testimonials and Google Business reviews. We ask every client for one — and we publish the ones we get.',
    rw: 'Impuzandengo y’amanota y’abakiriya mu byo batubwiye byemejwe no muri Google Business. Dusaba buri mukiriya kutugezaho iryo tekereza — kandi dutangaza ayo twakiriye.',
    fr: 'Note moyenne des clients, sur les témoignages vérifiés et les avis Google Business. Nous la demandons à chaque client — et nous publions celles que nous recevons.',
  },
  'stories.dealsYearOne': {
    en: 'Deals closed in year one',
    rw: 'Amasezerano yasojwe mu mwaka wa mbere',
    fr: 'Transactions conclues la première année',
  },
  'stories.renovations': {
    en: 'Renovation projects completed',
    rw: 'Imishinga yo kuvugurura yarangiye',
    fr: 'Projets de rénovation achevés',
  },
  'stories.rentalUnits': {
    en: 'Rental units under management',
    rw: 'Amazu akodeshwa ducunga',
    fr: 'Logements locatifs en gestion',
  },
  'stories.titlesVerified': {
    en: 'Titles verified before transacting',
    rw: 'Impapuro zemejwe mbere yo gukora ubucuruzi',
    fr: 'Titres vérifiés avant toute transaction',
  },

  'cta.exploreConstruction': {
    en: 'Explore construction',
    rw: 'Sura ubwubatsi',
    fr: 'Découvrir la construction',
  },
  'cta.getQuote': { en: 'Get a quote', rw: 'Saba igiciro', fr: 'Demander un devis' },
  'cta.bookFreeCall': {
    en: 'Book a free call',
    rw: 'Fata igihe cyo kuvugana ku buntu',
    fr: 'Réserver un appel gratuit',
  },
  'cta.allInsights': { en: 'All insights', rw: 'Ubushishozi bwose', fr: 'Toutes les analyses' },
  'cta.readMarketReports': {
    en: 'Read our market reports',
    rw: 'Soma raporo zacu z’isoko',
    fr: 'Lire nos rapports de marché',
  },
  'cta.seeFullModel': {
    en: 'See the full model',
    rw: 'Reba uburyo bwose',
    fr: 'Voir le modèle complet',
  },
  'pkg.mostChosen': { en: 'Most chosen', rw: 'Ikoreshwa cyane', fr: 'Le plus choisi' },
  'compare.gap': { en: 'The gap', rw: 'Icyuho', fr: 'L’écart' },
  'compare.competitors': {
    en: 'What competitors do',
    rw: 'Ibyo abandi bakora',
    fr: 'Ce que font les concurrents',
  },
  'compare.evaramu': {
    en: 'What Evaramu does',
    rw: 'Ibyo Evaramu ikora',
    fr: 'Ce que fait Evaramu',
  },

  'nav.account': { en: 'Account', rw: 'Konti', fr: 'Compte' },

  /* ---------------- page-level copy ---------------- */
  'insights.searchPlaceholder': {
    en: 'Search articles…',
    rw: 'Shakisha inyandiko…',
    fr: 'Rechercher des articles…',
  },
  'insights.actOnIt': { en: 'Act on it', rw: 'Bikoreshe', fr: 'Passer à l’action' },
  'insights.keepReading': { en: 'Keep reading', rw: 'Komeza usome', fr: 'Poursuivre la lecture' },
  'market.searchPlaceholder': {
    en: 'Location, reference, feature…',
    rw: 'Ahantu, nimero, ikiranga…',
    fr: 'Lieu, référence, caractéristique…',
  },
  'market.liveListings': { en: 'Live listings', rw: 'Amatangazo ariho', fr: 'Annonces en ligne' },
  'market.districts': { en: 'Districts', rw: 'Uturere', fr: 'Districts' },
  'market.verified': { en: 'Verified', rw: 'Byemejwe', fr: 'Vérifié' },
  'account.namePlaceholder': {
    en: 'Your full name',
    rw: 'Amazina yawe yose',
    fr: 'Votre nom complet',
  },
  'account.phonePlaceholder': {
    en: 'Phone or WhatsApp',
    rw: 'Telefoni cyangwa WhatsApp',
    fr: 'Téléphone ou WhatsApp',
  },

  /* ---------------- buyer requests ---------------- */
  'request.title': {
    en: 'Tell us what you are looking for',
    rw: 'Tubwire icyo ushaka',
    fr: 'Dites-nous ce que vous cherchez',
  },
  'request.body': {
    en: 'Most of what we handle never reaches this page. Describe the property you want and a consultant will call you when a match comes in — usually before it is listed.',
    rw: 'Byinshi dukora ntibigera kuri uru rupapuro. Sobanura umutungo ushaka maze umujyanama akuhamagare igihe habonetse uhuye nawe — akenshi mbere y’uko utangazwa.',
    fr: 'L’essentiel de ce que nous traitons n’arrive jamais sur cette page. Décrivez le bien que vous voulez et un consultant vous appellera dès qu’une correspondance arrive — souvent avant sa publication.',
  },
  'request.name': { en: 'Your name', rw: 'Amazina yawe', fr: 'Votre nom' },
  'request.phone': { en: 'Phone', rw: 'Telefoni', fr: 'Téléphone' },
  'request.email': { en: 'Email (optional)', rw: 'Imeyili (si itegeko)', fr: 'E-mail (facultatif)' },
  'request.lookingTo': { en: 'Looking to', rw: 'Ushaka', fr: 'Vous souhaitez' },
  'request.areas': { en: 'Preferred areas', rw: 'Ahantu wifuza', fr: 'Zones souhaitées' },
  'request.areasHint': {
    en: 'Neighbourhoods, not just the district.',
    rw: 'Utudugudu, atari akarere gusa.',
    fr: 'Les quartiers, pas seulement le district.',
  },
  'request.areasPlaceholder': {
    en: 'Kibagabaga, Kanombe…',
    rw: 'Kibagabaga, Kanombe…',
    fr: 'Kibagabaga, Kanombe…',
  },
  'request.budgetMin': { en: 'Budget from (RWF)', rw: 'Ingengo guhera kuri (RWF)', fr: 'Budget à partir de (RWF)' },
  'request.budgetMax': { en: 'Budget up to (RWF)', rw: 'Ingengo ntarengwa (RWF)', fr: 'Budget maximum (RWF)' },
  'request.bedrooms': { en: 'Bedrooms (minimum)', rw: 'Ibyumba byo kuraramo (byibura)', fr: 'Chambres (minimum)' },
  'request.timeline': { en: 'Timeline', rw: 'Igihe', fr: 'Échéance' },
  'request.timelinePlaceholder': {
    en: 'Within 3 months',
    rw: 'Mu mezi 3',
    fr: 'Sous 3 mois',
  },
  'request.notes': { en: 'Anything else', rw: 'Ikindi cyose', fr: 'Autre chose' },
  'request.notesPlaceholder': {
    en: 'Access to a tarmac road, title already subdivided, must take a two-storey build…',
    rw: 'Kugera ku muhanda wa kaburimbo, ikibanza cyaracicwemo, gishobora kubakwaho amagorofa abiri…',
    fr: 'Accès à une route bitumée, titre déjà morcelé, doit supporter un R+1…',
  },
  'request.submit': { en: 'Send my request', rw: 'Ohereza icyifuzo cyanjye', fr: 'Envoyer ma demande' },
  'request.thanksTitle': {
    en: 'Request received',
    rw: 'Icyifuzo cyakiriwe',
    fr: 'Demande reçue',
  },

  /* ---------------- account dashboard ---------------- */
  'account.myRequests': { en: 'My requests', rw: 'Ibyifuzo byanjye', fr: 'Mes demandes' },
  'account.myOffers': { en: 'My offers', rw: 'Ibyo natanze', fr: 'Mes offres' },
  'account.wanted': { en: 'Properties I am looking for', rw: 'Imitungo nshaka', fr: 'Biens recherchés' },
  'account.selling': { en: 'Properties I asked you to sell', rw: 'Imitungo nasabye ko mugurisha', fr: 'Biens que j’ai demandé de vendre' },
  'account.noWanted': {
    en: 'You have not asked us to find anything yet.',
    rw: 'Nta kintu urasaba ko tugushakira.',
    fr: 'Vous ne nous avez encore rien demandé de chercher.',
  },
  'account.noSelling': {
    en: 'You have not asked us to sell anything yet.',
    rw: 'Nta kintu urasaba ko tugurisha.',
    fr: 'Vous ne nous avez encore rien demandé de vendre.',
  },
  'account.signOut': { en: 'Sign out', rw: 'Sohoka', fr: 'Se déconnecter' },
  'account.submitted': { en: 'Submitted', rw: 'Byoherejwe', fr: 'Envoyé le' },
  'status.new': { en: 'New', rw: 'Gishya', fr: 'Nouveau' },
  'status.reviewing': { en: 'Being reviewed', rw: 'Kirimo gusuzumwa', fr: 'En cours d’examen' },
  'status.accepted': { en: 'Accepted', rw: 'Cyemewe', fr: 'Accepté' },
  'status.rejected': { en: 'Not taken on', rw: 'Nticyakiriwe', fr: 'Non retenu' },
  'status.open': { en: 'Open', rw: 'Gifunguye', fr: 'Ouvert' },
  'status.matched': { en: 'Match found', rw: 'Habonetse uhuye', fr: 'Correspondance trouvée' },
  'status.fulfilled': { en: 'Fulfilled', rw: 'Cyasohojwe', fr: 'Satisfait' },
  'status.closed': { en: 'Closed', rw: 'Cyarafunzwe', fr: 'Clôturé' },

  /* ---------------- controls & forms ---------------- */
  'ui.backToTop': { en: 'Back to top', rw: 'Subira hejuru', fr: 'Retour en haut' },
  'ui.previousMonth': { en: 'Previous month', rw: 'Ukwezi gushize', fr: 'Mois précédent' },
  'ui.nextMonth': { en: 'Next month', rw: 'Ukwezi gutaha', fr: 'Mois prochain' },
  'ui.newChallenge': { en: 'New challenge', rw: 'Ikibazo gishya', fr: 'Nouveau défi' },
  'ui.yourAnswer': { en: 'Your answer', rw: 'Igisubizo cyawe', fr: 'Votre réponse' },
  'ui.expand': { en: 'Expand', rw: 'Agura', fr: 'Agrandir' },
  'ui.close': { en: 'Close', rw: 'Funga', fr: 'Fermer' },
  'ui.select': { en: 'Select…', rw: 'Hitamo…', fr: 'Sélectionner…' },
  'ui.choose': { en: 'Choose…', rw: 'Hitamo…', fr: 'Choisir…' },
  'ui.findDetail': { en: 'Find a detail…', rw: 'Shakisha ikintu…', fr: 'Trouver un détail…' },
  'bid.notePlaceholder': {
    en: 'Anything the seller should know? (optional)',
    rw: 'Hari icyo ushaka ko umugurisha amenya? (si itegeko)',
    fr: 'Quelque chose à signaler au vendeur ? (facultatif)',
  },
  'sell.typePlaceholder': {
    en: 'Residential plot, house, farmland…',
    rw: 'Ikibanza cy’ubuturo, inzu, ubutaka bw’ubuhinzi…',
    fr: 'Parcelle résidentielle, maison, terrain agricole…',
  },
  'sell.notesPlaceholder': {
    en: 'Access, what is on the plot, why you are selling, any dispute history.',
    rw: 'Uko hinjirwa, ibiri ku kibanza, impamvu ugurisha, n’amakimbirane yabayeho.',
    fr: 'Accès, ce qui se trouve sur la parcelle, pourquoi vous vendez, tout litige passé.',
  },

  'hero.searchPlaceholder': {
    en: 'Kanombe, Kimironko, UPI…',
    rw: 'Kanombe, Kimironko, UPI…',
    fr: 'Kanombe, Kimironko, UPI…',
  },
} satisfies Record<string, Entry>

export type TranslationKey = keyof typeof TRANSLATIONS
