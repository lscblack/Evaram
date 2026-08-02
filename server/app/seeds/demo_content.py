"""UI strings, page copy, testimonials, FAQs and articles."""

# Kinyarwanda needs a native-speaker pass before launch; every row that has an
# `rw` value is flagged `needs_review` by the seeder so the admin UI can list them.
UI_STRINGS: dict[str, dict] = {
    "nav.home": {"en": "Home", "rw": "Ahabanza", "fr": "Accueil"},
    "nav.properties": {"en": "Properties", "rw": "Imitungo", "fr": "Biens"},
    "nav.services": {"en": "Services", "rw": "Serivisi", "fr": "Services"},
    "nav.wealthCycle": {"en": "Wealth Cycle", "rw": "Uruziga rw’Ubukungu", "fr": "Cycle de Richesse"},
    "nav.construction": {"en": "Construction", "rw": "Ubwubatsi", "fr": "Construction"},
    "nav.team": {"en": "Our Team", "rw": "Ikipe Yacu", "fr": "Notre Équipe"},
    "nav.join": {"en": "Join Us", "rw": "Twifatanye", "fr": "Rejoignez-nous"},
    "nav.insights": {"en": "Insights", "rw": "Ubushishozi", "fr": "Analyses"},
    "nav.contact": {"en": "Contact", "rw": "Twandikire", "fr": "Contact"},
    "nav.about": {"en": "About", "rw": "Abo Turi Bo", "fr": "À propos"},
    "nav.sell": {"en": "Sell a property", "rw": "Gurisha umutungo", "fr": "Vendre un bien"},
    "nav.viewAll": {"en": "View all", "rw": "Reba byose", "fr": "Tout voir"},
    "nav.menu": {"en": "Menu", "rw": "Ibikubiyemo", "fr": "Menu"},
    "nav.openMenu": {"en": "Open menu", "rw": "Fungura menu", "fr": "Ouvrir le menu"},
    "nav.closeMenu": {"en": "Close menu", "rw": "Funga menu", "fr": "Fermer le menu"},
    "nav.primary": {"en": "Primary", "rw": "Ibanze", "fr": "Principal"},

    "cta.bookConsultation": {"en": "Book a Consultation", "rw": "Fata Igihe cyo Kuganira",
                             "fr": "Réserver une consultation"},
    "cta.bookFree": {"en": "Book a free consultation", "rw": "Fata igihe cyo kuganira ku buntu",
                     "fr": "Réserver une consultation gratuite"},
    "cta.browseProperties": {"en": "Browse properties", "rw": "Reba imitungo",
                             "fr": "Parcourir les biens"},
    "cta.viewAllProperties": {"en": "View all properties", "rw": "Reba imitungo yose",
                              "fr": "Voir tous les biens"},
    "cta.seeWealthCycle": {"en": "See the Wealth Cycle", "rw": "Reba Uruziga rw’Ubukungu",
                           "fr": "Voir le Cycle de Richesse"},
    "cta.listProperty": {"en": "List your property", "rw": "Andikisha umutungo wawe",
                         "fr": "Publier votre bien"},
    "cta.learnMore": {"en": "Learn more", "rw": "Menya byinshi", "fr": "En savoir plus"},
    "cta.readMore": {"en": "Read more", "rw": "Soma byinshi", "fr": "Lire la suite"},
    "cta.whatsapp": {"en": "Chat on WhatsApp", "rw": "Vugana natwe kuri WhatsApp",
                     "fr": "Discuter sur WhatsApp"},
    "cta.callUs": {"en": "Call us", "rw": "Duhamagare", "fr": "Appelez-nous"},
    "cta.search": {"en": "Search properties", "rw": "Shakisha imitungo",
                   "fr": "Rechercher des biens"},
    "cta.loadMore": {"en": "Load more", "rw": "Reba ibindi", "fr": "Voir plus"},
    "cta.applyNow": {"en": "Apply to join", "rw": "Saba kwifatanya", "fr": "Postuler"},
    "cta.meetTeam": {"en": "Meet the team", "rw": "Menya ikipe yacu",
                     "fr": "Rencontrer l’équipe"},
    "cta.backHome": {"en": "Back to home", "rw": "Subira ahabanza",
                     "fr": "Retour à l’accueil"},

    "hero.badge": {"en": "Realty · Construction · Wealth Building",
                   "rw": "Imitungo · Ubwubatsi · Kubaka Ubukungu",
                   "fr": "Immobilier · Construction · Patrimoine"},
    "hero.titleA": {"en": "We don’t just sell property.", "rw": "Ntitugurisha imitungo gusa.",
                    "fr": "Nous ne vendons pas que des biens."},
    "hero.titleB": {"en": "We build wealth.", "rw": "Twubaka ubukungu.",
                    "fr": "Nous bâtissons la richesse."},
    "hero.lede": {
        "en": ("Kigali’s full-cycle real estate and construction company. We find the property, "
               "help you buy it, build on it, tenant it — then help you sell and reinvest."),
        "rw": ("Isosiyete yo mu Kigali ikora imirimo yose y’imitungo n’ubwubatsi. Turashaka "
               "umutungo, tukagufasha kuwugura, kuwubakaho, kuwukodesha — hanyuma tukagufasha "
               "kuwugurisha no gushora bundi bushya."),
        "fr": ("La société immobilière et de construction à cycle complet de Kigali. Nous "
               "trouvons le bien, vous aidons à l’acheter, à construire, à le louer — puis à "
               "le revendre et réinvestir."),
    },
    "hero.searchTitle": {"en": "Find your next property", "rw": "Shaka umutungo ukurikira",
                         "fr": "Trouvez votre prochain bien"},

    "prop.forSale": {"en": "For sale", "rw": "Kigurishwa", "fr": "À vendre"},
    "prop.forRent": {"en": "For rent", "rw": "Gikodeshwa", "fr": "À louer"},
    "prop.buy": {"en": "Buy", "rw": "Kugura", "fr": "Acheter"},
    "prop.rent": {"en": "Rent", "rw": "Gukodesha", "fr": "Louer"},
    "prop.all": {"en": "All", "rw": "Byose", "fr": "Tous"},
    "prop.available": {"en": "Available", "rw": "Iraboneka", "fr": "Disponible"},
    "prop.reserved": {"en": "Reserved", "rw": "Yarafashwe", "fr": "Réservé"},
    "prop.sold": {"en": "Sold", "rw": "Yagurishijwe", "fr": "Vendu"},
    "prop.rented": {"en": "Rented", "rw": "Yarakodeshejwe", "fr": "Loué"},
    "prop.underOffer": {"en": "Under offer", "rw": "Iri mu masezerano", "fr": "Sous offre"},
    "prop.titleVerified": {"en": "Title verified", "rw": "Impapuro zemejwe",
                           "fr": "Titre vérifié"},
    "prop.askingPrice": {"en": "Asking price", "rw": "Igiciro gisabwa", "fr": "Prix demandé"},
    "prop.rentFrom": {"en": "Rent from", "rw": "Ubukode guhera kuri", "fr": "Loyer à partir de"},
    "prop.perMonth": {"en": "/mo", "rw": "/ukwezi", "fr": "/mois"},
    "prop.perYear": {"en": "/yr", "rw": "/umwaka", "fr": "/an"},
    "prop.reference": {"en": "Reference", "rw": "Nimero y’ikimenyetso", "fr": "Référence"},
    "prop.save": {"en": "Save property", "rw": "Bika umutungo", "fr": "Enregistrer le bien"},
    "prop.unsave": {"en": "Remove from saved", "rw": "Kura mu byabitswe",
                    "fr": "Retirer des favoris"},
    "prop.viewDetails": {"en": "View details", "rw": "Reba amakuru arambuye",
                         "fr": "Voir les détails"},
    "prop.virtualTour": {"en": "Virtual tour", "rw": "Urugendo rwa VR", "fr": "Visite virtuelle"},
    "prop.video360": {"en": "360° video", "rw": "Videwo ya 360°", "fr": "Vidéo 360°"},
    "prop.parcelOutline": {"en": "Parcel outline", "rw": "Imbibi z’ikibanza",
                           "fr": "Contour de la parcelle"},

    "market.title": {"en": "Marketplace", "rw": "Isoko", "fr": "Place de marché"},
    "market.filters": {"en": "Filters", "rw": "Muyunguruzi", "fr": "Filtres"},
    "market.clearFilters": {"en": "Clear all filters", "rw": "Siba muyunguruzi zose",
                            "fr": "Effacer les filtres"},
    "market.keyword": {"en": "Keyword", "rw": "Ijambo fatizo", "fr": "Mot-clé"},
    "market.listingType": {"en": "Listing type", "rw": "Ubwoko bw’itangazo",
                           "fr": "Type d’annonce"},
    "market.category": {"en": "Category", "rw": "Icyiciro", "fr": "Catégorie"},
    "market.propertyType": {"en": "Property type", "rw": "Ubwoko bw’umutungo",
                            "fr": "Type de bien"},
    "market.district": {"en": "District", "rw": "Akarere", "fr": "District"},
    "market.allDistricts": {"en": "All districts", "rw": "Uturere twose",
                            "fr": "Tous les districts"},
    "market.allCategories": {"en": "All categories", "rw": "Ibyiciro byose",
                             "fr": "Toutes catégories"},
    "market.allTypes": {"en": "All types", "rw": "Ubwoko bwose", "fr": "Tous types"},
    "market.maxPrice": {"en": "Max sale price", "rw": "Igiciro ntarengwa", "fr": "Prix maximum"},
    "market.any": {"en": "Any", "rw": "Icyo ari cyo cyose", "fr": "Indifférent"},
    "market.verifiedOnly": {"en": "NLA-verified titles only", "rw": "Impapuro zemejwe na NLA gusa",
                            "fr": "Titres vérifiés NLA uniquement"},
    "market.sort": {"en": "Sort", "rw": "Shungura", "fr": "Trier"},
    "market.sortNewest": {"en": "Newest first", "rw": "Ibishya mbere", "fr": "Plus récents"},
    "market.sortPriceAsc": {"en": "Price: low to high", "rw": "Igiciro: gito ku kinini",
                            "fr": "Prix croissant"},
    "market.sortPriceDesc": {"en": "Price: high to low", "rw": "Igiciro: kinini ku gito",
                             "fr": "Prix décroissant"},
    "market.sortSize": {"en": "Largest parcel", "rw": "Ubuso bunini",
                        "fr": "Plus grande parcelle"},
    "market.sortYield": {"en": "Highest yield", "rw": "Inyungu nyinshi",
                         "fr": "Meilleur rendement"},
    "market.gridView": {"en": "Grid view", "rw": "Igaragaza ry’utubari", "fr": "Vue grille"},
    "market.listView": {"en": "List view", "rw": "Igaragaza ry’urutonde", "fr": "Vue liste"},
    "market.noResults": {"en": "Nothing matches those filters",
                         "rw": "Nta kintu gihuye n’ibyo washyizemo",
                         "fr": "Aucun résultat pour ces filtres"},

    "team.title": {"en": "Our Team", "rw": "Ikipe Yacu", "fr": "Notre Équipe"},
    "team.deals": {"en": "deals closed", "rw": "amasezerano yasojwe",
                   "fr": "transactions conclues"},
    "team.speaks": {"en": "Speaks", "rw": "Avuga", "fr": "Parle"},
    "team.specialties": {"en": "Specialties", "rw": "Inzobere muri", "fr": "Spécialités"},
    "team.call": {"en": "Call", "rw": "Hamagara", "fr": "Appeler"},
    "team.email": {"en": "Email", "rw": "Imeyili", "fr": "E-mail"},

    "common.free": {"en": "Free", "rw": "Ku buntu", "fr": "Gratuit"},
    "common.from": {"en": "From", "rw": "Guhera kuri", "fr": "À partir de"},
    "common.language": {"en": "Language", "rw": "Ururimi", "fr": "Langue"},
    "common.theme": {"en": "Theme", "rw": "Isura", "fr": "Thème"},
    "common.lightMode": {"en": "Light mode", "rw": "Isura y’umucyo", "fr": "Mode clair"},
    "common.darkMode": {"en": "Dark mode", "rw": "Isura y’umwijima", "fr": "Mode sombre"},
    "common.loading": {"en": "Loading", "rw": "Birimo gutegurwa", "fr": "Chargement"},

    "auth.signIn": {"en": "Sign in", "rw": "Injira", "fr": "Se connecter"},
    "auth.email": {"en": "Email address", "rw": "Aderesi imeyili", "fr": "Adresse e-mail"},
    "auth.password": {"en": "Password", "rw": "Ijambobanga", "fr": "Mot de passe"},
    "auth.otpTitle": {"en": "Enter your code", "rw": "Andika kode yawe", "fr": "Saisissez le code"},
    "auth.otpSent": {"en": "We sent a code to", "rw": "Twoherereje kode kuri",
                     "fr": "Nous avons envoyé un code à"},
    "auth.resend": {"en": "Resend code", "rw": "Ongera wohereze kode", "fr": "Renvoyer le code"},
    "auth.captchaPrompt": {"en": "Verification", "rw": "Kwemeza", "fr": "Vérification"},
}


CONTENT_BLOCKS: list[dict] = [
    {"page": "home",
     "key": "market",
     "label": "Market section",
     "display_order": 1,
     "eyebrow": "The market",
     "title": "The demand is structural,",
     "accent": "not speculative.",
     "body": "Rwanda needs more than 30,000 new housing units a year and delivered 13.8% of that in 2024. The gap is not a trend that might reverse — it is arithmetic, and it is widening.",
     "items": [
        {
                "text": "Sources: residential market valued at USD 84.85B of a USD 95.70B total (2025), projected USD 110.10B by 2029."
        }
]},
    {"page": "home",
     "key": "services",
     "label": "Services section",
     "display_order": 2,
     "eyebrow": "What we do",
     "title": "Two divisions.",
     "accent": "One value chain.",
     "body": "Most agencies sell and disappear. Most builders never see the buyer. Evaramu Realty and Evaramu Construction sit inside the same company — which is why we can add value to a property instead of just transacting on it."},
    {"page": "home",
     "key": "featured",
     "label": "Featured listings",
     "display_order": 3,
     "eyebrow": "Current listings",
     "title": "Verified properties,",
     "accent": "ready to move on.",
     "body": "Every listing below has been checked against its UPI at the National Land Authority. You see the parcel size, the tenure and the coordinates before you ever pick up the phone."},
    {"page": "home",
     "key": "wealth_cycle",
     "label": "Wealth Cycle section",
     "display_order": 4,
     "eyebrow": "Our signature model",
     "title": "The Evaramu",
     "accent": "Wealth Cycle",
     "body": "Most agencies close a sale and disappear. We stay. Buy, build, earn, sell, reinvest, repeat — six steps that turn one property into four or five within three years.",
     "cta_label": "See the full model",
     "cta_href": "/wealth-cycle"},
    {"page": "home",
     "key": "why",
     "label": "Why Evaramu",
     "display_order": 5,
     "eyebrow": "Why Evaramu",
     "title": "There are 204 registered agencies in Rwanda.",
     "accent": "Almost none of them do this.",
     "body": "99% are single-owner informal operations with no systems, no branding and no technology. The few large formal players ignore the middle market entirely.",
     "items": [
        {
                "gap": "After the sale",
                "them": "Sell once, then disappear",
                "us": "Stay through buy → build → earn → sell → reinvest"
        },
        {
                "gap": "Diaspora clients",
                "them": "Phone calls and WhatsApp, no documentation",
                "us": "Video updates, digital contracts, verified titles, monthly reports"
        },
        {
                "gap": "Marketing a property",
                "them": "Blurry phone photos in WhatsApp groups",
                "us": "Drone video, professional photography, mapped online listings"
        },
        {
                "gap": "Realty and construction",
                "them": "Agents and builders are separate businesses",
                "us": "One company that brokers and builds — the full value chain"
        },
        {
                "gap": "Documentation",
                "them": "Verbal deals, no receipts, title disputes",
                "us": "Digital contracts, cost tracking, NLA verification workflow"
        },
        {
                "gap": "Following up a lead",
                "them": "Leads lost, no follow-up system",
                "us": "Every contact tracked; response within two hours"
        },
        {
                "gap": "Educating clients",
                "them": "Almost no agent publishes anything useful",
                "us": "Weekly land tours, market data, renovation reveals, testimonials"
        }
]},
    {"page": "home",
     "key": "trust",
     "label": "Trust commitments",
     "display_order": 6,
     "items": [
        {
                "title": "Every title verified at NLA",
                "icon": "ShieldCheck",
                "description": "No transaction moves forward without clean confirmation from the National Land Authority. We would rather lose a deal than hand you a dispute."
        },
        {
                "title": "Every deal documented",
                "icon": "FileCheck2",
                "description": "Digital contracts, receipts and cost tracking on every engagement. No verbal-only agreements — inside or outside the company."
        },
        {
                "title": "Response within 2 hours",
                "icon": "Timer",
                "description": "Speed is our differentiator. Competitors take days to return a call; we answer every lead the same working day."
        },
        {
                "title": "We stay after the sale",
                "icon": "HeartHandshake",
                "description": "Most agencies close and disappear. We build, tenant, manage and re-list — the relationship runs for years, not weeks."
        }
]},
    {"page": "home",
     "key": "diaspora",
     "label": "Diaspora section",
     "display_order": 7,
     "eyebrow": "For the diaspora",
     "title": "Invest at home",
     "accent": "without flying home.",
     "body": "You have heard the stories — deposits sent, brokers gone quiet, a plot that turned out to belong to someone else. We built our whole diaspora process around removing the distance that makes that possible.",
     "cta_label": "Book a diaspora briefing",
     "cta_href": "/consultation?type=diaspora"},
    {"page": "about",
     "key": "story",
     "label": "Company story",
     "display_order": 1,
     "eyebrow": "Who we are",
     "title": "Ordinary Rwandans should be able to",
     "accent": "build real wealth through property.",
     "body": "Rwanda needs more than 30,000 new housing units every year and delivered 13.8% of that in 2024. The national deficit sits above 400,000 units and widens annually. Kigali's household count is projected to double by 2032."},
    {"page": "sell",
     "key": "intro",
     "label": "Sell page intro",
     "display_order": 1,
     "eyebrow": "Sell with Evaramu",
     "title": "Your property deserves better than",
     "accent": "a blurry photo in a group chat.",
     "body": "Tell us about it and we will come back within two working hours with a valuation appointment. No listing fee, no exclusivity trap, and commission agreed in writing before anything begins."},
    {"page": "wealth-cycle",
     "key": "worked_example",
     "label": "Worked client journey",
     "display_order": 1,
     "eyebrow": "A real client journey",
     "title": "RWF 8 million in savings.",
     "accent": "Three properties by Year 3.",
     "body": "This is the worked example from our business plan, published in full. Every figure is one we have actually seen, not a projection we invented for a brochure.",
     "items": [
        {
                "year": "Year 0",
                "situation": "Client has RWF 8M savings. No property.",
                "action": "We source a verified plot in Kanombe. We negotiate. We close.",
                "outcome": "Client buys first land, valued at RWF 10M.",
                "portfolioValue": 10000000
        },
        {
                "year": "Year 0–1",
                "situation": "Land sitting idle.",
                "action": "We build a simple 2-unit rental on the plot.",
                "outcome": "Construction cost RWF 18M. Property now worth RWF 35M.",
                "portfolioValue": 35000000
        },
        {
                "year": "Year 1–2",
                "situation": "Property completed.",
                "action": "We find tenants and charge a 10% management fee monthly.",
                "outcome": "Client earns RWF 400,000/month passive income.",
                "portfolioValue": 38000000
        },
        {
                "year": "Year 2",
                "situation": "Client wants to grow.",
                "action": "We advise: time to sell. We list and market professionally.",
                "outcome": "Sold for RWF 40M — a RWF 14M gain plus 24 months of income.",
                "portfolioValue": 40000000
        },
        {
                "year": "Year 2–3",
                "situation": "Client has RWF 54M total.",
                "action": "We reinvest into 2–3 properties simultaneously.",
                "outcome": "Client now owns 3 properties. The cycle repeats.",
                "portfolioValue": 54000000
        },
        {
                "year": "Year 3+",
                "situation": "Portfolio of 4–5 properties.",
                "action": "We manage all properties; Evaramu earns ongoing management fees.",
                "outcome": "Multiple income streams and a compounding portfolio.",
                "portfolioValue": 96000000
        }
]},
    {"page": "home",
     "key": "trust_points",
     "label": "Why Evaramu — trust points",
     "display_order": 20,
     "eyebrow": "Why Evaramu",
     "title": "There are 204 registered agencies in Rwanda.",
     "accent": "Here is what separates us.",
     "body": "Four commitments we hold to on every engagement, written down so you can hold us to them.",
     "items": [
        {
                "title": "Every title verified at NLA",
                "description": "No transaction moves forward without clean confirmation from the National Land Authority. We would rather lose a deal than hand you a dispute.",
                "icon": "ShieldCheck"
        },
        {
                "title": "Every deal documented",
                "description": "Digital contracts, receipts and cost tracking on every engagement. No verbal-only agreements — inside or outside the company.",
                "icon": "FileCheck2"
        },
        {
                "title": "Response within 2 hours",
                "description": "Speed is our differentiator. Competitors take days to return a call; we answer every lead the same working day.",
                "icon": "Timer"
        },
        {
                "title": "We stay after the sale",
                "description": "Most agencies close and disappear. We build, tenant, manage and re-list — the relationship runs for years, not weeks.",
                "icon": "HeartHandshake"
        }
]},
    {"page": "construction",
     "key": "build_process",
     "label": "How a build runs",
     "display_order": 1,
     "eyebrow": "How it works",
     "title": "Six steps,",
     "accent": "no surprises.",
     "body": "Every build follows the same sequence, and you see the cost sheet at each one.",
     "items": [
        {
                "step": "01",
                "title": "Site visit & brief",
                "description": "We walk the plot with you, confirm the UPI and land use, and write down exactly what you want built.",
                "icon": "MapPinned"
        },
        {
                "step": "02",
                "title": "Fixed quotation",
                "description": "A priced bill of quantities with a 15% contingency stated openly. No moving numbers once signed.",
                "icon": "FileText"
        },
        {
                "step": "03",
                "title": "Contract & 30–40% deposit",
                "description": "A written contract with a milestone payment schedule. You never pay ahead of completed work.",
                "icon": "FileSignature"
        },
        {
                "step": "04",
                "title": "Build with weekly reporting",
                "description": "A site supervisor daily, a photo report weekly, and a running cost sheet you can open any time.",
                "icon": "HardHat"
        },
        {
                "step": "05",
                "title": "Snagging & handover",
                "description": "We walk the finished build with you, fix the snag list, and hand over keys with the warranty in writing.",
                "icon": "KeyRound"
        },
        {
                "step": "06",
                "title": "Tenant or list",
                "description": "The moment it is finished, our Realty division can tenant it or list it — the Wealth Cycle continues.",
                "icon": "RefreshCw"
        }
]},
    {"page": "construction",
     "key": "renovation_services",
     "label": "Renovation services",
     "display_order": 2,
     "eyebrow": "Renovation",
     "title": "Not every project",
     "accent": "starts from bare ground.",
     "body": "Shells, tired rentals and half-finished builds — brought to standard on a fixed price.",
     "items": [
        {
                "id": "ren-finishing",
                "title": "Finishing an unfinished build",
                "description": "The most common request we get. A shell that has sat for years, brought to a lettable standard on a fixed price.",
                "icon": "PaintRoller",
                "from": 8000000
        },
        {
                "id": "ren-kitchen",
                "title": "Kitchen & bathroom renovation",
                "description": "The two rooms that decide a rental price. Full strip-out, replumb, retile and refit.",
                "icon": "Bath",
                "from": 4500000
        },
        {
                "id": "ren-roof",
                "title": "Roofing & waterproofing",
                "description": "Re-roofing, gutter replacement and flat-roof waterproofing with a written guarantee.",
                "icon": "Home",
                "from": 3200000
        },
        {
                "id": "ren-extension",
                "title": "Extensions & extra units",
                "description": "Adding a second rental unit to an existing plot — the fastest route to a second income stream.",
                "icon": "Blocks",
                "from": 12000000
        },
        {
                "id": "ren-compound",
                "title": "Compound, fencing & paving",
                "description": "Boundary walls, gates, cabro paving and drainage. Often the difference between a viewing and an offer.",
                "icon": "Fence",
                "from": 2800000
        },
        {
                "id": "ren-remote",
                "title": "Remote build supervision",
                "description": "For diaspora clients building with their own contractor. We inspect, photograph, report and verify every payment request.",
                "icon": "Globe2",
                "from": 450000
        }
]},
    {"page": "about",
     "key": "hero",
     "label": "Page hero",
     "display_order": 1,
     "eyebrow": "About us",
     "title": "We are not a brokerage.",
     "accent": "We are a wealth-building engine.",
     "body": "Evaramu Group Ltd finds the right property, helps clients buy it, builds or renovates it, manages it, and when the time is right helps them sell and reinvest. A client who starts with one property can realistically grow to four or five within three years."},
    {"page": "about",
     "key": "group_structure",
     "label": "Group structure",
     "display_order": 2,
     "eyebrow": "Group structure",
     "title": "A holding parent with",
     "accent": "two active divisions.",
     "body": "Evaramu Group Ltd is registered as a private limited company in Rwanda under the Rwanda Development Board. Future divisions will be added as sub-entities under the group."},
    {"page": "about",
     "key": "phased_execution",
     "label": "Phased execution",
     "display_order": 3,
     "eyebrow": "Phased execution",
     "title": "Start small. Build strong.",
     "accent": "Each phase funds the next.",
     "body": "We never expand faster than our trust can support. Here is where we are and where we are going."},
    {"page": "about",
     "key": "team_intro",
     "label": "Team intro",
     "display_order": 4,
     "eyebrow": "The team",
     "title": "Placed on strength,",
     "accent": "not convenience.",
     "body": "Every person here is in their role because of what they are naturally good at. The wrong person in the wrong role destroys deals, reputation and culture — so we hire slow."},
    {"page": "about",
     "key": "how_we_operate",
     "label": "How we operate",
     "display_order": 5,
     "eyebrow": "How we operate",
     "title": "Four commitments we",
     "accent": "do not negotiate on."},
    {"page": "construction",
     "key": "hero",
     "label": "Page hero",
     "display_order": 1,
     "eyebrow": "Evaramu Construction",
     "title": "A fixed price, written down",
     "accent": "before the first block is laid.",
     "body": "The Rwandan market is full of unbranded contractors, verbal contracts and quotes that move once you are committed. We do the opposite: a priced bill of quantities, a contingency stated openly, and a cost sheet you can open at any time."},
    {"page": "construction",
     "key": "packages",
     "label": "Packages",
     "display_order": 2,
     "eyebrow": "Finishing packages",
     "title": "Three bands.",
     "accent": "No hidden fourth.",
     "body": "Pick the standard that matches what the property needs to do. Most Wealth Cycle builds land on Premium, because it is the specification that rents well and sells well."},
    {"page": "construction",
     "key": "estimator",
     "label": "Estimator",
     "display_order": 3,
     "eyebrow": "Indicative estimate",
     "title": "What would your build",
     "accent": "actually cost?",
     "body": "A first-pass figure using the package you selected above. The real quotation comes after a site visit and a measured bill of quantities — but this tells you whether you are in the right range."},
    {"page": "construction",
     "key": "process_intro",
     "label": "Process intro",
     "display_order": 4,
     "eyebrow": "How a project runs",
     "title": "Six stages, and you know",
     "accent": "where you are in all of them."},
    {"page": "construction",
     "key": "renovation_intro",
     "label": "Renovation intro",
     "display_order": 5,
     "eyebrow": "Renovation & smaller works",
     "title": "Not every project is",
     "accent": "a new build.",
     "body": "Most of what we do is finishing something someone else started, or lifting an existing property to a standard that lets it rent. Prices below are typical starting points, not quotations."},
    {"page": "consultation",
     "key": "hero",
     "label": "Page hero",
     "display_order": 1,
     "eyebrow": "Book a consultation",
     "title": "Thirty minutes, and an",
     "accent": "honest answer.",
     "body": "Tell us your budget and what you are trying to achieve. We will tell you plainly whether we can help, what it would realistically cost, and how long it would take. No pressure, no obligation."},
    {"page": "consultation",
     "key": "what_to_expect",
     "label": "What to expect",
     "display_order": 2,
     "eyebrow": "What to expect",
     "title": "No sales pitch.",
     "accent": "Just an assessment.",
     "body": "We would rather tell you honestly that now is not the right time than take you through a process that wastes your money and our reputation."},
    {"page": "contact",
     "key": "hero",
     "label": "Page hero",
     "display_order": 1,
     "eyebrow": "Contact us",
     "title": "Every enquiry answered",
     "accent": "within two hours.",
     "body": "Not a promise on a poster — a rule we measure. Whether you are buying your first plot, selling a family property or building from abroad, tell us what you need and someone who can actually help will get back to you today."},
    {"page": "contact",
     "key": "send_message",
     "label": "Send message",
     "display_order": 2,
     "eyebrow": "Send a message",
     "title": "Tell us what you",
     "accent": "are trying to do.",
     "body": "The more specific you are, the more useful our first reply will be. Budget and timeline help us most."},
    {"page": "insights",
     "key": "hero",
     "label": "Page hero",
     "display_order": 1,
     "eyebrow": "Insights",
     "title": "Almost no agent in Rwanda",
     "accent": "publishes anything useful.",
     "body": "We treat that as an opportunity. Monthly market reports, wealth education, construction costs and honest guides for buying from abroad — written by the people actually doing the deals."},
    {"page": "join",
     "key": "hero",
     "label": "Page hero",
     "display_order": 1,
     "eyebrow": "Join the agency",
     "title": "Bring your network to a company",
     "accent": "with systems behind it.",
     "body": "There are more than 200 informal brokers in Rwanda with genuine local knowledge and nothing behind them — no brand, no documentation, no marketing, no follow-up system. If that is you, this is the offer."},
    {"page": "join",
     "key": "roles",
     "label": "Roles",
     "display_order": 2,
     "eyebrow": "Four ways in",
     "title": "Pick the one that",
     "accent": "describes you.",
     "body": "We hire and partner on strength, not convenience. The wrong person in the wrong role destroys deals, reputation and culture — so we are specific about what each of these actually involves."},
    {"page": "join",
     "key": "calculator",
     "label": "Calculator",
     "display_order": 3,
     "eyebrow": "Commission calculator",
     "title": "What could a good year",
     "accent": "actually pay?",
     "body": "Move the sliders to your own reality. This models the agency commission of roughly 3% of transaction value, of which you take your agreed share."},
    {"page": "join",
     "key": "colleagues",
     "label": "Colleagues",
     "display_order": 4,
     "eyebrow": "Your colleagues",
     "title": "Small team.",
     "accent": "Everyone owns something.",
     "body": "You would not be lost in a hierarchy. Each of these people runs a function end to end and reports on it at the monthly board meeting."},
    {"page": "property-detail",
     "key": "related",
     "label": "Related listings heading",
     "display_order": 1,
     "eyebrow": "You may also like",
     "title": "Similar properties",
     "accent": "worth a look."},
    {"page": "sell",
     "key": "hero",
     "label": "Page hero",
     "display_order": 1,
     "eyebrow": "Sell with Evaramu",
     "title": "Your property deserves better than",
     "accent": "a blurry photo in a group chat.",
     "body": "Tell us about it below and we will come back within two working hours with a valuation appointment. No listing fee, no exclusivity trap, and commission agreed in writing before anything begins."},
    {"page": "sell",
     "key": "why_list",
     "label": "Why list",
     "display_order": 2,
     "eyebrow": "Why list with us",
     "title": "Professionalism is the",
     "accent": "entire differentiator.",
     "body": "There are more than 200 informal brokers in Rwanda. What almost none of them offer is documentation, marketing that works and a buyer who has actually been qualified."},
    {"page": "sell",
     "key": "list_form",
     "label": "List form",
     "display_order": 3,
     "eyebrow": "List your property",
     "title": "Tell us about it.",
     "accent": "We do the rest.",
     "body": "The form adapts to what you are listing — a forest plot asks about crop coverage, an apartment block asks about units and rents. You only ever see the questions that apply to you."},
    {"page": "sell",
     "key": "after_submit",
     "label": "After submit",
     "display_order": 4,
     "eyebrow": "After you submit",
     "title": "What actually happens",
     "accent": "next."},
    {"page": "services",
     "key": "hero",
     "label": "Page hero",
     "display_order": 1,
     "eyebrow": "What we do",
     "title": "Six services.",
     "accent": "One company behind all of them.",
     "body": "Most agencies broker. Most builders build. Nobody manages what they sold you. Evaramu Realty and Evaramu Construction sit inside the same company, which is why we can add value to a property instead of just transacting on it."},
    {"page": "services",
     "key": "value_chain",
     "label": "Value chain",
     "display_order": 2,
     "eyebrow": "The full value chain",
     "title": "Find it. Buy it. Build it.",
     "accent": "Let it. Sell it. Repeat.",
     "body": "Each of these works on its own. Together they are the Wealth Cycle — which is the only reason a client of ours can go from one property to four in three years."},
    {"page": "services",
     "key": "remote_reporting",
     "label": "Remote reporting",
     "display_order": 3,
     "eyebrow": "Remote reporting",
     "title": "What lands in your inbox",
     "accent": "every month.",
     "body": "The diaspora segment is the most underserved in Rwanda precisely because distance makes accountability optional. We removed the option."},
    {"page": "team",
     "key": "hero",
     "label": "Page hero",
     "display_order": 1,
     "title": "Small team.",
     "accent": "Everyone owns something.",
     "body": "We hire slow and place people on strength, not convenience. Nobody here is buried in a hierarchy — each of these people runs a function end to end and reports on it at the monthly board meeting."},
    {"page": "team",
     "key": "how_we_hire",
     "label": "How we hire",
     "display_order": 2,
     "eyebrow": "How we hire",
     "title": "Hire slow.",
     "accent": "Fire fast.",
     "body": "Not because we enjoy it, but because in a business built entirely on trust, one person in the wrong seat costs everybody."},
    {"page": "wealth-cycle",
     "key": "hero",
     "label": "Page hero",
     "display_order": 1,
     "eyebrow": "Our signature model",
     "title": "Most agencies close a sale and disappear.",
     "accent": "We stay.",
     "body": "The Wealth Cycle is the reason clients come back to us for their second, third and fourth property. We find it, help you buy it, build on it, tenant it, tell you when to sell — then put the proceeds to work again."},
    {"page": "wealth-cycle",
     "key": "model",
     "label": "Model",
     "display_order": 2,
     "eyebrow": "The model",
     "title": "Six steps, and we are",
     "accent": "beside you for all of them.",
     "body": "Each step compounds into the next. Skip one and the cycle still works — it just works more slowly."},
    {"page": "wealth-cycle",
     "key": "worked_example_intro",
     "label": "Worked example intro",
     "display_order": 3,
     "eyebrow": "A real client journey",
     "title": "RWF 8 million in savings.",
     "accent": "Three properties by Year 3.",
     "body": "This is the worked example from our business plan, published in full. Every figure is one we have actually seen, not a projection we invented for a brochure."},
    {"page": "wealth-cycle",
     "key": "calculator",
     "label": "Calculator",
     "display_order": 4,
     "eyebrow": "Run your own numbers",
     "title": "What could your capital",
     "accent": "become?",
     "body": "Move the sliders. This is an indicative model built on the same assumptions we use in a planning session — a build uplift of roughly 35%, corridor appreciation of 16% a year, and rent at around 9% of value."},
    {"page": "home",
     "key": "construction",
     "label": "Construction teaser",
     "display_order": 1,
     "eyebrow": "Evaramu Construction",
     "title": "Fixed prices, written down",
     "accent": "before we start.",
     "body": "Construction cost overrun is the highest risk in this business. We manage it the only honest way: a fixed-price contract, a 15% contingency stated openly at signature, and a cost sheet you can open at any time."},
    {"page": "home",
     "key": "insights",
     "label": "Insights heading",
     "display_order": 3,
     "eyebrow": "Insights",
     "title": "We publish what we",
     "accent": "actually see.",
     "body": "Monthly market reports, wealth education and construction cost breakdowns. Almost no agent in Rwanda publishes anything useful — we treat that as an opportunity."},
    {"page": "home",
     "key": "testimonials",
     "label": "Testimonials heading",
     "display_order": 6,
     "eyebrow": "Client stories",
     "title": "The proof is not our brochure.",
     "accent": "It is their portfolio."},
    {"page": "about",
     "key": "divisions",
     "label": "Group divisions",
     "display_order": 30,
     "items": [
        {
                "name": "Evaramu Realty",
                "status": "Division 1 · Active",
                "icon": "Home",
                "focus": "Property brokerage, sales, rentals, diaspora services and the Wealth Cycle.",
                "active": True
        },
        {
                "name": "Evaramu Construction",
                "status": "Division 2 · Active",
                "icon": "HardHat",
                "focus": "Renovation, finishing, supervised builds and site management.",
                "active": True
        },
        {
                "name": "Evaramu Technologies",
                "status": "Division 3 · Phase 3",
                "icon": "LayoutGrid",
                "focus": "PropTech platform, listings, client dashboards and AI tooling.",
                "active": False
        },
        {
                "name": "Evaramu Capital",
                "status": "Division 4 · Phase 4",
                "icon": "Wallet",
                "focus": "Property investment fund, syndications and portfolio management.",
                "active": False
        }
]},
    {"page": "about",
     "key": "governance",
     "label": "Governance roles",
     "display_order": 31,
     "items": [
        {
                "role": "Chairman / Co-Founder",
                "responsibility": "Sets vision, owns strategy, final authority on major decisions."
        },
        {
                "role": "Managing Director",
                "responsibility": "Daily operations, team management, deal execution, P&L ownership."
        },
        {
                "role": "Head of Real Estate",
                "responsibility": "Leads Evaramu Realty — listings, deals, diaspora clients, the property cycle."
        },
        {
                "role": "Head of Construction",
                "responsibility": "Leads Evaramu Construction — projects, contractors, site quality."
        },
        {
                "role": "Finance Director",
                "responsibility": "Cash flow, invoicing, budgets, commissions and financial reporting."
        },
        {
                "role": "Non-Executive Advisor",
                "responsibility": "External perspective, introductions and governance quality."
        }
]},
    {"page": "about",
     "key": "timeline",
     "label": "Execution timeline",
     "display_order": 32,
     "items": [
        {
                "period": "Months 1–3",
                "title": "Register, build, find the team",
                "outcome": "Company registered at RDB. Brand live. Fifty properties catalogued.",
                "done": True
        },
        {
                "period": "Months 4–9",
                "title": "First deals and first builds",
                "outcome": "10+ transactions closed. 3–5 renovation projects delivered. First Wealth Cycle clients.",
                "done": True
        },
        {
                "period": "Months 10–24",
                "title": "Brand and technology platform",
                "outcome": "Listing platform live. Client dashboards for diaspora. 15+ rental units managed.",
                "done": False
        },
        {
                "period": "Year 3",
                "title": "Mid-market leader in Kigali",
                "outcome": "First multi-unit development under construction. Expansion into the Eastern Province.",
                "done": False
        }
]},
    {"page": "home",
     "key": "diaspora_promises",
     "label": "Diaspora promises",
     "display_order": 33,
     "items": [
        {
                "icon": "Video",
                "title": "You see the parcel before you pay",
                "description": "A video walking the boundary with the UPI visible on screen — not a photo someone sent you."
        },
        {
                "icon": "FileCheck2",
                "title": "Title verified before any deposit",
                "description": "An NLA title search dated within 30 days, with the registered owner matched to the seller."
        },
        {
                "icon": "Wallet",
                "title": "Company account, same-day receipt",
                "description": "Funds go to a registered company account. Never to an individual mobile money number."
        },
        {
                "icon": "Globe2",
                "title": "Monthly reporting, wherever you are",
                "description": "Build diary, photos, rent collected and maintenance spend — the first of every month."
        }
]},
    {"page": "home",
     "key": "hero_marquee",
     "label": "Hero marquee",
     "display_order": 34,
     "items": [
        "Every title verified at the National Land Authority",
        "We broker and we build",
        "Response within two hours",
        "Diaspora reporting every month",
        "Commission agreed in writing"
]},
    {"page": "home",
     "key": "hero_stats",
     "label": "Hero figures",
     "display_order": 35,
     "items": [
        {
                "value": "750+",
                "label": "Properties catalogued"
        },
        {
                "value": "20–50%",
                "label": "Value added by build"
        },
        {
                "value": "100%",
                "label": "Titles verified"
        }
]},
    {"page": "home",
     "key": "join_benefits",
     "label": "Join teaser benefits",
     "display_order": 36,
     "items": [
        {
                "icon": "Banknote",
                "title": "5–10% commission per deal",
                "description": "Paid on completion, agreed in writing before you start working a lead."
        },
        {
                "icon": "BadgeCheck",
                "title": "A brand that opens doors",
                "description": "Walk in as Evaramu, not as an unknown broker. Documented, registered, and trusted."
        },
        {
                "icon": "GraduationCap",
                "title": "Training and a real CRM",
                "description": "Title verification, negotiation and follow-up — plus a system so no lead goes cold."
        },
        {
                "icon": "Users",
                "title": "Leads from our marketing",
                "description": "Our content engine generates enquiries daily. Qualified leads get routed to agents."
        }
]},
    {"page": "home",
     "key": "why_gaps",
     "label": "Why Evaramu — comparison rows",
     "display_order": 37,
     "items": [
        {
                "gap": "After the sale",
                "them": "Sell once, then disappear",
                "us": "Stay through buy → build → earn → sell → reinvest"
        },
        {
                "gap": "Diaspora clients",
                "them": "Phone calls and WhatsApp, no documentation",
                "us": "Video updates, digital contracts, verified titles, monthly reports"
        },
        {
                "gap": "Marketing a property",
                "them": "Blurry phone photos in WhatsApp groups",
                "us": "Drone video, professional photography, mapped online listings"
        },
        {
                "gap": "Realty and construction",
                "them": "Agents and builders are separate businesses",
                "us": "One company that brokers and builds — the full value chain"
        },
        {
                "gap": "Documentation",
                "them": "Verbal deals, no receipts, title disputes",
                "us": "Digital contracts, cost tracking, NLA verification workflow"
        },
        {
                "gap": "Following up a lead",
                "them": "Leads lost, no follow-up system",
                "us": "Every contact tracked; response within two hours"
        },
        {
                "gap": "Educating clients",
                "them": "Almost no agent publishes anything useful",
                "us": "Weekly land tours, market data, renovation reveals, testimonials"
        }
]},
    {"page": "join",
     "key": "culture_rules",
     "label": "Culture rules",
     "display_order": 38,
     "items": [
        {
                "title": "Every deal is documented",
                "body": "No verbal-only agreements, inside or outside the company. If it is not written down, it did not happen."
        },
        {
                "title": "Speed is a differentiator",
                "body": "Every lead gets a response within two hours. Competitors take days — that gap is our advantage and we protect it."
        },
        {
                "title": "No one hides problems",
                "body": "Bad news is shared immediately so it can be fixed. Hiding a problem is the only genuinely unforgivable thing here."
        },
        {
                "title": "Client trust is the product",
                "body": "Every team member protects it or leaves. One bad deal damages a brand it took years to build."
        },
        {
                "title": "Results over seniority",
                "body": "The best idea wins regardless of who has it. Nobody is overruled because someone else has been here longer."
        }
]},
    {"page": "not-found",
     "key": "suggestions",
     "label": "404 suggestions",
     "display_order": 39,
     "items": [
        {
                "to": "/properties",
                "icon": "Search",
                "title": "Browse properties",
                "description": "Verified land, houses and commercial space across Rwanda"
        },
        {
                "to": "/wealth-cycle",
                "icon": "RefreshCw",
                "title": "The Wealth Cycle",
                "description": "How one property becomes four or five within three years"
        },
        {
                "to": "/construction",
                "icon": "HardHat",
                "title": "Construction packages",
                "description": "Standard, Premium and Luxury finishes with fixed pricing"
        },
        {
                "to": "/consultation",
                "icon": "Compass",
                "title": "Book a consultation",
                "description": "A free 30-minute call to work out what is achievable"
        }
]},
    {"page": "sell",
     "key": "steps",
     "label": "Listing wizard steps",
     "display_order": 40,
     "items": [
        {
                "id": "type",
                "title": "Property type",
                "description": "What are you listing?"
        },
        {
                "id": "parcel",
                "title": "Parcel details",
                "description": "UPI and location"
        },
        {
                "id": "spec",
                "title": "Specification",
                "description": "The specifics of this property"
        },
        {
                "id": "price",
                "title": "Price & media",
                "description": "What you want for it"
        },
        {
                "id": "contact",
                "title": "Your details",
                "description": "How we reach you"
        }
]},
    {"page": "sell",
     "key": "why_list_items",
     "label": "Why list with us — items",
     "display_order": 41,
     "items": [
        {
                "icon": "Camera",
                "title": "Marketed properly",
                "body": "Drone video, professional photography and a mapped online listing — instead of phone snapshots in a WhatsApp group."
        },
        {
                "icon": "ShieldCheck",
                "title": "Buyers qualified first",
                "body": "We check that a buyer can actually fund the purchase before they set foot on your property. Fewer viewings, better ones."
        },
        {
                "icon": "FileCheck2",
                "title": "Documented throughout",
                "body": "Digital contracts, receipts for every payment and a written record of every offer. No verbal deals, no disputes."
        },
        {
                "icon": "Handshake",
                "title": "Commission in writing",
                "body": "Agreed before any work begins and only earned when the sale completes. You are never billed for marketing that did not sell."
        }
]},
    {"page": "services",
     "key": "management_includes",
     "label": "Management inclusions",
     "display_order": 42,
     "items": [
        {
                "title": "Tenant sourcing and screening",
                "body": "We market the unit, vet applicants and check they can actually afford it. Corporate and NGO tenants are targeted deliberately — they sign longer and pay on time."
        },
        {
                "title": "Rent collection and arrears",
                "body": "Collected on schedule and remitted to you. If a tenant falls behind, we chase it — that is what the fee is for."
        },
        {
                "title": "Maintenance coordination",
                "body": "Our construction division handles repairs at cost, so a leaking roof does not turn into a three-week negotiation with a stranger."
        },
        {
                "title": "Inspections and condition reports",
                "body": "Photographed inspections between tenancies, so deposits are argued from evidence rather than memory."
        },
        {
                "title": "Monthly statement",
                "body": "Rent collected, expenses incurred, net remitted — in your inbox on the first of every month, whether or not anything happened."
        },
        {
                "title": "Re-letting and repricing",
                "body": "We watch the market and tell you when the rent is below what the unit could achieve at renewal."
        }
]},

    # ---- per-page search engine listing ----
    {"page": "home", "key": "seo", "label": "Search engine listing",
     "display_order": 99,
     "title": "Evaramu Group Ltd — Real Estate, Construction & Property Wealth in Kigali",
     "body": "Buy verified land and property in Rwanda, build with our construction division, earn rental income and grow from one property to a portfolio. Every title verified at NLA. Book a free consultation.",
     "items": [
        {
                "text": "Evaramu Group Ltd"
        },
        {
                "text": "wealth cycle Rwanda"
        },
        {
                "text": "verified land Kigali"
        },
        {
                "text": "Kigali property investment"
        },
        {
                "text": "build wealth through property Rwanda"
        }
]},
    {"page": "properties", "key": "seo", "label": "Search engine listing",
     "display_order": 99,
     "title": "Properties for Sale & Rent in Rwanda",
     "body": "Browse verified land, houses, apartments and commercial property across Kigali and Rwanda. Every listing is checked against its UPI at the National Land Authority before it goes live.",
     "items": [
        {
                "text": "land for sale Kigali"
        },
        {
                "text": "houses for sale Rwanda"
        },
        {
                "text": "apartments for rent Kigali"
        },
        {
                "text": "commercial property Rwanda"
        },
        {
                "text": "verified UPI land Rwanda"
        }
]},
    {"page": "wealth-cycle", "key": "seo", "label": "Search engine listing",
     "display_order": 99,
     "title": "The Evaramu Wealth Cycle — From One Property to a Portfolio",
     "body": "Buy, build, earn, sell, reinvest, repeat. The full six-step model Evaramu uses to grow a client from one property to four or five within three years — with the complete arithmetic published.",
     "items": [
        {
                "text": "property wealth Rwanda"
        },
        {
                "text": "build a property portfolio Kigali"
        },
        {
                "text": "real estate investment Rwanda"
        },
        {
                "text": "rental income Kigali"
        },
        {
                "text": "Evaramu Wealth Cycle"
        }
]},
    {"page": "construction", "key": "seo", "label": "Search engine listing",
     "display_order": 99,
     "title": "Construction & Renovation in Kigali — Fixed-Price Building Packages",
     "body": "Evaramu Construction builds and renovates in Kigali on fixed-price contracts with a 15% contingency stated up front. Standard, Premium and Luxury finishing packages, weekly cost reporting and remote supervision for diaspora clients.",
     "items": [
        {
                "text": "construction company Kigali"
        },
        {
                "text": "house finishing Rwanda"
        },
        {
                "text": "renovation Kigali"
        },
        {
                "text": "building cost per sqm Rwanda"
        },
        {
                "text": "remote build supervision Rwanda"
        }
]},
    {"page": "services", "key": "seo", "label": "Search engine listing",
     "display_order": 99,
     "title": "Our Services — Real Estate, Construction & Property Management in Rwanda",
     "body": "Buy verified property, sell with proper marketing, build with fixed-price contracts, let us manage your rentals, or invest from abroad with full remote reporting. One company across the whole value chain.",
     "items": [
        {
                "text": "property services Rwanda"
        },
        {
                "text": "property management Kigali"
        },
        {
                "text": "real estate agency Rwanda"
        },
        {
                "text": "diaspora property services Rwanda"
        },
        {
                "text": "rental management Kigali"
        }
]},
    {"page": "sell", "key": "seo", "label": "Search engine listing",
     "display_order": 99,
     "title": "Sell or List Your Property in Rwanda",
     "body": "List your land, house or commercial property with Evaramu. Free valuation, drone video and professional photography included, buyers qualified before viewing, and commission agreed in writing before we start.",
     "items": [
        {
                "text": "sell my land Rwanda"
        },
        {
                "text": "sell house Kigali"
        },
        {
                "text": "list property Rwanda"
        },
        {
                "text": "property valuation Kigali"
        },
        {
                "text": "estate agent Rwanda commission"
        }
]},
    {"page": "join", "key": "seo", "label": "Search engine listing",
     "display_order": 99,
     "title": "Join Evaramu — Careers, Agents, Brokers & Contractors in Rwanda",
     "body": "Join Evaramu Group Ltd as a commission sales agent, independent broker partner, vetted sub-contractor or full-time team member. 5–10% commission, real marketing behind you, and payment on a documented schedule.",
     "items": [
        {
                "text": "real estate agent jobs Rwanda"
        },
        {
                "text": "property broker Kigali"
        },
        {
                "text": "construction subcontractor Rwanda"
        },
        {
                "text": "real estate commission Rwanda"
        },
        {
                "text": "careers Evaramu"
        }
]},
    {"page": "consultation", "key": "seo", "label": "Search engine listing",
     "display_order": 99,
     "title": "Book a Consultation — Evaramu Group Ltd",
     "body": "Book a free consultation with Evaramu in Kigali: a discovery call, property viewing, Wealth Cycle planning session, construction consultation or diaspora investment briefing. Pick a date and time that works for you.",
     "items": [
        {
                "text": "book property consultation Kigali"
        },
        {
                "text": "free property valuation Rwanda"
        },
        {
                "text": "property viewing Kigali"
        },
        {
                "text": "diaspora investment briefing Rwanda"
        }
]},
    {"page": "about", "key": "seo", "label": "Search engine listing",
     "display_order": 99,
     "title": "About Evaramu Group Ltd — Kigali Real Estate & Construction",
     "body": "Evaramu Group Ltd is a registered Rwandan real estate, construction and property wealth company based in Kigali. Two active divisions, an internal board, and a culture built on documentation and speed.",
     "items": [
        {
                "text": "about Evaramu Group"
        },
        {
                "text": "real estate company Kigali"
        },
        {
                "text": "RDB registered property company Rwanda"
        },
        {
                "text": "Evaramu Realty"
        },
        {
                "text": "Evaramu Construction"
        }
]},
    {"page": "team", "key": "seo", "label": "Search engine listing",
     "display_order": 99,
     "title": "Our Team — The People Behind Evaramu",
     "body": "Meet the Evaramu Group Ltd team in Kigali: property consultants, diaspora relations, construction supervisors, title officers and finance. Every person owns a function end to end.",
     "items": [
        {
                "text": "Evaramu team"
        },
        {
                "text": "real estate agents Kigali"
        },
        {
                "text": "property consultants Rwanda"
        },
        {
                "text": "construction team Kigali"
        }
]},
    {"page": "insights", "key": "seo", "label": "Search engine listing",
     "display_order": 99,
     "title": "Insights & Market Reports — Rwanda Property",
     "body": "Kigali land price reports, rental yield analysis, construction cost breakdowns and practical guides for diaspora buyers. Published monthly by Evaramu Group Ltd.",
     "items": [
        {
                "text": "Kigali property market report"
        },
        {
                "text": "Rwanda land prices"
        },
        {
                "text": "rental yields Kigali"
        },
        {
                "text": "construction cost Rwanda"
        },
        {
                "text": "Rwanda real estate insights"
        }
]},
    {"page": "contact", "key": "seo", "label": "Search engine listing",
     "display_order": 99,
     "title": "Contact Evaramu Group Ltd — Kigali, Rwanda",
     "body": "Talk to Evaramu Group Ltd about buying, selling, building or managing property in Rwanda. WhatsApp, phone, email or visit our Kimihurura office. Every enquiry answered within two working hours.",
     "items": [
        {
                "text": "contact real estate agency Kigali"
        },
        {
                "text": "Evaramu contact"
        },
        {
                "text": "property agent Rwanda phone"
        },
        {
                "text": "Kimihurura estate agent"
        }
]},
]


TESTIMONIALS: list[dict] = [
    {"author_name": "Jean-Paul Habyarimana", "author_role": "Teacher",
     "location": "Kicukiro, Kigali", "rating": 5, "display_order": 1,
     "milestone": "Completed one full cycle · 3 properties",
     "photo_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
     "quote": ("I bought a plot in Kanombe with everything I had saved. Evaramu did not stop "
               "there — they built two rental units on it, found the tenants, and told me "
               "exactly when to sell. I own three properties now.")},
    {"author_name": "Yvette Mukamana", "author_role": "Nurse · Diaspora client",
     "location": "Brussels, Belgium", "rating": 5, "display_order": 2,
     "milestone": "Remote purchase · Kigali plot",
     "photo_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
     "quote": ("I live in Brussels and had been burned once before. Claudine sent me a video "
               "walking the boundary with the UPI on screen, then the NLA verification, then "
               "the contract. I signed from my kitchen table.")},
    {"author_name": "Emmanuel & Grace Niyonzima", "author_role": "Homeowners",
     "location": "Kimironko, Kigali", "rating": 5, "display_order": 3,
     "milestone": "Premium Finish package · 240 sqm",
     "photo_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
     "quote": ("Our house shell had been sitting unfinished for four years. Evaramu gave a "
               "fixed price with the contingency written down and stuck to it. We moved in "
               "eleven days ahead of schedule.")},
    {"author_name": "Diane Uwimana", "author_role": "Business owner",
     "location": "Nyarutarama, Kigali", "rating": 5, "display_order": 4,
     "milestone": "Sold at peak · reinvested into 2 plots",
     "photo_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
     "quote": ("What I value is the honesty. I wanted to sell at the end of last year and they "
               "told me to wait eight months. I waited. I got eleven million more than the "
               "offer I nearly took.")},
    {"author_name": "Olivier Rwema", "author_role": "Engineer · Diaspora client",
     "location": "Toronto, Canada", "rating": 5, "display_order": 5,
     "milestone": "Property management · 2 units",
     "photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
     "quote": ("I send money home every month and never really knew where it went. Now I get a "
               "report on the first of each month with photos, the rent collected and what was "
               "spent on maintenance.")},
]


FAQS: list[dict] = [
    {"page": "home", "display_order": 1,
     "question": "How do you verify that a property title is clean?",
     "answer": ("Every parcel we list is checked at the National Land Authority against its UPI "
                "before it appears on the platform. We confirm the registered owner, the "
                "tenure type, the parcel size and any encumbrances. If the title is not clean, "
                "the listing does not go live.")},
    {"page": "home", "display_order": 2,
     "question": "What is the Wealth Cycle, in plain terms?",
     "answer": ("It is our commitment to stay with you after the sale. We help you buy the "
                "right first property, build or renovate it to raise its value, place tenants "
                "so it earns, advise you on when to sell, and then reinvest the proceeds into "
                "two or three more.")},
    {"page": "home", "display_order": 3,
     "question": "Can I buy from abroad without travelling to Rwanda?",
     "answer": ("Yes. You receive video walkthroughs with the UPI visible, independent NLA "
                "title verification before any deposit, digital contracts you can sign from "
                "anywhere, and monthly photo reporting throughout any build.")},
    {"page": "home", "display_order": 4,
     "question": "How much does your construction division charge?",
     "answer": ("Three fixed-price bands: Standard Finish from RWF 320,000/sqm, Premium Finish "
                "from RWF 520,000/sqm and Luxury Finish from RWF 850,000/sqm. Every contract "
                "states a 15% contingency openly at signature.")},
    {"page": "home", "display_order": 5,
     "question": "What commission do you charge to sell my property?",
     "answer": ("Commission is agreed in writing before any work begins, and it is only earned "
                "on completion. The valuation visit, pricing strategy, professional photography "
                "and drone video are all included.")},
    {"page": "home", "display_order": 6,
     "question": "Do you manage properties after the purchase?",
     "answer": ("Yes. Our management fee is 10% of collected rent, so we only earn when your "
                "property does. That covers tenant sourcing and screening, rent collection, "
                "maintenance coordination and a monthly statement.")},

    # ---- page-specific sets, editable in the admin like any other FAQ ----
    {"page": "sell", "display_order": 1,
     "question": "What does it cost to list with you?",
     "answer": (
                "Nothing up front. The valuation visit, the pricing strategy, the "
                "professional photography and the drone video are all included. Commission "
                "is agreed in writing before we start and is only earned on completion.")},
    {"page": "sell", "display_order": 2,
     "question": "How long does it take to sell?",
     "answer": (
                "It depends entirely on the price and the property, and anyone who gives "
                "you a number without seeing it is guessing. What we can promise is that we "
                "will qualify every buyer before they visit, so you are not showing your "
                "property to people who cannot afford it.")},
    {"page": "sell", "display_order": 3,
     "question": "Do I need my title in hand before listing?",
     "answer": (
                "You need to be the registered owner or hold a written mandate from them. "
                "We will run the NLA search ourselves as part of onboarding — if there is a "
                "problem with the title, far better that we find it now than three weeks "
                "into a sale.")},
    {"page": "sell", "display_order": 4,
     "question": "Can I list a property I have not finished building?",
     "answer": (
                "Yes, and it is worth talking to our construction division first. Finishing "
                "a shell to a lettable standard usually adds considerably more value than "
                "it costs, which changes what the property is worth on the open market.")},
    {"page": "sell", "display_order": 5,
     "question": "What if I change my mind?",
     "answer": (
                "You can withdraw at any time before you accept an offer. We do not tie "
                "sellers into exclusivity periods that trap them — if we are not "
                "performing, you should be free to leave.")},
    {"page": "construction", "display_order": 1,
     "question": "Is the price you quote the price I actually pay?",
     "answer": (
                "Yes. We work on fixed-price contracts with a 15% contingency stated openly "
                "at signature — not discovered at month four. If a genuine variation is "
                "needed, for example you change the specification, we price it in writing "
                "and you approve it before any work starts.")},
    {"page": "construction", "display_order": 2,
     "question": "How do payments work?",
     "answer": (
                "A 30–40% deposit on signature, then milestone payments against completed "
                "work. You never pay ahead of what has been built. Every payment goes to "
                "our registered company account and is receipted the same day.")},
    {"page": "construction", "display_order": 3,
     "question": "Can you finish a house someone else started?",
     "answer": (
                "That is one of our most common projects. We survey what has been built, "
                "test what is structurally sound, and quote to bring it to a lettable or "
                "liveable standard. We will tell you honestly if any of the existing work "
                "needs to come down.")},
    {"page": "construction", "display_order": 4,
     "question": "I live abroad. How do I know the work is really happening?",
     "answer": (
                "A weekly photo report and running cost sheet, plus a monthly video "
                "walkthrough. We also offer remote supervision as a standalone service if "
                "you are building with your own contractor — we inspect, photograph and "
                "verify every payment request before you release funds.")},
    {"page": "construction", "display_order": 5,
     "question": "Who are the workers on my site?",
     "answer": (
                "A vetted sub-contractor network: masons, electricians, plumbers and tilers "
                "we have worked with repeatedly and hold accountable. No casual labour, and "
                "no contractor new to us on a high-value job. A site supervisor is present "
                "daily.")},
    {"page": "construction", "display_order": 6,
     "question": "What happens if something goes wrong after handover?",
     "answer": (
                "Every package carries a written workmanship warranty — 12 months on "
                "Standard, 24 on Premium, 36 on Luxury. We come back and fix it. That "
                "warranty is in the contract, not a verbal promise.")},
    {"page": "consultation", "display_order": 1,
     "question": "Is the first consultation really free?",
     "answer": (
                "The discovery call, property viewings, Wealth Cycle planning sessions, "
                "diaspora briefings and seller valuations are all free. The only paid slot "
                "is a construction consultation at RWF 25,000, and that is credited against "
                "your build if you go ahead.")},
    {"page": "consultation", "display_order": 2,
     "question": "What happens after I book?",
     "answer": (
                "You get a confirmation on WhatsApp and email within minutes, then a "
                "reminder the day before. If it is a site visit, your consultant confirms "
                "the meeting point. If it is a video call, the link comes with the "
                "confirmation.")},
    {"page": "consultation", "display_order": 3,
     "question": "I am in a different time zone — can you accommodate that?",
     "answer": (
                "Yes. Diaspora briefings are deliberately scheduled early morning and "
                "evening Kigali time so they land in working hours across Europe and North "
                "America. All times shown here are Central Africa Time (CAT, UTC+2).")},
    {"page": "consultation", "display_order": 4,
     "question": "Can I reschedule?",
     "answer": (
                "Any time, at no cost. Reply to the confirmation message or call us. We "
                "would much rather move an appointment than have you sit through one you "
                "are not ready for.")},
    {"page": "consultation", "display_order": 5,
     "question": "Do I need to bring anything?",
     "answer": (
                "For a seller valuation, your title or UPI if you have it. For a "
                "construction consultation, any drawings or photos of the site. For "
                "everything else, just come with your questions and a rough idea of your "
                "budget.")},
    {"page": "join", "display_order": 1,
     "question": "Do I need a licence or formal qualification?",
     "answer": (
                "For a commission agent role, no — we care about your network, your follow- "
                "up and your honesty. For construction roles we want to see completed work. "
                "For staff roles we want evidence you have actually done the job before.")},
    {"page": "join", "display_order": 2,
     "question": "Is this employment or commission-only?",
     "answer": (
                "Sales agents and broker partners are commission-based, which means "
                "uncapped earning but no salary. Sub-contractors are paid per project. "
                "Full-time roles are salaried with a performance component. We tell you "
                "which is which before you apply.")},
    {"page": "join", "display_order": 3,
     "question": "When do I actually get paid?",
     "answer": (
                "Commission on completion of the transaction, not on introduction. Sub- "
                "contractors are paid against completed milestones. Everyone is paid to a "
                "documented schedule — chasing invoices is not part of working here.")},
    {"page": "join", "display_order": 4,
     "question": "I broker informally already. Why would I join you?",
     "answer": (
                "Because a brand opens doors that a phone number does not. You get "
                "professional marketing on your listings, title verification that protects "
                "you from a bad deal, documentation that means you actually get paid, and "
                "leads from a marketing engine you do not have to fund.")},
    {"page": "join", "display_order": 5,
     "question": "What would disqualify me?",
     "answer": (
                "Undisclosed double-brokering, taking deposits into a personal account, or "
                "misrepresenting a title. Those are not mistakes we coach — they are the "
                "exact behaviours that make Rwandans distrust this industry.")},
    {"page": "contact", "display_order": 1,
     "question": "How quickly will you actually reply?",
     "answer": (
                "Within two working hours. That is not marketing language — it is a culture "
                "rule inside the company and we measure it. Competitors take days, and that "
                "gap is one of our few genuine advantages.")},
    {"page": "contact", "display_order": 2,
     "question": "Can I just walk into the office?",
     "answer": (
                "Yes, during office hours. But you will get more out of it if you book, "
                "because then the right consultant is there and has already looked at "
                "whatever you want to discuss.")},
    {"page": "contact", "display_order": 3,
     "question": "I am abroad — what is the best way to reach you?",
     "answer": (
                "WhatsApp for anything quick, email for anything that needs a paper trail. "
                "For a proper conversation, book a diaspora briefing — those slots are "
                "scheduled early morning and evening Kigali time to suit European and North "
                "American hours.")},
    {"page": "contact", "display_order": 4,
     "question": "Do you charge for an initial conversation?",
     "answer": (
                "No. Discovery calls, viewings, Wealth Cycle planning sessions, diaspora "
                "briefings and seller valuations are all free. The only paid slot is a "
                "construction consultation, and that is credited against your build.")},
    {"page": "services", "display_order": 1,
     "question": "Can I use just one service, or do I have to take the whole cycle?",
     "answer": (
                "Any service works standalone. Plenty of clients only ever buy through us, "
                "or only ever build. The Wealth Cycle is what we recommend if you want a "
                "portfolio, but nothing obliges you to it.")},
    {"page": "services", "display_order": 2,
     "question": "What does property management cost?",
     "answer": (
                "10% of collected rent. Not 10% of contracted rent — of what actually "
                "arrives. If the unit sits empty or a tenant defaults, we do not earn "
                "either, which keeps us motivated to fix it.")},
    {"page": "services", "display_order": 3,
     "question": "Do you handle the legal side of a transfer?",
     "answer": (
                "We prepare and manage the documentation, coordinate with the Rwanda Land "
                "Authority and work with retained legal support on contracts. For anything "
                "contentious we will tell you plainly that you need your own lawyer.")},
    {"page": "services", "display_order": 4,
     "question": "What areas do you cover?",
     "answer": (
                "Kigali across all three districts is our core market. We also work the "
                "Bugesera airport corridor, Rwamagana, Musanze and Huye. Outside those, ask "
                "— we will tell you honestly whether we can serve you properly there.")},
    {"page": "services", "display_order": 5,
     "question": "How do you charge for buying services?",
     "answer": (
                "On a purchase the commission usually sits with the seller, so a buyer "
                "typically pays us nothing. Where we are acting as a dedicated buying agent "
                "to source something off-market, that is agreed in writing up front.")},
    {"page": "wealth-cycle", "display_order": 1,
     "question": "Do I have to commit to all six steps?",
     "answer": (
                "No. Plenty of clients only ever buy, or only ever build. The cycle is what "
                "we recommend if your goal is a portfolio rather than a single asset — but "
                "every step is a separate decision that you make, with our advice, when you "
                "get to it.")},
    {"page": "wealth-cycle", "display_order": 2,
     "question": "What if the market turns and my property loses value?",
     "answer": (
                "Then we advise you to hold and keep earning rent rather than sell into a "
                "weak market. That is precisely why step three exists: a tenanted property "
                "generates income while you wait, so you are never forced to sell at a bad "
                "moment.")},
    {"page": "wealth-cycle", "display_order": 3,
     "question": "How much capital do I need to start?",
     "answer": (
                "The worked example on this page starts at RWF 8 million, which buys a "
                "serviceable plot in a growth corridor. Below roughly RWF 5 million the "
                "numbers stop working, because the entry costs eat the margin. We will tell "
                "you honestly if you are not there yet.")},
    {"page": "wealth-cycle", "display_order": 4,
     "question": "Who decides when to sell?",
     "answer": (
                "You do — always. We bring the market data, the comparable sales and a "
                "recommendation with our reasoning written down. We have advised clients to "
                "wait eight months against their instinct, and it earned them millions "
                "more. But it remains your asset and your call.")},
    {"page": "wealth-cycle", "display_order": 5,
     "question": "What does Evaramu earn from the cycle?",
     "answer": (
                "A sales commission when we broker a purchase or sale, a build margin when "
                "our construction division does the work, and 10% of collected rent while "
                "we manage the property. All three only pay us when they pay you — which is "
                "exactly the alignment we want.")},
]


INSIGHTS: list[dict] = [
    {"slug": "kigali-land-price-report-2026",
     "title": "Kigali land prices: which corridors actually moved in 2026",
     "category": "Market Report", "read_time": 8, "is_featured": True, "is_published": True,
     "author_name": "Aline Uwase", "author_role": "Head of Real Estate",
     "published_at": "2026-07-02",
     "cover_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80",
     "tags": ["Land prices", "Kigali", "Market data"],
     "excerpt": ("Not every neighbourhood appreciates equally. We pulled our own transaction "
                 "data across seven sectors to show where land genuinely gained value."),
     "body": [
         {"type": "p", "text": ("Rwanda’s residential market is worth roughly USD 84.85 billion "
                                "of a total USD 95.70 billion property market. Those are "
                                "national numbers. They tell you almost nothing about whether "
                                "the specific plot you are considering will appreciate.")},
         {"type": "h2", "text": "The corridors that moved"},
         {"type": "list", "items": [
             "Bugesera / Nyamata — 22% year on year, driven by the 2027–28 airport timeline",
             "Kabuga trading centre — 16%, road frontage plots only",
             "Rebero ridge — 13%, but from a much higher base",
             "Kanombe — 18%, the most reliable middle-market entry point we track",
         ]},
         {"type": "quote", "text": ("The question is never 'is Kigali land going up'. It is "
                                    "'will this parcel, at this price, with this access, beat "
                                    "what else I could do with the money'.")},
     ]},
    {"slug": "one-property-to-five-in-three-years",
     "title": "How a client went from one plot to five properties in three years",
     "category": "Wealth Education", "read_time": 11, "is_featured": True, "is_published": True,
     "author_name": "Aline Uwase", "author_role": "Head of Real Estate",
     "published_at": "2026-06-18",
     "cover_url": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80",
     "tags": ["Wealth Cycle", "Portfolio", "Case study"],
     "excerpt": ("The full arithmetic of the Wealth Cycle, using a real client journey that "
                 "started with RWF 8 million in savings and no property at all."),
     "body": [
         {"type": "p", "text": ("Most people assume building a property portfolio requires "
                                "capital they do not have. It usually requires something more "
                                "ordinary: buying the right first asset, improving it, and "
                                "being disciplined about the proceeds.")},
         {"type": "h2", "text": "Year 0 — the first plot"},
         {"type": "p", "text": ("RWF 8 million saved, no property. We sourced a verified plot "
                                "in Kanombe, negotiated, and closed. Valued at RWF 10 million "
                                "on completion.")},
         {"type": "h2", "text": "Year 0–1 — build something that earns"},
         {"type": "p", "text": ("We built a simple two-unit rental for RWF 18 million. The "
                                "property was then worth about RWF 35 million.")},
     ]},
    {"slug": "buying-property-in-rwanda-from-abroad",
     "title": "Buying property in Rwanda from abroad without getting burned",
     "category": "Diaspora", "read_time": 9, "is_featured": True, "is_published": True,
     "author_name": "Claudine Ingabire", "author_role": "Diaspora Relations Lead",
     "published_at": "2026-05-27",
     "cover_url": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80",
     "tags": ["Diaspora", "Title verification", "Checklist"],
     "excerpt": ("Title verification, remote payment, power of attorney and the documents you "
                 "should refuse to proceed without."),
     "body": [
         {"type": "p", "text": ("The diaspora is the highest-value and most poorly served "
                                "segment in Rwandan real estate. Distance makes fraud easy, and "
                                "most operators have no system for closing that distance.")},
         {"type": "h2", "text": "The documents to insist on"},
         {"type": "list", "items": [
             "The UPI and a current NLA title search dated within 30 days",
             "A video walking the parcel boundary with the UPI visible on screen",
             "The seller’s national ID matched against the registered owner name",
             "A written, priced sale agreement — never a verbal figure",
             "Receipts for every payment, issued the same day the money moves",
         ]},
         {"type": "quote", "text": ("We would rather lose a transaction than hand a client a "
                                    "title dispute.")},
     ]},
    {"slug": "what-agricultural-land-is-actually-worth",
     "title": "What agricultural land in Rwanda is actually worth",
     "category": "Market Report", "read_time": 10, "is_featured": False, "is_published": True,
     "author_name": "Eric Mugisha", "author_role": "Senior Property Consultant",
     "published_at": "2026-04-30",
     "cover_url": "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=1400&q=80",
     "tags": ["Agriculture", "Land valuation", "Irrigation"],
     "excerpt": ("Soil, water rights and road access move farmland prices far more than "
                 "hectares do. A practical guide to reading an agricultural parcel."),
     "body": [
         {"type": "p", "text": ("Buyers ask what farmland costs per hectare. It is the wrong "
                                "question — two neighbouring parcels of identical size can "
                                "differ by 60% in value depending on water and access.")},
         {"type": "h2", "text": "What actually sets the price"},
         {"type": "list", "items": [
             "A year-round water source, and a permit that transfers with the sale",
             "All-weather road access — a dry-season track halves what a buyer will pay",
             "Soil depth and pH, especially for perennials like coffee and avocado",
             "Existing terracing, which costs millions to retrofit",
             "Standing structures: a grain store or cold room changes the economics",
         ]},
         {"type": "quote", "text": ("Buy the water and the road. The soil you can improve; the "
                                    "other two you cannot.")},
     ]},
]
