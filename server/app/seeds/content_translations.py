"""
Kinyarwanda and French for the admin-authored content.

Kept apart from the English source files on purpose: the English copy is the
thing marketing edits, and interleaving three languages into those tables makes
them unreadable. Here each entry is keyed by the same natural identifier the
seeder uses, and holds only the fields that actually differ per locale — the
frontend merges these over the English row (see `client/src/lib/localize.ts`),
so anything omitted simply falls through to English.

Numbers, prices, UPIs, proper nouns and technical codes are deliberately left
untranslated where repeating them would only invite drift.

NOTE: the Kinyarwanda needs review by a native speaker before launch, the same
caveat that applies to `client/src/data/translations.ts`.
"""

# --------------------------------------------------------------- service lines
# Keyed by slug.
SERVICE_LINES = {
    "buy": {
        "rw": {
            "title": "Gura ubutaka n’imitungo",
            "tagline": "Bigenzurwa mbere y’uko bikugeraho",
            "description": (
                "Buri kibanza dushyira ku rubuga kigenzurwa mu Kigo cy’Igihugu "
                "gishinzwe Ubutaka mbere y’uko kigaragara."
            ),
            "bullets": [
                "Impapuro zigenzurwa muri NLA mbere yo gushyirwa ku rubuga",
                "UPI, ingano y’ikibanza na GIS birashyirwa ahagaragara",
                "Ubwumvikane bukorwa n’umujyanama wawe wagenwe",
                "Amasezerano ya digitale, inyemezabwishyu no gufasha mu ihererekanya",
            ],
        },
        "fr": {
            "title": "Acheter un terrain ou un bien",
            "tagline": "Vérifié avant d’arriver jusqu’à vous",
            "description": (
                "Chaque parcelle que nous publions est vérifiée auprès de l’Autorité "
                "Nationale des Terres avant d’apparaître sur la plateforme."
            ),
            "bullets": [
                "Titre vérifié auprès de la NLA avant publication",
                "UPI, superficie et coordonnées GIS publiés",
                "Négociation menée par votre consultant attitré",
                "Contrat numérique, reçus et accompagnement au transfert",
            ],
        },
    },
    "sell": {
        "rw": {
            "title": "Gurisha cyangwa utangaze umutungo wawe",
            "tagline": "Wamamazwa neza, ugurishwe vuba",
            "description": "Amashusho ya drone, amafoto y’umwuga n’itangazo rifite ikarita.",
            "bullets": [
                "Isuzuma ry’agaciro n’uburyo bwo gushyiraho igiciro ku buntu",
                "Amashusho ya drone n’amafoto y’umwuga",
                "Kugenzura ubushobozi bw’umuguzi mbere ya buri isura",
                "Komisiyo yumvikanwaho mu nyandiko mbere y’igihe",
            ],
        },
        "fr": {
            "title": "Vendre ou publier votre bien",
            "tagline": "Bien commercialisé, vendu plus vite",
            "description": "Vidéo par drone, photographie professionnelle et annonce cartographiée.",
            "bullets": [
                "Évaluation gratuite et stratégie de prix",
                "Vidéo par drone et photographie professionnelle",
                "Qualification de l’acheteur avant chaque visite",
                "Commission convenue par écrit dès le départ",
            ],
        },
    },
    "build": {
        "rw": {
            "title": "Ubwubatsi no kuvugurura",
            "tagline": "Isosiyete imwe ihuza abaguzi kandi yubaka",
            "description": "Amasezerano y’igiciro gihamye, ingoboka ya 15% no gukurikirana ikiguzi buri cyumweru.",
            "bullets": [
                "Amasezerano y’igiciro gihamye n’umukiriya",
                "Gukurikirana ikiguzi na raporo z’amafoto buri cyumweru",
                "Ababaji, abashinga amashanyarazi n’abakora amazi bagenzuwe",
                "Ubugenzuzi bwa kure ku bakiriya bo mu mahanga",
            ],
        },
        "fr": {
            "title": "Construction et rénovation",
            "tagline": "Une seule société courtière et bâtisseuse",
            "description": "Contrats à prix fixe, marge de 15% pour imprévus et suivi hebdomadaire des coûts.",
            "bullets": [
                "Contrats client à prix fixe",
                "Suivi hebdomadaire des coûts et rapports photo",
                "Maçons, électriciens, plombiers et carreleurs vérifiés",
                "Supervision à distance pour les clients de la diaspora",
            ],
        },
    },
    "manage": {
        "rw": {
            "title": "Gucunga imitungo",
            "tagline": "Inyungu zitagusaba imbaraga, zirinzwe",
            "description": "Dushaka abakodesha, dukusanya ubukode, dukurikirana isanwa kandi dutanga raporo buri kwezi.",
            "bullets": [
                "Gushaka no gusuzuma abakodesha",
                "Gukusanya ubukode no gukurikirana imyenda",
                "Guhuza isanwa n’ibigenzurwa",
                "Raporo y’ukwezi yoherezwa kuri imeyili yawe",
            ],
        },
        "fr": {
            "title": "Gestion immobilière",
            "tagline": "Revenu passif, activement protégé",
            "description": "Nous plaçons les locataires, encaissons les loyers, gérons l’entretien et rapportons chaque mois.",
            "bullets": [
                "Recherche et sélection des locataires",
                "Encaissement des loyers et relance des impayés",
                "Coordination de l’entretien et inspections",
                "Relevé mensuel envoyé par courriel",
            ],
        },
    },
    "diaspora": {
        "rw": {
            "title": "Serivisi z’Abanyarwanda bo mu mahanga",
            "tagline": "Shora imari mu rugo utagombye kuhagera",
            "description": "Amashusho, impapuro zigenzuwe, amasezerano ya digitale na raporo z’ukwezi.",
            "bullets": [
                "Amashusho y’umutungo wose watoranyijwe",
                "Kugenzura impapuro ku giti cyacu mbere yo kwishyura",
                "Amasezerano ya digitale ashyirwaho umukono aho uri hose",
                "Igitabo cy’ubwubatsi na raporo z’amafoto buri kwezi",
            ],
        },
        "fr": {
            "title": "Services diaspora",
            "tagline": "Investir au pays sans rentrer au pays",
            "description": "Mises à jour vidéo, titres vérifiés, contrats numériques et rapports mensuels.",
            "bullets": [
                "Visites vidéo de chaque bien présélectionné",
                "Vérification indépendante du titre avant tout acompte",
                "Contrats numériques signés depuis n’importe où",
                "Journal de chantier et rapport photo mensuels",
            ],
        },
    },
    "wealth": {
        "rw": {
            "title": "Uruziga rw’Ubukungu",
            "tagline": "Kuva ku mutungo umwe ukagera ku bundi bwinshi",
            "description": "Tuguma tuli kumwe mu kugura, kubaka, kwinjiza, kugurisha no gusubiza mu bushoramari.",
            "bullets": [
                "Gahunda y’imitungo ishingiye ku ngengo y’imari yawe",
                "Inama ku gihe cyo kugurisha, atari ibyo kugura gusa",
                "Amafaranga yinjiye ashorwa mu mitungo 2–3 mishya",
                "Ubuyobozi buhoraho uko imitungo yiyongera",
            ],
        },
        "fr": {
            "title": "Le Cycle de Richesse",
            "tagline": "D’un seul bien à un portefeuille",
            "description": "Nous vous accompagnons à l’achat, la construction, le revenu, la vente et le réinvestissement.",
            "bullets": [
                "Plan de portefeuille bâti autour de votre budget",
                "Conseil sur le moment de vendre, pas seulement sur quoi acheter",
                "Produits de vente redirigés vers 2–3 nouveaux actifs",
                "Gestion continue à mesure que le portefeuille grandit",
            ],
        },
    },
    "survey": {
        "rw": {
            "title": "Gupima ikibanza no gutera bornes",
            "tagline": "Gutera bornes — impande z’ikibanza cyawe, zimenyekana kandi zanditswe",
            "description": (
                "Umupimyi wemewe apima ikibanza kandi atera bornes, ku buryo impande "
                "ziri ku butaka zihuye n’iziri ku mpapuro."
            ),
            "bullets": [
                "Umupimyi w’ubutaka wemewe aza ku kibanza",
                "Bornes ziterwa ku mpande zose",
                "Ibipimo bihuzwa n’ibiri muri kadastre",
                "Impaka z’imbibi n’abaturanyi zigaragazwa mbere yo kubaka",
            ],
        },
        "fr": {
            "title": "Bornage et levé de parcelle",
            "tagline": "Gutera bornes — vos limites, marquées et enregistrées",
            "description": (
                "Un géomètre agréé mesure la parcelle et plante les bornes, afin que les "
                "limites sur le terrain correspondent à celles du titre."
            ),
            "bullets": [
                "Géomètre agréé présent sur le terrain",
                "Bornes plantées à chaque angle de la parcelle",
                "Mesures rapprochées du cadastre",
                "Litiges de limites signalés avant que vous ne construisiez",
            ],
        },
    },
    "gps-check": {
        "rw": {
            "title": "Kugenzura GPS n’ikibanza",
            "tagline": "Emeza ko ikibanza weretswe ari cyo kiri ku mpapuro",
            "description": (
                "Dufata ibipimo bya GPS ku butaka tukabigereranya n’ikibanza cyanditswe "
                "kuri iyo UPI mu Kigo cy’Igihugu gishinzwe Ubutaka."
            ),
            "bullets": [
                "Ibipimo bya GPS bifatwa ku kibanza",
                "Bigereranywa n’imiterere y’ikibanza cyanditswe",
                "Ingano n’imiterere byemezwa hakurikijwe impapuro",
                "Raporo yanditse ushobora gushingiraho",
            ],
        },
        "fr": {
            "title": "Vérification GPS et parcellaire",
            "tagline": "Confirmez que la parcelle montrée est celle du titre",
            "description": (
                "Nous relevons les coordonnées GPS sur le terrain et les comparons à la "
                "parcelle enregistrée sous cet UPI auprès de l’Autorité Nationale des Terres."
            ),
            "bullets": [
                "Coordonnées GPS relevées sur place",
                "Comparées à la géométrie de la parcelle enregistrée",
                "Superficie et forme confirmées par rapport au titre",
                "Rapport écrit exploitable",
            ],
        },
    },
    "cadastral-plan": {
        "rw": {
            "title": "Igishushanyo cy’ikibanza (fiche cadastrale)",
            "tagline": "Igishushanyo umwubatsi wawe azasaba",
            "description": (
                "Dusaba fiche cadastrale y’ikibanza cyawe mu Kigo cy’Igihugu gishinzwe "
                "Ubutaka tukayiguha hamwe n’ubushakashatsi ku mpapuro."
            ),
            "bullets": [
                "Fiche cadastrale isabwa mu izina ryawe",
                "Ubushakashatsi ku mpapuro z’ubutaka bukorwa icyarimwe",
                "Kopi zemewe z’umwubatsi wawe n’akarere",
                "Abakiriya bo mu mahanga bafashwa bose ari kure",
            ],
        },
        "fr": {
            "title": "Plan cadastral (fiche cadastrale)",
            "tagline": "Le plan de parcelle que votre architecte demandera",
            "description": (
                "Nous demandons la fiche cadastrale de votre parcelle à l’Autorité "
                "Nationale des Terres et vous la remettons avec la recherche de titre."
            ),
            "bullets": [
                "Fiche cadastrale demandée en votre nom",
                "Recherche de titre foncier menée en parallèle",
                "Copies certifiées pour votre architecte et le district",
                "Clients de la diaspora traités entièrement à distance",
            ],
        },
    },
    "building-permit": {
        "rw": {
            "title": "Gufasha kubona uruhushya rwo kubaka",
            "tagline": "Uruhushya rwo kubaka — wemerewe kubaka mu mategeko",
            "description": (
                "Ibishushanyo, icyemezo cy’ubwubatsi n’idosiye y’akarere — dutegura "
                "idosiye tukayikurikirana kuri One Stop Centre kugeza uruhushya rutanzwe."
            ),
            "bullets": [
                "Ibishushanyo by’ubwubatsi n’ibya tekiniki bitegurwa",
                "Kugenzura amabwiriza y’imikoreshereze y’ubutaka mbere na mbere",
                "Idosiye itangwa muri District One Stop Centre",
                "Gukurikiranwa kugeza uruhushya rugeze mu ntoki zawe",
            ],
        },
        "fr": {
            "title": "Accompagnement au permis de construire",
            "tagline": "Uruhushya rwo kubaka — légalement autorisé à bâtir",
            "description": (
                "Plans, certification structurelle et dépôt au district — nous montons le "
                "dossier et le suivons au One Stop Centre jusqu’à la délivrance du permis."
            ),
            "bullets": [
                "Plans architecturaux et structurels préparés",
                "Conformité au zonage et à l’usage des sols vérifiée en amont",
                "Dépôt via le District One Stop Centre",
                "Suivi jusqu’à ce que le permis soit entre vos mains",
            ],
        },
    },
}


# -------------------------------------------------------- construction packages
# Keyed by slug. `tier` stays as-is: it is a label buyers recognise in English.
CONSTRUCTION_PACKAGES = {
    "standard": {
        "rw": {
            "tagline": "Umuryango umwe, wubatswe neza",
            "suited_to": "Inzu y’umuryango umwe — urugo rumwe, igikoni kimwe, umuryango umwe.",
            "price_note": "Igiciro gitangwa nyuma yo gusura ikibanza — reba impamvu hasi",
            "duration": "Amezi 3–5",
            "description": (
                "Inzu abaturage benshi mu Rwanda basanzwe bubaka: ibyumba bitatu cyangwa "
                "bine, salon, igikoni n’ubwiherero, ku kibanza kimwe cy’urugo rumwe."
            ),
            "includes": [
                "Amasezerano y’igiciro gihamye n’ingoboka ya 15% ivuzwe mbere",
                "Umugenzuzi w’ikibanza uhari kuri buri rugendo",
                "Raporo y’amafoto n’urutonde rw’ikiguzi buri cyumweru",
                "Abakozi bagenzuwe gusa — nta bakozi b’igihe gito",
                "Garanti y’amezi 12 ku bwubatsi",
            ],
            "finishes": [
                {"label": "Imiterere", "value": "Urugo rumwe, ibyumba 3–4"},
                {"label": "Inkuta", "value": "Amatafari ya sima, yasizwe kandi yasizwe irangi"},
                {"label": "Igisenge", "value": "Amabati ku mbaho zavuwe"},
                {"label": "Hasi", "value": "Sima n’amakaro mu bwiherero"},
                {"label": "Amadirishya", "value": "Aluminiyumu isize irangi, ikirahure gisobanutse"},
                {"label": "Ibikoresho", "value": "Ibikoresho by’ubwiherero n’amashanyarazi bisanzwe"},
            ],
        },
        "fr": {
            "tagline": "Une famille, bien bâtie",
            "suited_to": "Une maison unifamiliale — un ménage, une cuisine, une entrée.",
            "price_note": "Devis après la visite du site — voir pourquoi ci-dessous",
            "duration": "3–5 mois",
            "description": (
                "La maison que construisent réellement la plupart des familles au Rwanda : "
                "trois ou quatre chambres, un séjour, une cuisine et les pièces d’eau, sur "
                "une parcelle pour un seul ménage."
            ),
            "includes": [
                "Contrat à prix fixe avec 15% d’imprévus annoncés d’emblée",
                "Superviseur de chantier dédié à chaque visite",
                "Rapport photo et tableau de coûts hebdomadaires",
                "Uniquement des sous-traitants vérifiés — pas de main-d’œuvre occasionnelle",
                "Garantie de 12 mois sur la main-d’œuvre",
            ],
            "finishes": [
                {"label": "Agencement", "value": "Ménage unique, 3–4 chambres"},
                {"label": "Murs", "value": "Blocs de ciment, enduits et peints"},
                {"label": "Toiture", "value": "Tôles ondulées sur charpente traitée"},
                {"label": "Sols", "value": "Chape de ciment, carrelage dans les pièces d’eau"},
                {"label": "Fenêtres", "value": "Aluminium thermolaqué, vitrage clair"},
                {"label": "Équipements", "value": "Sanitaires et appareillage de gamme standard"},
            ],
        },
    },
    "premium": {
        "rw": {
            "tagline": "Ingo ebyiri, cyangwa umuryango ugikura",
            "suited_to": (
                "Inzu ya two-in-one cyangwa ifite ingo nyinshi — imiryango n’ibikoresho "
                "bitandukanye ku ngo ebyiri cyangwa nyinshi ziri munsi y’igisenge kimwe."
            ),
            "price_note": "Igiciro gitangwa nyuma yo gusura ikibanza — reba impamvu hasi",
            "duration": "Amezi 5–8",
            "description": (
                "Yubatswe hakurikijwe uko imiryango yo hano ibaho kandi yinjiza: ingo "
                "ebyiri cyangwa nyinshi zizihagije mu nyubako imwe. Ba muri imwe, ukodeshe "
                "indi, cyangwa uyibikire abana — ni yo mpamvu ari yo pake ikoreshwa cyane "
                "mu bwubatsi bw’Uruziga rw’Ubukungu."
            ),
            "includes": [
                "Ibiri muri Standard byose",
                "Umuryango, igikoni na kontere bitandukanye kuri buri rugo",
                "Ibishushanyo by’ubwubatsi n’icyemezo cya tekiniki",
                "Amakaro yuzuye, plafond n’ibiti byatunganijwe",
                "Ubusitani n’urukuta rw’imbibi birimo",
                "Isuzuma ry’ikiguzi ry’umuhanga kuri buri ntambwe",
                "Garanti y’amezi 24 ku bwubatsi",
            ],
            "finishes": [
                {"label": "Imiterere", "value": "Ingo ebyiri cyangwa nyinshi zizihagije"},
                {"label": "Ibikoresho", "value": "Amazi n’amashanyarazi bifite kontere zitandukanye"},
                {"label": "Inkuta", "value": "Amatafari atwitse cyangwa beto, hasizwe neza"},
                {"label": "Igisenge", "value": "Amategura ku mbaho zubatswe neza"},
                {"label": "Hasi", "value": "Amakaro manini ya porcelaine hose"},
                {"label": "Amadirishya", "value": "Aluminiyumu ikingira ubushyuhe, ikirahure cyijimye"},
                {"label": "Ibikoresho", "value": "Ibikoresho by’ubwiherero byatumijwe, amashanyarazi azwi"},
            ],
        },
        "fr": {
            "tagline": "Deux ménages, ou une famille qui s’agrandit",
            "suited_to": (
                "Une maison deux-en-un ou multi-logements — entrées et réseaux séparés "
                "pour deux ménages ou plus sous un même toit."
            ),
            "price_note": "Devis après la visite du site — voir pourquoi ci-dessous",
            "duration": "5–8 mois",
            "description": (
                "Conçue pour la façon dont les familles d’ici vivent et gagnent leur vie : "
                "deux logements indépendants ou plus dans une même structure. Habitez l’un, "
                "louez l’autre, ou gardez-le pour les enfants — c’est ce qui en fait la "
                "formule la plus utilisée par les chantiers du Cycle de Richesse."
            ),
            "includes": [
                "Tout ce que comprend Standard",
                "Entrée, cuisine et compteur séparés par logement",
                "Plans architecturaux et certification structurelle",
                "Carrelage, plafonds et menuiserie complets",
                "Aménagement paysager et mur de clôture inclus",
                "Revue des coûts par un métreur à chaque jalon",
                "Garantie de 24 mois sur la main-d’œuvre",
            ],
            "finishes": [
                {"label": "Agencement", "value": "Deux logements indépendants ou plus"},
                {"label": "Réseaux", "value": "Compteurs d’eau et d’électricité indépendants"},
                {"label": "Murs", "value": "Brique cuite ou béton armé, finition lissée"},
                {"label": "Toiture", "value": "Tuiles à double pente sur fermes calculées"},
                {"label": "Sols", "value": "Grès cérame grand format partout"},
                {"label": "Fenêtres", "value": "Aluminium à rupture de pont thermique, vitrage teinté"},
                {"label": "Équipements", "value": "Sanitaires importés, appareillage de marque"},
            ],
        },
    },
    "luxury": {
        "rw": {
            "tagline": "Villa n’amazu manini yigenga",
            "suited_to": "Inzu yigenga yashushanyijwe n’umwubatsi ku kibanza kiyikwiriye.",
            "price_note": "Igiciro gitangwa nyuma yo gusura ikibanza — reba impamvu hasi",
            "duration": "Amezi 8–14",
            "description": (
                "Amazu ayobowe n’umwubatsi ku misozi no mu turere tuzwi — buri kimwe "
                "gishushanywa ku giti cyacyo, ntigitoranywe muri katalogi."
            ),
            "includes": [
                "Ibiri muri Premium byose",
                "Umwubatsi n’umuhanga mu bwiza bw’imbere bazwi ku mushinga",
                "Igishushanyo cya 3D n’urugero rw’ibikoresho mbere yo kubaka",
                "Insinga za smart home, izuba n’ingufu z’ingoboka",
                "Piscine, igishushanyo cy’ubusitani n’amatara yo hanze",
                "Garanti y’amezi 36 ku bwubatsi",
            ],
            "finishes": [
                {"label": "Imiterere", "value": "Villa cyangwa inzu nini yigenga, yashushanyijwe"},
                {"label": "Inkuta", "value": "Beto ikomeye, amabuye kamere yo kurimbisha"},
                {"label": "Igisenge", "value": "Igisenge cya beto cyangwa amategura yatoranyijwe"},
                {"label": "Hasi", "value": "Ibiti byatunganijwe n’amabuye"},
                {"label": "Amadirishya", "value": "Ibirahure bihagaritse, bisunikwa"},
                {"label": "Ibikoresho", "value": "Ibyatoranyijwe n’umuhanga hose"},
            ],
        },
        "fr": {
            "tagline": "Villas et demeures individuelles",
            "suited_to": "Une maison individuelle dessinée par un architecte, sur une parcelle à sa mesure.",
            "price_note": "Devis après la visite du site — voir pourquoi ci-dessous",
            "duration": "8–14 mois",
            "description": (
                "Des maisons menées par un architecte, sur les crêtes et aux adresses de "
                "prestige — dessinées une à une, non choisies sur catalogue."
            ),
            "includes": [
                "Tout ce que comprend Premium",
                "Architecte et architecte d’intérieur nommés sur le projet",
                "Visualisation 3D et planche d’échantillons avant travaux",
                "Précâblage domotique, solaire et alimentation de secours",
                "Piscine, conception du jardin et éclairage extérieur",
                "Garantie de 36 mois sur la main-d’œuvre",
            ],
            "finishes": [
                {"label": "Agencement", "value": "Villa ou demeure individuelle, dessinée par un architecte"},
                {"label": "Murs", "value": "Ossature béton armé, parements en pierre naturelle"},
                {"label": "Toiture", "value": "Toit-terrasse béton ou tuile architecturale spécifiée"},
                {"label": "Sols", "value": "Bois massif contrecollé et pierre"},
                {"label": "Fenêtres", "value": "Vitrages toute hauteur, baies coulissantes"},
                {"label": "Équipements", "value": "Spécification designer sur l’ensemble"},
            ],
        },
    },
}


# ---------------------------------------------------------- consultation types
# Keyed by slug.
CONSULTATION_TYPES = {
    "discovery": {
        "rw": {
            "title": "Ikiganiro cya mbere ku buntu",
            "price_label": "Ku buntu",
            "modes": ["Telefoni", "Amashusho kuri WhatsApp", "Google Meet"],
            "description": (
                "Tubwire ingengo y’imari yawe n’icyo ushaka kugeraho. Tuzakubwira ukuri "
                "niba dushobora kugufasha n’igiciro byatwara."
            ),
        },
        "fr": {
            "title": "Appel découverte gratuit",
            "price_label": "Gratuit",
            "modes": ["Téléphone", "Vidéo WhatsApp", "Google Meet"],
            "description": (
                "Dites-nous votre budget et votre objectif. Nous vous dirons honnêtement "
                "si nous pouvons vous aider et ce que cela coûterait."
            ),
        },
    },
    "viewing": {
        "rw": {
            "title": "Gusura umutungo",
            "price_label": "Ku buntu",
            "modes": ["Ku kibanza", "Amashusho ako kanya"],
            "description": (
                "Sura umutungo watoranyijwe uri kumwe n’umujyanama wawe. Abakiriya bo mu "
                "mahanga babona isura imwe mu mashusho ako kanya, UPI igaragara."
            ),
        },
        "fr": {
            "title": "Visite de bien",
            "price_label": "Gratuit",
            "modes": ["Sur place", "Visite vidéo en direct"],
            "description": (
                "Parcourez un bien présélectionné avec votre consultant. Les clients de la "
                "diaspora ont la même visite en vidéo, avec l’UPI à l’écran."
            ),
        },
    },
    "wealth-plan": {
        "rw": {
            "title": "Inama yo gutegura Uruziga rw’Ubukungu",
            "price_label": "Ku buntu ku bakiriya",
            "modes": ["Ku biro", "Google Meet"],
            "description": "Dushyira imari yawe muri gahunda y’imitungo y’imyaka itatu.",
        },
        "fr": {
            "title": "Séance de planification du Cycle de Richesse",
            "price_label": "Gratuit pour les clients",
            "modes": ["Bureau", "Google Meet"],
            "description": "Nous alignons votre capital sur un plan de portefeuille à trois ans.",
        },
    },
    "construction": {
        "rw": {
            "title": "Inama ku bwubatsi",
            "price_label": "RWF 25,000 — bikurwa ku kiguzi cy’ubwubatsi",
            "modes": ["Ku kibanza", "Ku biro"],
            "description": "Zana ikibanza cyawe cyangwa ibishushanyo tubaze igiciro cya metero kare.",
        },
        "fr": {
            "title": "Consultation construction",
            "price_label": "25 000 RWF — déduits de votre chantier",
            "modes": ["Sur place", "Bureau"],
            "description": "Apportez votre parcelle ou vos plans pour un prix indicatif au mètre carré.",
        },
    },
    "diaspora": {
        "rw": {
            "title": "Ikiganiro ku ishoramari ry’abo mu mahanga",
            "price_label": "Ku buntu",
            "modes": ["Google Meet", "Zoom"],
            "description": "Giteganywa hakurikijwe amasaha y’aho uri. Kugenzura impapuro, kwishyura no guhererekanya.",
        },
        "fr": {
            "title": "Briefing investissement diaspora",
            "price_label": "Gratuit",
            "modes": ["Google Meet", "Zoom"],
            "description": "Programmé selon les fuseaux horaires. Vérification du titre, paiement à distance, transfert.",
        },
    },
    "valuation": {
        "rw": {
            "title": "Gusura no gusuzuma agaciro ku bagurisha",
            "price_label": "Ku buntu",
            "modes": ["Ku kibanza"],
            "description": "Dusuzuma umutungo wawe tuwugereranya n’ibindi byagurishijwe vuba muri ako gace.",
        },
        "fr": {
            "title": "Visite d’évaluation vendeur",
            "price_label": "Gratuit",
            "modes": ["Sur place"],
            "description": "Nous évaluons votre bien face aux ventes comparables récentes du secteur.",
        },
    },
}


# ------------------------------------------------------------ wealth cycle
# Keyed by step number.
WEALTH_CYCLE = {
    1: {
        "rw": {
            "title": "Gushaka",
            "action": "Dushakisha ubutaka cyangwa umutungo wagenzuwe uhuye n’ingengo y’imari n’intego zawe.",
            "outcome": "Ugura umutungo wawe wa mbere ufashijwe uko bikwiye.",
        },
        "fr": {
            "title": "Trouver",
            "action": "Nous cherchons un terrain ou un bien vérifié correspondant à votre budget et vos objectifs.",
            "outcome": "Vous achetez votre premier bien, pleinement accompagné.",
        },
    },
    2: {
        "rw": {
            "title": "Kubaka / Kuvugurura",
            "action": "Duvugurura, turangiza cyangwa twubaka kugira ngo agaciro kiyongere.",
            "outcome": "Agaciro k’umutungo kiyongeraho 20–50%.",
        },
        "fr": {
            "title": "Construire / Améliorer",
            "action": "Nous rénovons, finissons ou construisons pour augmenter la valeur.",
            "outcome": "La valeur du bien augmente de 20 à 50%.",
        },
    },
    3: {
        "rw": {
            "title": "Kwinjiza",
            "action": "Dushyiraho abakodesha kandi tugacunga umutungo kugira ngo winjize utagize icyo ukora.",
            "outcome": "Ubukode bw’ukwezi butangira kwinjira.",
        },
        "fr": {
            "title": "Percevoir",
            "action": "Nous plaçons les locataires et gérons le bien pour un revenu passif.",
            "outcome": "Les loyers mensuels commencent à rentrer.",
        },
    },
    4: {
        "rw": {
            "title": "Kugurisha ku gaciro ntarengwa",
            "action": "Tugutera inkunga ku gihe cyiza cyo kugurisha kandi tukawamamaza mu buryo bw’umwuga.",
            "outcome": "Ubona inyungu z’izamuka ry’agaciro hiyongereyeho ubukode.",
        },
        "fr": {
            "title": "Vendre au sommet",
            "action": "Nous conseillons le bon moment pour vendre et commercialisons professionnellement.",
            "outcome": "Vous captez la plus-value en plus des loyers perçus.",
        },
    },
    5: {
        "rw": {
            "title": "Gusubiza mu bushoramari",
            "action": "Twohereza amafaranga yinjiye mu mitungo mishya 2–3.",
            "outcome": "Ubu ufite imitungo myinshi. Uruziga rurasubirwamo.",
        },
        "fr": {
            "title": "Réinvestir",
            "action": "Nous redirigeons le produit de la vente vers 2–3 nouveaux biens.",
            "outcome": "Vous possédez désormais plusieurs actifs. Le cycle recommence.",
        },
    },
    6: {
        "rw": {
            "title": "Gusubiramo",
            "action": "Uruziga rukomeza, imitungo yiyongera kuri buri nzinguko.",
            "outcome": "Kuva ku mutungo 1 ukagera kuri 4–5 mu myaka 3.",
        },
        "fr": {
            "title": "Recommencer",
            "action": "Le cycle se poursuit avec un portefeuille plus grand à chaque tour.",
            "outcome": "D’un bien à 4–5 en trois ans.",
        },
    },
}


# -------------------------------------------------------------- market stats
# Keyed by `key`. Figures stay as-is; only the wording changes.
MARKET_STATS = {
    "housing_deficit": {
        "rw": {"label": "Icyuho cy’amazu mu gihugu", "source": "Isesengura ry’isoko ry’amazu mu Rwanda 2025"},
        "fr": {"label": "Déficit national de logements", "source": "Analyse du marché du logement au Rwanda 2025"},
    },
    "land_appreciation": {
        "rw": {"label": "Izamuka ry’agaciro k’ubutaka ku mwaka"},
        "fr": {"label": "Appréciation annuelle des terrains"},
    },
    "rental_yield": {
        "rw": {"label": "Inyungu y’ubukode mu turere twiza"},
        "fr": {"label": "Rendement locatif prime"},
    },
    "kigali_demand": {
        "rw": {"label": "Ikenerwa i Kigali bigeze 2032"},
        "fr": {"label": "Demande à Kigali d’ici 2032"},
    },
}


# --------------------------------------------------------------- testimonials
# Keyed by author_name. Names and places stay as written.
TESTIMONIALS = {
    "Jean-Paul Habyarimana": {
        "rw": {
            "author_role": "Umwarimu",
            "milestone": "Yarangije uruziga rwuzuye · imitungo 3",
            "quote": (
                "Naguze ikibanza i Kanombe n’amafaranga yose nari nazigamye. Evaramu "
                "ntibahagarariye aho — bubatseho amazu abiri yo gukodesha, bashaka "
                "abakodesha, kandi bambwira neza igihe cyo kugurisha. Ubu mfite imitungo itatu."
            ),
        },
        "fr": {
            "author_role": "Enseignant",
            "milestone": "Un cycle complet achevé · 3 biens",
            "quote": (
                "J’ai acheté une parcelle à Kanombe avec toutes mes économies. Evaramu ne "
                "s’est pas arrêtée là — ils y ont bâti deux logements locatifs, trouvé les "
                "locataires, et m’ont dit exactement quand vendre. Je possède trois biens aujourd’hui."
            ),
        },
    },
    "Yvette Mukamana": {
        "rw": {
            "author_role": "Umuforomo · Umukiriya wo mu mahanga",
            "milestone": "Kugura ari kure · ikibanza i Kigali",
            "quote": (
                "Ntuye i Buruseli kandi nari narahemukiwe rimwe. Claudine yanyoherereje "
                "amashusho agenda ku mbibi UPI igaragara, hanyuma icyemezo cya NLA, hanyuma "
                "amasezerano. Nashyize umukono ndi ku meza yanjye y’igikoni."
            ),
        },
        "fr": {
            "author_role": "Infirmière · Cliente de la diaspora",
            "milestone": "Achat à distance · parcelle à Kigali",
            "quote": (
                "Je vis à Bruxelles et je m’étais déjà fait avoir une fois. Claudine m’a "
                "envoyé une vidéo longeant la limite avec l’UPI à l’écran, puis la "
                "vérification NLA, puis le contrat. J’ai signé depuis ma table de cuisine."
            ),
        },
    },
    "Emmanuel & Grace Niyonzima": {
        "rw": {
            "author_role": "Ba nyir’inzu",
            "milestone": "Pake ya Premium Finish · metero kare 240",
            "quote": (
                "Inzu yacu yari imaze imyaka ine itarangiye. Evaramu batanze igiciro "
                "gihamye n’ingoboka yanditse kandi barakigumaho. Twimukiye mu minsi cumi "
                "n’umwe mbere y’igihe cyari giteganyijwe."
            ),
        },
        "fr": {
            "author_role": "Propriétaires",
            "milestone": "Formule Premium Finish · 240 m²",
            "quote": (
                "Le gros œuvre de notre maison était à l’arrêt depuis quatre ans. Evaramu a "
                "donné un prix fixe avec les imprévus écrits noir sur blanc, et s’y est tenue. "
                "Nous avons emménagé onze jours avant la date prévue."
            ),
        },
    },
    "Diane Uwimana": {
        "rw": {
            "author_role": "Umucuruzikazi",
            "milestone": "Yagurishije ku gaciro ntarengwa · yashoye mu bibanza 2",
            "quote": (
                "Icyo nshima ni ukuri. Nashakaga kugurisha mu mpera z’umwaka ushize maze "
                "barambwira gutegereza amezi umunani. Narategereje. Nabonye miliyoni cumi "
                "n’imwe zirenze icyo nari hafi kwemera."
            ),
        },
        "fr": {
            "author_role": "Cheffe d’entreprise",
            "milestone": "Vendu au sommet · réinvesti dans 2 parcelles",
            "quote": (
                "Ce que j’apprécie, c’est l’honnêteté. Je voulais vendre à la fin de l’an "
                "dernier et ils m’ont dit d’attendre huit mois. J’ai attendu. J’ai obtenu "
                "onze millions de plus que l’offre que j’avais failli accepter."
            ),
        },
    },
    "Olivier Rwema": {
        "rw": {
            "author_role": "Injeniyeri · Umukiriya wo mu mahanga",
            "milestone": "Gucunga umutungo · amazu 2",
            "quote": (
                "Nohereza amafaranga mu rugo buri kwezi ariko sinari nzi neza aho ajya. Ubu "
                "mbona raporo ku itariki ya mbere ya buri kwezi irimo amafoto, ubukode "
                "bwakusanyijwe n’ibyakoreshejwe mu isanwa."
            ),
        },
        "fr": {
            "author_role": "Ingénieur · Client de la diaspora",
            "milestone": "Gestion locative · 2 logements",
            "quote": (
                "J’envoie de l’argent au pays chaque mois sans jamais vraiment savoir où il "
                "passait. Maintenant je reçois un rapport le premier de chaque mois, avec "
                "photos, loyers encaissés et dépenses d’entretien."
            ),
        },
    },
}


# --------------------------------------------------------------- content blocks
# Keyed by "page/key" — `seo` and `hero` exist on nearly every page, so the page
# alone is not enough to identify a block.
#
# `items` must be given whole when translated: the frontend swaps the array, it
# does not merge element by element. Icons and other non-text keys are repeated
# verbatim so the translated array stays a drop-in replacement.
CONTENT_BLOCKS = {
    "home/market": {
        "rw": {
            "eyebrow": "Isoko",
            "title": "Ikenerwa rishingiye ku miterere,",
            "accent": "si ubucuruzi bw’akanya gato.",
            "body": (
                "U Rwanda rukeneye amazu arenga 30,000 mashya ku mwaka, mu 2024 rwubatse "
                "13.8% by’ayo. Icyo cyuho si impinduka ishobora gusubira inyuma — ni "
                "imibare, kandi kirakomeza kwaguka."
            ),
            "items": [
                {
                    "text": (
                        "Inkomoko: isoko ry’amazu y’ubuturo rifite agaciro ka USD 84.85B kuri "
                        "USD 95.70B zose (2025), biteganyijwe kugera kuri USD 110.10B mu 2029."
                    )
                }
            ],
        },
        "fr": {
            "eyebrow": "Le marché",
            "title": "La demande est structurelle,",
            "accent": "pas spéculative.",
            "body": (
                "Le Rwanda a besoin de plus de 30 000 logements neufs par an et en a livré "
                "13,8% en 2024. Cet écart n’est pas une tendance qui pourrait s’inverser — "
                "c’est de l’arithmétique, et il se creuse."
            ),
            "items": [
                {
                    "text": (
                        "Sources : marché résidentiel évalué à 84,85 Md USD sur un total de "
                        "95,70 Md USD (2025), projeté à 110,10 Md USD d’ici 2029."
                    )
                }
            ],
        },
    },
    "home/services": {
        "rw": {
            "eyebrow": "Icyo dukora",
            "title": "Amashami abiri.",
            "accent": "Urunigi rumwe rw’agaciro.",
            "body": (
                "Ibigo byinshi bigurisha bikabura. Abubatsi benshi ntibigera babona umuguzi. "
                "Evaramu Realty na Evaramu Construction biri mu isosiyete imwe — ni yo mpamvu "
                "dushobora kongera agaciro k’umutungo aho kuwucuruza gusa."
            ),
        },
        "fr": {
            "eyebrow": "Ce que nous faisons",
            "title": "Deux divisions.",
            "accent": "Une seule chaîne de valeur.",
            "body": (
                "La plupart des agences vendent puis disparaissent. La plupart des "
                "constructeurs ne rencontrent jamais l’acheteur. Evaramu Realty et Evaramu "
                "Construction appartiennent à la même société — c’est pourquoi nous pouvons "
                "créer de la valeur sur un bien au lieu de simplement le transiger."
            ),
        },
    },
    "home/featured": {
        "rw": {
            "eyebrow": "Amatangazo ariho",
            "title": "Imitungo yagenzuwe,",
            "accent": "yiteguye kwimurwa.",
            "body": (
                "Buri tangazo riri hasi ryagenzuwe hakurikijwe UPI yaryo mu Kigo cy’Igihugu "
                "gishinzwe Ubutaka. Ubona ingano y’ikibanza, uburenganzira n’aho giherereye "
                "mbere yo guhamagara."
            ),
        },
        "fr": {
            "eyebrow": "Annonces en cours",
            "title": "Des biens vérifiés,",
            "accent": "prêts à être saisis.",
            "body": (
                "Chaque annonce ci-dessous a été contrôlée via son UPI auprès de l’Autorité "
                "Nationale des Terres. Vous voyez la superficie, le régime foncier et les "
                "coordonnées avant même de décrocher le téléphone."
            ),
        },
    },
    "home/wealth_cycle": {
        "rw": {
            "eyebrow": "Uburyo bwacu bwihariye",
            "title": "Uruziga rw’Ubukungu",
            "accent": "rwa Evaramu",
            "body": (
                "Ibigo byinshi bisoza igurisha bikabura. Twe turaguma. Kugura, kubaka, "
                "kwinjiza, kugurisha, gushora bundi bushya, gusubiramo — intambwe esheshatu "
                "zihindura umutungo umwe imitungo ine cyangwa itanu mu myaka itatu."
            ),
            "cta_label": "Reba uburyo bwose",
        },
        "fr": {
            "eyebrow": "Notre modèle signature",
            "title": "Le Cycle de Richesse",
            "accent": "Evaramu",
            "body": (
                "La plupart des agences concluent une vente puis disparaissent. Nous restons. "
                "Acheter, construire, percevoir, vendre, réinvestir, recommencer — six étapes "
                "qui transforment un bien en quatre ou cinq en trois ans."
            ),
            "cta_label": "Voir le modèle complet",
        },
    },
    "home/why": {
        "rw": {
            "eyebrow": "Impamvu Evaramu",
            "title": "Mu Rwanda hari ibigo 204 byanditswe.",
            "accent": "Nta na kimwe hafi gikora ibi.",
            "body": (
                "99% ni imirimo itagira gahunda ikorwa n’umuntu umwe, nta buryo, nta kirango, "
                "nta ikoranabuhanga. Bike bikomeye byanditswe bisiga inyuma abaturage bo hagati."
            ),
            "items": [
                {
                    "gap": "Nyuma y’igurisha",
                    "them": "Bagurisha rimwe, bagahita babura",
                    "us": "Turaguma kuva ku kugura → kubaka → kwinjiza → kugurisha → gushora",
                },
                {
                    "gap": "Abakiriya bo mu mahanga",
                    "them": "Guhamagara na WhatsApp gusa, nta nyandiko",
                    "us": "Amashusho, amasezerano ya digitale, impapuro zemejwe, raporo z’ukwezi",
                },
                {
                    "gap": "Kwamamaza umutungo",
                    "them": "Amafoto atagaragara neza mu matsinda ya WhatsApp",
                    "us": "Amashusho ya drone, amafoto y’umwuga, amatangazo afite ikarita",
                },
                {
                    "gap": "Imitungo n’ubwubatsi",
                    "them": "Abacuruzi n’abubatsi ni ibigo bitandukanye",
                    "us": "Isosiyete imwe icuruza kandi yubaka — urunigi rwose rw’agaciro",
                },
                {
                    "gap": "Inyandiko",
                    "them": "Amasezerano yo mu kanwa, nta nyemezabwishyu, impaka ku mpapuro",
                    "us": "Amasezerano ya digitale, gukurikirana ikiguzi, kugenzura muri NLA",
                },
                {
                    "gap": "Gukurikirana umukiriya",
                    "them": "Abakiriya barazimira, nta buryo bwo kubakurikirana",
                    "us": "Buri muntu arakurikiranwa; igisubizo mu masaha abiri",
                },
                {
                    "gap": "Kwigisha abakiriya",
                    "them": "Nta mucuruzi hafi utangaza ikintu cy’ingirakamaro",
                    "us": "Ingendo ku butaka buri cyumweru, amakuru y’isoko, ibyavuguruwe, ubuhamya",
                },
            ],
        },
        "fr": {
            "eyebrow": "Pourquoi Evaramu",
            "title": "Il y a 204 agences enregistrées au Rwanda.",
            "accent": "Presque aucune ne fait ceci.",
            "body": (
                "99% sont des structures informelles à propriétaire unique, sans systèmes, "
                "sans marque et sans technologie. Les quelques grands acteurs formels ignorent "
                "totalement le marché intermédiaire."
            ),
            "items": [
                {
                    "gap": "Après la vente",
                    "them": "Vendre une fois, puis disparaître",
                    "us": "Rester tout au long : acheter → construire → percevoir → vendre → réinvestir",
                },
                {
                    "gap": "Clients de la diaspora",
                    "them": "Appels et WhatsApp, aucune documentation",
                    "us": "Mises à jour vidéo, contrats numériques, titres vérifiés, rapports mensuels",
                },
                {
                    "gap": "Commercialiser un bien",
                    "them": "Photos floues prises au téléphone dans des groupes WhatsApp",
                    "us": "Vidéo par drone, photographie professionnelle, annonces cartographiées",
                },
                {
                    "gap": "Immobilier et construction",
                    "them": "Agents et constructeurs sont des métiers séparés",
                    "us": "Une société qui courtise et qui bâtit — toute la chaîne de valeur",
                },
                {
                    "gap": "Documentation",
                    "them": "Accords verbaux, aucun reçu, litiges de titres",
                    "us": "Contrats numériques, suivi des coûts, vérification NLA",
                },
                {
                    "gap": "Suivi d’un prospect",
                    "them": "Prospects perdus, aucun système de relance",
                    "us": "Chaque contact suivi ; réponse sous deux heures",
                },
                {
                    "gap": "Informer les clients",
                    "them": "Presque aucun agent ne publie quoi que ce soit d’utile",
                    "us": "Visites de terrain hebdomadaires, données de marché, rénovations, témoignages",
                },
            ],
        },
    },
    "home/diaspora": {
        "rw": {
            "eyebrow": "Ku bo mu mahanga",
            "title": "Shora imari mu rugo",
            "accent": "utagombye kugaruka.",
            "body": (
                "Warumvise inkuru — amafaranga yoherejwe, umucuruzi agaceceka, ikibanza "
                "kigasanga ari icy’undi muntu. Uburyo bwacu bwose bw’abo mu mahanga twabwubatse "
                "dukuraho intera ituma ibyo bishoboka."
            ),
            "cta_label": "Fata ikiganiro cy’abo mu mahanga",
        },
        "fr": {
            "eyebrow": "Pour la diaspora",
            "title": "Investir au pays",
            "accent": "sans y retourner.",
            "body": (
                "Vous connaissez les histoires — acomptes versés, courtiers devenus muets, une "
                "parcelle qui appartenait à quelqu’un d’autre. Nous avons bâti tout notre "
                "processus diaspora pour supprimer la distance qui rend cela possible."
            ),
            "cta_label": "Réserver un briefing diaspora",
        },
    },
    "home/trust_points": {
        "rw": {
            "eyebrow": "Impamvu Evaramu",
            "title": "Mu Rwanda hari ibigo 204 byanditswe.",
            "accent": "Dore icyo dutandukaniyeho.",
            "body": "Ibyo twiyemeza bine kuri buri kazi, byanditse kugira ngo ubidusabe.",
            "items": [
                {
                    "title": "Buri mpapuro zigenzurwa muri NLA",
                    "description": (
                        "Nta gikorwa gikomeza hatabanje kuboneka icyemezo gisobanutse cy’Ikigo "
                        "cy’Igihugu gishinzwe Ubutaka. Twahitamo gutakaza isoko aho kuguha impaka."
                    ),
                    "icon": "ShieldCheck",
                },
                {
                    "title": "Buri masezerano yandikwa",
                    "description": (
                        "Amasezerano ya digitale, inyemezabwishyu no gukurikirana ikiguzi kuri "
                        "buri kazi. Nta masezerano yo mu kanwa gusa — imbere cyangwa hanze y’isosiyete."
                    ),
                    "icon": "FileCheck2",
                },
                {
                    "title": "Igisubizo mu masaha 2",
                    "description": (
                        "Umuvuduko ni wo dutandukaniraho. Abandi bamara iminsi batarasubiza; "
                        "twe dusubiza buri mukiriya ku munsi umwe w’akazi."
                    ),
                    "icon": "Timer",
                },
                {
                    "title": "Turaguma nyuma y’igurisha",
                    "description": (
                        "Ibigo byinshi bisoza bikabura. Twe twubaka, dushyiraho abakodesha, "
                        "ducunga kandi twongera gutangaza — umubano umara imyaka, atari ibyumweru."
                    ),
                    "icon": "HeartHandshake",
                },
            ],
        },
        "fr": {
            "eyebrow": "Pourquoi Evaramu",
            "title": "Il y a 204 agences enregistrées au Rwanda.",
            "accent": "Voici ce qui nous distingue.",
            "body": "Quatre engagements tenus sur chaque mission, écrits pour que vous puissiez nous y tenir.",
            "items": [
                {
                    "title": "Chaque titre vérifié à la NLA",
                    "description": (
                        "Aucune transaction n’avance sans confirmation claire de l’Autorité "
                        "Nationale des Terres. Nous préférons perdre une affaire que vous livrer un litige."
                    ),
                    "icon": "ShieldCheck",
                },
                {
                    "title": "Chaque opération documentée",
                    "description": (
                        "Contrats numériques, reçus et suivi des coûts sur chaque mission. "
                        "Aucun accord purement verbal — ni en interne, ni à l’extérieur."
                    ),
                    "icon": "FileCheck2",
                },
                {
                    "title": "Réponse sous 2 heures",
                    "description": (
                        "La réactivité est notre différence. Les concurrents mettent des jours "
                        "à rappeler ; nous répondons à chaque demande le jour ouvré même."
                    ),
                    "icon": "Timer",
                },
                {
                    "title": "Nous restons après la vente",
                    "description": (
                        "La plupart des agences concluent et disparaissent. Nous construisons, "
                        "louons, gérons et remettons en vente — la relation dure des années, pas des semaines."
                    ),
                    "icon": "HeartHandshake",
                },
            ],
        },
    },
    "home/construction": {
        "rw": {
            "eyebrow": "Evaramu Construction",
            "title": "Ibiciro bihamye, byanditse",
            "accent": "mbere yo gutangira.",
            "body": (
                "Kurenza ingengo y’imari mu bwubatsi ni cyo kibazo gikomeye muri uyu murimo. "
                "Tugicunga mu buryo bumwe bw’ukuri: amasezerano y’igiciro gihamye, ingoboka ya "
                "15% ivugwa ku mugaragaro igihe cyo gushyira umukono, n’urutonde rw’ikiguzi "
                "ushobora gufungura igihe cyose."
            ),
        },
        "fr": {
            "eyebrow": "Evaramu Construction",
            "title": "Des prix fixes, écrits",
            "accent": "avant de commencer.",
            "body": (
                "Le dépassement de coûts est le premier risque de ce métier. Nous le gérons de "
                "la seule façon honnête : un contrat à prix fixe, 15% d’imprévus annoncés "
                "ouvertement à la signature, et un tableau de coûts consultable à tout moment."
            ),
        },
    },
    "home/insights": {
        "rw": {
            "eyebrow": "Ubushishozi",
            "title": "Dutangaza ibyo",
            "accent": "tubona koko.",
            "body": (
                "Raporo z’isoko z’ukwezi, inyigisho ku bukungu n’isesengura ry’ikiguzi "
                "cy’ubwubatsi. Nta mucuruzi hafi mu Rwanda utangaza ikintu cy’ingirakamaro — "
                "tubifata nk’amahirwe."
            ),
        },
        "fr": {
            "eyebrow": "Analyses",
            "title": "Nous publions ce que nous",
            "accent": "observons réellement.",
            "body": (
                "Rapports de marché mensuels, éducation patrimoniale et décomposition des coûts "
                "de construction. Presque aucun agent au Rwanda ne publie quoi que ce soit "
                "d’utile — nous y voyons une opportunité."
            ),
        },
    },
    "home/testimonials": {
        "rw": {
            "eyebrow": "Inkuru z’abakiriya",
            "title": "Ibimenyetso si agatabo kacu.",
            "accent": "Ni imitungo yabo.",
        },
        "fr": {
            "eyebrow": "Témoignages clients",
            "title": "La preuve n’est pas notre brochure.",
            "accent": "C’est leur patrimoine.",
        },
    },
    # Items-only blocks. These feed `useBlockItems`, whose compiled fallbacks are
    # English by design — translating the rows here is what actually localises
    # the diaspora, hero and careers strips.
    "home/hero_marquee": {
        "rw": {
            "items": [
                "Buri mpapuro zigenzurwa mu Kigo cy’Igihugu gishinzwe Ubutaka",
                "Turacuruza kandi twubaka",
                "Igisubizo mu masaha abiri",
                "Raporo ku bo mu mahanga buri kwezi",
                "Komisiyo yumvikanwaho mu nyandiko",
            ]
        },
        "fr": {
            "items": [
                "Chaque titre vérifié auprès de l’Autorité Nationale des Terres",
                "Nous courtisons et nous bâtissons",
                "Réponse sous deux heures",
                "Rapport diaspora chaque mois",
                "Commission convenue par écrit",
            ]
        },
    },
    "home/hero_stats": {
        "rw": {
            "items": [
                {"value": "750+", "label": "Imitungo yanditse"},
                {"value": "20–50%", "label": "Agaciro kongewe n’ubwubatsi"},
                {"value": "100%", "label": "Impapuro zemejwe"},
            ]
        },
        "fr": {
            "items": [
                {"value": "750+", "label": "Biens catalogués"},
                {"value": "20–50%", "label": "Valeur ajoutée par la construction"},
                {"value": "100%", "label": "Titres vérifiés"},
            ]
        },
    },
    "home/diaspora_promises": {
        "rw": {
            "items": [
                {
                    "icon": "Video",
                    "title": "Ubona ikibanza mbere yo kwishyura",
                    "description": (
                        "Amashusho agenda ku mbibi UPI igaragara kuri ecran — si ifoto umuntu "
                        "yakoherereje."
                    ),
                },
                {
                    "icon": "FileCheck2",
                    "title": "Impapuro zigenzurwa mbere y’ubwishyu ubwo ari bwo bwose",
                    "description": (
                        "Ubushakashatsi kuri NLA bufite itariki itarenze iminsi 30, nyir’ubutaka "
                        "wanditse ahuzwa n’ugurisha."
                    ),
                },
                {
                    "icon": "Wallet",
                    "title": "Konti y’isosiyete, inyemezabwishyu uwo munsi",
                    "description": (
                        "Amafaranga ajya kuri konti y’isosiyete yanditse. Ntabwo ajya kuri "
                        "nimero ya mobile money y’umuntu ku giti cye."
                    ),
                },
                {
                    "icon": "Globe2",
                    "title": "Raporo y’ukwezi, aho uri hose",
                    "description": (
                        "Igitabo cy’ubwubatsi, amafoto, ubukode bwakusanyijwe n’ibyakoreshejwe "
                        "mu isanwa — ku itariki ya mbere ya buri kwezi."
                    ),
                },
            ]
        },
        "fr": {
            "items": [
                {
                    "icon": "Video",
                    "title": "Vous voyez la parcelle avant de payer",
                    "description": (
                        "Une vidéo longeant la limite avec l’UPI visible à l’écran — pas une "
                        "photo que quelqu’un vous a envoyée."
                    ),
                },
                {
                    "icon": "FileCheck2",
                    "title": "Titre vérifié avant tout acompte",
                    "description": (
                        "Une recherche de titre NLA datée de moins de 30 jours, avec le "
                        "propriétaire enregistré rapproché du vendeur."
                    ),
                },
                {
                    "icon": "Wallet",
                    "title": "Compte société, reçu le jour même",
                    "description": (
                        "Les fonds vont sur un compte société enregistré. Jamais sur un numéro "
                        "de mobile money individuel."
                    ),
                },
                {
                    "icon": "Globe2",
                    "title": "Rapport mensuel, où que vous soyez",
                    "description": (
                        "Journal de chantier, photos, loyers encaissés et dépenses d’entretien "
                        "— le premier de chaque mois."
                    ),
                },
            ]
        },
    },
    "home/join_benefits": {
        "rw": {
            "items": [
                {
                    "icon": "Banknote",
                    "title": "Komisiyo ya 5–10% kuri buri isoko",
                    "description": "Ihabwa igurisha rirangiye, yumvikanyweho mu nyandiko mbere yo gutangira.",
                },
                {
                    "icon": "BadgeCheck",
                    "title": "Ikirango gifungura imiryango",
                    "description": (
                        "Winjira uri Evaramu, atari umucuruzi utazwi. Byanditse, byemewe, "
                        "kandi byizewe."
                    ),
                },
                {
                    "icon": "GraduationCap",
                    "title": "Amahugurwa na CRM nyayo",
                    "description": (
                        "Kugenzura impapuro, kuganira ku giciro no gukurikirana — hiyongereyeho "
                        "uburyo butuma nta mukiriya azimira."
                    ),
                },
                {
                    "icon": "Users",
                    "title": "Abakiriya bava mu kwamamaza kwacu",
                    "description": (
                        "Ibyo dutangaza bizana ababaza buri munsi. Abakiriya bujuje ibisabwa "
                        "boherezwa ku bacuruzi."
                    ),
                },
            ]
        },
        "fr": {
            "items": [
                {
                    "icon": "Banknote",
                    "title": "5 à 10% de commission par transaction",
                    "description": "Payée à la conclusion, convenue par écrit avant de travailler un prospect.",
                },
                {
                    "icon": "BadgeCheck",
                    "title": "Une marque qui ouvre les portes",
                    "description": (
                        "Vous entrez en tant qu’Evaramu, pas en courtier inconnu. Documenté, "
                        "enregistré et reconnu."
                    ),
                },
                {
                    "icon": "GraduationCap",
                    "title": "Formation et un vrai CRM",
                    "description": (
                        "Vérification de titre, négociation et relance — plus un système pour "
                        "qu’aucun prospect ne refroidisse."
                    ),
                },
                {
                    "icon": "Users",
                    "title": "Des prospects issus de notre marketing",
                    "description": (
                        "Notre moteur de contenu génère des demandes chaque jour. Les prospects "
                        "qualifiés sont routés vers les agents."
                    ),
                },
            ]
        },
    },
    "home/seo": {
        "rw": {
            "title": "Evaramu Group Ltd — Imitungo, Ubwubatsi n’Ubukungu i Kigali",
            "body": (
                "Gura ubutaka n’imitungo byagenzuwe mu Rwanda, wubake n’ishami ryacu "
                "ry’ubwubatsi, winjize ubukode kandi uve ku mutungo umwe ugere ku myinshi. "
                "Buri mpapuro zigenzurwa muri NLA. Fata igihe cyo kuganira ku buntu."
            ),
        },
        "fr": {
            "title": "Evaramu Group Ltd — Immobilier, construction et patrimoine à Kigali",
            "body": (
                "Achetez des terrains et des biens vérifiés au Rwanda, construisez avec notre "
                "division construction, percevez des loyers et passez d’un bien à un "
                "portefeuille. Chaque titre vérifié à la NLA. Consultation gratuite."
            ),
        },
    },
}


CONTENT_BLOCKS.update({
    # ---------------- about ----------------
    "about/hero": {
        "rw": {
            "eyebrow": "Abo turi bo",
            "title": "Ntabwo turi abahuza b’ubucuruzi.",
            "accent": "Turi urwego rwubaka ubukungu.",
            "body": (
                "Evaramu Group Ltd ishakisha umutungo ukwiye, igafasha abakiriya kuwugura, "
                "ikawubaka cyangwa ikawuvugurura, ikawucunga, kandi igihe kigeze ikabafasha "
                "kuwugurisha no gushora bundi bushya. Umukiriya utangiye ku mutungo umwe "
                "ashobora kugera kuri ine cyangwa itanu mu myaka itatu."
            ),
        },
        "fr": {
            "eyebrow": "À propos",
            "title": "Nous ne sommes pas un courtier.",
            "accent": "Nous sommes une machine à bâtir du patrimoine.",
            "body": (
                "Evaramu Group Ltd trouve le bon bien, aide les clients à l’acheter, le "
                "construit ou le rénove, le gère, et le moment venu les aide à vendre et à "
                "réinvestir. Un client qui commence avec un bien peut raisonnablement en "
                "posséder quatre ou cinq en trois ans."
            ),
        },
    },
    "about/story": {
        "rw": {
            "eyebrow": "Abo turi bo",
            "title": "Abanyarwanda basanzwe bagomba gushobora",
            "accent": "kubaka ubukungu nyabwo binyuze ku mitungo.",
            "body": (
                "U Rwanda rukeneye amazu arenga 30,000 mashya buri mwaka, mu 2024 rwubatse "
                "13.8% by’ayo. Icyuho cy’igihugu kiri hejuru y’amazu 400,000 kandi kiriyongera "
                "buri mwaka. Ingo z’i Kigali ziteganyijwe kwikuba kabiri bigeze 2032."
            ),
        },
        "fr": {
            "eyebrow": "Qui nous sommes",
            "title": "Les Rwandais ordinaires devraient pouvoir",
            "accent": "bâtir un vrai patrimoine par l’immobilier.",
            "body": (
                "Le Rwanda a besoin de plus de 30 000 logements neufs par an et en a livré "
                "13,8% en 2024. Le déficit national dépasse 400 000 unités et se creuse chaque "
                "année. Le nombre de ménages de Kigali devrait doubler d’ici 2032."
            ),
        },
    },
    "about/group_structure": {
        "rw": {
            "eyebrow": "Imiterere y’ikigo",
            "title": "Ikigo gikuru gifite",
            "accent": "amashami abiri akora.",
            "body": (
                "Evaramu Group Ltd yanditswe nk’isosiyete yigenga mu Rwanda mu Kigo cy’Igihugu "
                "gishinzwe Iterambere (RDB). Andi mashami azongerwaho nk’ibigo bito bishamikiye "
                "ku kigo gikuru."
            ),
        },
        "fr": {
            "eyebrow": "Structure du groupe",
            "title": "Une société mère avec",
            "accent": "deux divisions actives.",
            "body": (
                "Evaramu Group Ltd est enregistrée comme société à responsabilité limitée au "
                "Rwanda auprès du Rwanda Development Board. De futures divisions seront ajoutées "
                "comme entités rattachées au groupe."
            ),
        },
    },
    "about/phased_execution": {
        "rw": {
            "eyebrow": "Gushyira mu bikorwa mu byiciro",
            "title": "Tangira uto. Ubake ukomeye.",
            "accent": "Buri cyiciro gitera inkunga igikurikira.",
            "body": (
                "Ntitwaguka kurusha uko kwizerwa kwacu bishobora kubyitwaramo. Dore aho turi "
                "n’aho tugana."
            ),
        },
        "fr": {
            "eyebrow": "Exécution par phases",
            "title": "Commencer petit. Bâtir solide.",
            "accent": "Chaque phase finance la suivante.",
            "body": (
                "Nous ne grandissons jamais plus vite que la confiance qui nous porte. Voici où "
                "nous en sommes et où nous allons."
            ),
        },
    },
    "about/team_intro": {
        "rw": {
            "eyebrow": "Ikipe",
            "title": "Bashyizwe ku byo bazi,",
            "accent": "atari ku byoroshye.",
            "body": (
                "Buri muntu hano ari ku mwanya we kubera icyo azi neza. Umuntu utari ku mwanya "
                "we yangiza amasezerano, izina n’umuco — ni yo mpamvu duhaka buhoro."
            ),
        },
        "fr": {
            "eyebrow": "L’équipe",
            "title": "Placés sur leurs forces,",
            "accent": "pas par commodité.",
            "body": (
                "Chaque personne ici occupe son poste pour ce qu’elle sait naturellement faire. "
                "La mauvaise personne au mauvais poste détruit des affaires, une réputation et "
                "une culture — alors nous recrutons lentement."
            ),
        },
    },
    "about/how_we_operate": {
        "rw": {
            "eyebrow": "Uko dukora",
            "title": "Ibyo twiyemeje bine",
            "accent": "tutajya duhindura.",
        },
        "fr": {
            "eyebrow": "Notre façon de travailler",
            "title": "Quatre engagements sur lesquels",
            "accent": "nous ne transigeons pas.",
        },
    },
    "about/seo": {
        "rw": {
            "title": "Ibyerekeye Evaramu Group Ltd — Imitungo n’Ubwubatsi i Kigali",
            "body": (
                "Evaramu Group Ltd ni isosiyete y’u Rwanda yanditswe ikora mu mitungo, "
                "ubwubatsi n’ubukungu bushingiye ku mitungo, ifite icyicaro i Kigali. Amashami "
                "abiri akora, inama y’ubuyobozi y’imbere, n’umuco ushingiye ku nyandiko n’umuvuduko."
            ),
        },
        "fr": {
            "title": "À propos d’Evaramu Group Ltd — Immobilier et construction à Kigali",
            "body": (
                "Evaramu Group Ltd est une société rwandaise enregistrée, active dans "
                "l’immobilier, la construction et le patrimoine immobilier, basée à Kigali. Deux "
                "divisions actives, un conseil interne, et une culture fondée sur la "
                "documentation et la réactivité."
            ),
        },
    },

    # ---------------- construction ----------------
    "construction/hero": {
        "rw": {
            "eyebrow": "Evaramu Construction",
            "title": "Igiciro gihamye, cyanditse",
            "accent": "mbere y’uko itafari rya mbere rishyirwaho.",
            "body": (
                "Isoko ry’u Rwanda ryuzuyemo abubatsi batazwi, amasezerano yo mu kanwa "
                "n’ibiciro bihinduka umaze kwiyemeza. Twe dukora ibinyuranye: urutonde "
                "rw’ibikoresho rufite igiciro, ingoboka ivuzwe ku mugaragaro, n’urutonde "
                "rw’ikiguzi ushobora gufungura igihe icyo ari cyo cyose."
            ),
        },
        "fr": {
            "eyebrow": "Evaramu Construction",
            "title": "Un prix fixe, écrit",
            "accent": "avant la pose du premier bloc.",
            "body": (
                "Le marché rwandais est plein d’entrepreneurs sans enseigne, de contrats verbaux "
                "et de devis qui bougent une fois que vous êtes engagé. Nous faisons l’inverse : "
                "un métré chiffré, une marge d’imprévus annoncée ouvertement, et un tableau de "
                "coûts consultable à tout moment."
            ),
        },
    },
    "construction/packages": {
        "rw": {
            "eyebrow": "Pake zo kurangiza",
            "title": "Ibyiciro bitatu.",
            "accent": "Nta cya kane gihishe.",
            "body": (
                "Hitamo urwego ruhuye n’icyo umutungo ugomba gukora. Ubwubatsi bwinshi "
                "bw’Uruziga rw’Ubukungu bugera kuri Premium, kuko ari yo miterere ikodeshwa "
                "neza kandi ikagurishwa neza."
            ),
        },
        "fr": {
            "eyebrow": "Formules de finition",
            "title": "Trois niveaux.",
            "accent": "Pas de quatrième caché.",
            "body": (
                "Choisissez le standard correspondant à ce que le bien doit faire. La plupart "
                "des chantiers du Cycle de Richesse s’arrêtent sur Premium, parce que c’est la "
                "spécification qui se loue bien et se vend bien."
            ),
        },
    },
    "construction/estimator": {
        "rw": {
            "eyebrow": "Igereranyo ry’ikiguzi",
            "title": "Ubwubatsi bwawe",
            "accent": "bwatwara angahe koko?",
            "body": (
                "Umubare wa mbere ushingiye kuri pake wahisemo hejuru. Igiciro nyacyo kizava ku "
                "gusura ikibanza no gupima ibikoresho — ariko ibi bikwereka niba uri mu rwego rukwiye."
            ),
        },
        "fr": {
            "eyebrow": "Estimation indicative",
            "title": "Combien coûterait",
            "accent": "réellement votre chantier ?",
            "body": (
                "Un premier chiffre basé sur la formule choisie ci-dessus. Le vrai devis vient "
                "après une visite du site et un métré — mais ceci vous dit si vous êtes dans la "
                "bonne fourchette."
            ),
        },
    },
    "construction/build_process": {
        "rw": {
            "eyebrow": "Uko bigenda",
            "title": "Intambwe esheshatu,",
            "accent": "nta gutungurwa.",
            "body": "Buri bwubatsi bukurikiza urutonde rumwe, kandi ubona urutonde rw’ikiguzi kuri buri ntambwe.",
        },
        "fr": {
            "eyebrow": "Comment ça marche",
            "title": "Six étapes,",
            "accent": "aucune surprise.",
            "body": "Chaque chantier suit la même séquence, et vous voyez le tableau de coûts à chacune.",
        },
    },
    "construction/process_intro": {
        "rw": {
            "eyebrow": "Uko umushinga ugenda",
            "title": "Intambwe esheshatu, kandi uzi",
            "accent": "aho ugeze muri zose.",
        },
        "fr": {
            "eyebrow": "Le déroulé d’un projet",
            "title": "Six étapes, et vous savez",
            "accent": "où vous en êtes à chacune.",
        },
    },
    "construction/renovation_services": {
        "rw": {
            "eyebrow": "Kuvugurura",
            "title": "Si buri mushinga",
            "accent": "utangirira ku butaka bwuzuye.",
            "body": "Inzu zitarangiye, amazu akodeshwa yashaje n’ubwubatsi bugeze hagati — bigezwa ku rwego ku giciro gihamye.",
        },
        "fr": {
            "eyebrow": "Rénovation",
            "title": "Tout projet ne part pas",
            "accent": "d’un terrain nu.",
            "body": "Gros œuvre, locations fatiguées et chantiers à moitié finis — remis à niveau à prix fixe.",
        },
    },
    "construction/renovation_intro": {
        "rw": {
            "eyebrow": "Kuvugurura n’imirimo mito",
            "title": "Si buri mushinga ari",
            "accent": "ubwubatsi bushya.",
            "body": (
                "Ibyinshi dukora ni ukurangiza icyo undi yatangiye, cyangwa kuzamura umutungo "
                "uriho ukagera ku rwego rutuma ukodeshwa. Ibiciro biri hasi ni intangiriro "
                "isanzwe, si igiciro ntakuka."
            ),
        },
        "fr": {
            "eyebrow": "Rénovation et petits travaux",
            "title": "Tout projet n’est pas",
            "accent": "une construction neuve.",
            "body": (
                "L’essentiel de notre travail consiste à finir ce que quelqu’un d’autre a "
                "commencé, ou à porter un bien existant au niveau qui permet de le louer. Les "
                "prix ci-dessous sont des points de départ typiques, pas des devis."
            ),
        },
    },
    "construction/seo": {
        "rw": {
            "title": "Ubwubatsi no Kuvugurura i Kigali — Pake z’igiciro gihamye",
            "body": (
                "Evaramu Construction yubaka kandi ivugurura i Kigali ku masezerano y’igiciro "
                "gihamye n’ingoboka ya 15% ivuzwe mbere. Pake za Standard, Premium na Luxury, "
                "raporo y’ikiguzi buri cyumweru n’ubugenzuzi bwa kure ku bakiriya bo mu mahanga."
            ),
        },
        "fr": {
            "title": "Construction et rénovation à Kigali — Formules à prix fixe",
            "body": (
                "Evaramu Construction bâtit et rénove à Kigali sur contrats à prix fixe avec 15% "
                "d’imprévus annoncés d’emblée. Formules Standard, Premium et Luxury, reporting "
                "hebdomadaire des coûts et supervision à distance pour la diaspora."
            ),
        },
    },

    # ---------------- sell ----------------
    "sell/hero": {
        "rw": {
            "eyebrow": "Gurisha na Evaramu",
            "title": "Umutungo wawe ukwiye kuruta",
            "accent": "ifoto itagaragara neza mu itsinda rya WhatsApp.",
            "body": (
                "Tubwire ibiwerekeyeho hano hasi maze mu masaha abiri y’akazi tuzagusubiza "
                "duhaye gahunda yo gusuzuma agaciro. Nta mafaranga yo gutangaza, nta masezerano "
                "agufunga, kandi komisiyo yumvikanwaho mu nyandiko mbere y’uko ikintu cyose gitangira."
            ),
        },
        "fr": {
            "eyebrow": "Vendre avec Evaramu",
            "title": "Votre bien mérite mieux qu’une",
            "accent": "photo floue dans un groupe WhatsApp.",
            "body": (
                "Parlez-nous-en ci-dessous et nous revenons vers vous sous deux heures ouvrées "
                "avec un rendez-vous d’évaluation. Aucun frais de publication, aucun piège "
                "d’exclusivité, et une commission convenue par écrit avant tout début."
            ),
        },
    },
    "sell/why_list": {
        "rw": {
            "eyebrow": "Impamvu wadutangariza",
            "title": "Ubunyamwuga ni bwo",
            "accent": "butandukanya byose.",
            "body": (
                "Mu Rwanda hari abahuza batemewe barenga 200. Icyo hafi ya bose badatanga ni "
                "inyandiko, kwamamaza bikora, n’umuguzi wagenzuwe koko."
            ),
        },
        "fr": {
            "eyebrow": "Pourquoi passer par nous",
            "title": "Le professionnalisme est",
            "accent": "toute la différence.",
            "body": (
                "Il y a plus de 200 courtiers informels au Rwanda. Ce que presque aucun n’offre : "
                "de la documentation, un marketing qui fonctionne et un acheteur réellement qualifié."
            ),
        },
    },
    "sell/list_form": {
        "rw": {
            "eyebrow": "Tangaza umutungo wawe",
            "title": "Tubwire ibiwurebana.",
            "accent": "Ibisigaye tubikora.",
            "body": (
                "Ifishi ihinduka hakurikijwe icyo utangaza — ikibanza cy’amashyamba kibaza ku "
                "bihingwa, inyubako y’apartema ikabaza ku mazu n’ubukode. Ubona gusa ibibazo bikureba."
            ),
        },
        "fr": {
            "eyebrow": "Publier votre bien",
            "title": "Parlez-nous-en.",
            "accent": "Nous faisons le reste.",
            "body": (
                "Le formulaire s’adapte à ce que vous publiez — une parcelle boisée pose des "
                "questions sur le couvert, un immeuble sur les logements et les loyers. Vous ne "
                "voyez que les questions qui vous concernent."
            ),
        },
    },
    "sell/after_submit": {
        "rw": {
            "eyebrow": "Nyuma yo kohereza",
            "title": "Icyo kibaho koko",
            "accent": "nyuma.",
        },
        "fr": {
            "eyebrow": "Après l’envoi",
            "title": "Ce qui se passe",
            "accent": "ensuite.",
        },
    },
    "sell/seo": {
        "rw": {
            "title": "Gurisha cyangwa Utangaze Umutungo wawe mu Rwanda",
            "body": (
                "Tangaza ubutaka, inzu cyangwa inyubako y’ubucuruzi kuri Evaramu. Isuzuma "
                "ry’agaciro ku buntu, amashusho ya drone n’amafoto y’umwuga birimo, abaguzi "
                "bagenzurwa mbere yo gusura, na komisiyo yumvikanwaho mu nyandiko mbere yo gutangira."
            ),
        },
        "fr": {
            "title": "Vendre ou publier votre bien au Rwanda",
            "body": (
                "Publiez votre terrain, maison ou local commercial avec Evaramu. Évaluation "
                "gratuite, vidéo par drone et photographie professionnelle incluses, acheteurs "
                "qualifiés avant visite, commission convenue par écrit avant de commencer."
            ),
        },
    },

    # ---------------- join ----------------
    "join/hero": {
        "rw": {
            "eyebrow": "Injira mu kigo",
            "title": "Zana abo uzi mu kigo",
            "accent": "gifite uburyo bukomeye inyuma.",
            "body": (
                "Mu Rwanda hari abahuza batemewe barenga 200 bafite ubumenyi nyabwo bw’aho "
                "batuye ariko nta kintu kibashyigikiye — nta kirango, nta nyandiko, nta "
                "kwamamaza, nta buryo bwo gukurikirana. Niba ari wowe, iri ni ryo sezerano."
            ),
        },
        "fr": {
            "eyebrow": "Rejoindre l’agence",
            "title": "Apportez votre réseau à une société",
            "accent": "avec de vrais systèmes derrière.",
            "body": (
                "Il y a plus de 200 courtiers informels au Rwanda, avec une vraie connaissance "
                "du terrain et rien derrière eux — pas de marque, pas de documentation, pas de "
                "marketing, pas de système de relance. Si c’est vous, voici l’offre."
            ),
        },
    },
    "join/roles": {
        "rw": {
            "eyebrow": "Uburyo bune bwo kwinjira",
            "title": "Hitamo ubwo",
            "accent": "bugusobanura.",
            "body": (
                "Duhaka kandi dufatanya hashingiwe ku byo umuntu azi, atari ku byoroshye. "
                "Umuntu utari ku mwanya we yangiza amasezerano, izina n’umuco — ni yo mpamvu "
                "tugaragaza neza icyo buri bumwe busaba."
            ),
        },
        "fr": {
            "eyebrow": "Quatre façons d’entrer",
            "title": "Choisissez celle qui",
            "accent": "vous décrit.",
            "body": (
                "Nous recrutons et nous associons sur les forces, pas par commodité. La mauvaise "
                "personne au mauvais poste détruit des affaires, une réputation et une culture — "
                "alors nous sommes précis sur ce que chacune implique."
            ),
        },
    },
    "join/calculator": {
        "rw": {
            "eyebrow": "Kubara komisiyo",
            "title": "Umwaka mwiza",
            "accent": "wakwinjiza angahe?",
            "body": (
                "Nyereza utubariro ugereranyije n’ukuri kwawe. Ibi bishingira kuri komisiyo "
                "y’ikigo igera kuri 3% by’agaciro k’igurisha, muri yo ugafata umugabane wawe "
                "wumvikanyweho."
            ),
        },
        "fr": {
            "eyebrow": "Calculateur de commission",
            "title": "Que pourrait rapporter",
            "accent": "une bonne année ?",
            "body": (
                "Déplacez les curseurs selon votre réalité. Le modèle part d’une commission "
                "d’agence d’environ 3% de la valeur de la transaction, dont vous prenez la part "
                "convenue."
            ),
        },
    },
    "join/colleagues": {
        "rw": {
            "eyebrow": "Bagenzi bawe",
            "title": "Ikipe nto.",
            "accent": "Buri wese afite icyo ashinzwe.",
            "body": (
                "Ntiwabura mu nzego. Buri wese muri aba ayobora umurimo kuva ku ntangiriro "
                "kugeza ku iherezo kandi akawutangaho raporo mu nama y’ukwezi."
            ),
        },
        "fr": {
            "eyebrow": "Vos collègues",
            "title": "Petite équipe.",
            "accent": "Chacun est responsable de quelque chose.",
            "body": (
                "Vous ne seriez pas perdu dans une hiérarchie. Chacune de ces personnes pilote "
                "une fonction de bout en bout et en rend compte au conseil mensuel."
            ),
        },
    },
    "join/seo": {
        "rw": {
            "title": "Injira muri Evaramu — Akazi, Abacuruzi n’Abubatsi mu Rwanda",
            "body": (
                "Injira muri Evaramu Group Ltd nk’umucuruzi uhembwa komisiyo, umufatanyabikorwa "
                "wigenga, umwubatsi wagenzuwe cyangwa umukozi wa buri munsi. Komisiyo ya 5–10%, "
                "kwamamaza nyakuri inyuma yawe, n’ubwishyu bukurikije gahunda yanditse."
            ),
        },
        "fr": {
            "title": "Rejoindre Evaramu — Carrières, agents, courtiers et artisans au Rwanda",
            "body": (
                "Rejoignez Evaramu Group Ltd comme agent commissionné, courtier partenaire "
                "indépendant, sous-traitant vérifié ou membre de l’équipe à plein temps. 5 à 10% "
                "de commission, un vrai marketing derrière vous, et un paiement selon un "
                "calendrier documenté."
            ),
        },
    },

    # ---------------- services ----------------
    "services/hero": {
        "rw": {
            "eyebrow": "Icyo dukora",
            "title": "Serivisi esheshatu.",
            "accent": "Isosiyete imwe iri inyuma yazo zose.",
            "body": (
                "Ibigo byinshi bihuza abaguzi n’abagurisha gusa. Abubatsi benshi bubaka gusa. "
                "Nta n’umwe ucunga ibyo yakugurishije. Evaramu Realty na Evaramu Construction "
                "biri mu isosiyete imwe, ni yo mpamvu dushobora kongera agaciro k’umutungo "
                "aho kuwucuruza gusa."
            ),
        },
        "fr": {
            "eyebrow": "Ce que nous faisons",
            "title": "Six services.",
            "accent": "Une seule société derrière tous.",
            "body": (
                "La plupart des agences courtisent. La plupart des constructeurs construisent. "
                "Personne ne gère ce qu’il vous a vendu. Evaramu Realty et Evaramu Construction "
                "appartiennent à la même société, c’est pourquoi nous pouvons créer de la valeur "
                "sur un bien au lieu de simplement le transiger."
            ),
        },
    },
    "services/value_chain": {
        "rw": {
            "eyebrow": "Urunigi rwose rw’agaciro",
            "title": "Wubushake. Wugure. Wubake.",
            "accent": "Wukodeshe. Wugurishe. Usubiremo.",
            "body": (
                "Buri kimwe muri ibi gikora ku giti cyacyo. Byose hamwe ni Uruziga "
                "rw’Ubukungu — ni yo mpamvu yonyine umukiriya wacu ashobora kuva ku mutungo "
                "umwe akagera kuri ine mu myaka itatu."
            ),
        },
        "fr": {
            "eyebrow": "Toute la chaîne de valeur",
            "title": "Trouver. Acheter. Construire.",
            "accent": "Louer. Vendre. Recommencer.",
            "body": (
                "Chacun de ces services fonctionne seul. Ensemble, ils forment le Cycle de "
                "Richesse — la seule raison pour laquelle un de nos clients peut passer d’un "
                "bien à quatre en trois ans."
            ),
        },
    },
    "services/remote_reporting": {
        "rw": {
            "eyebrow": "Raporo ya kure",
            "title": "Ibigera kuri imeyili yawe",
            "accent": "buri kwezi.",
            "body": (
                "Abanyarwanda bo mu mahanga ni bo bafitanye serivisi nke mu Rwanda kubera ko "
                "intera ituma kubazwa biba amahitamo. Twaravanyeho ayo mahitamo."
            ),
        },
        "fr": {
            "eyebrow": "Reporting à distance",
            "title": "Ce qui arrive dans votre boîte",
            "accent": "chaque mois.",
            "body": (
                "La diaspora est le segment le plus mal servi au Rwanda précisément parce que "
                "la distance rend la reddition de comptes facultative. Nous avons supprimé ce choix."
            ),
        },
    },
    "services/seo": {
        "rw": {
            "title": "Serivisi zacu — Imitungo, Ubwubatsi no Gucunga mu Rwanda",
            "body": (
                "Gura umutungo wagenzuwe, ugurishe hakoreshejwe kwamamaza kwiza, wubake "
                "ku giciro gihamye, tugucungire ubukode, cyangwa ushore uri mu mahanga ufite "
                "raporo yuzuye. Isosiyete imwe ku runigi rwose rw’agaciro."
            ),
        },
        "fr": {
            "title": "Nos services — Immobilier, construction et gestion au Rwanda",
            "body": (
                "Achetez un bien vérifié, vendez avec une vraie commercialisation, construisez "
                "à prix fixe, confiez-nous la gestion de vos locations, ou investissez depuis "
                "l’étranger avec un reporting complet. Une société sur toute la chaîne de valeur."
            ),
        },
    },

    # ---------------- wealth cycle ----------------
    "wealth-cycle/hero": {
        "rw": {
            "eyebrow": "Uburyo bwacu bwihariye",
            "title": "Ibigo byinshi bisoza igurisha bikabura.",
            "accent": "Twe turaguma.",
            "body": (
                "Uruziga rw’Ubukungu ni yo mpamvu abakiriya bagaruka kuri twe ku mutungo wabo "
                "wa kabiri, uwa gatatu n’uwa kane. Turawushaka, tukagufasha kuwugura, "
                "kuwubakaho, kuwukodesha, tukakubwira igihe cyo kugurisha — hanyuma amafaranga "
                "akongera gukora."
            ),
        },
        "fr": {
            "eyebrow": "Notre modèle signature",
            "title": "La plupart des agences concluent puis disparaissent.",
            "accent": "Nous restons.",
            "body": (
                "Le Cycle de Richesse explique pourquoi nos clients reviennent pour leur "
                "deuxième, troisième et quatrième bien. Nous le trouvons, vous aidons à "
                "l’acheter, à construire, à le louer, vous disons quand vendre — puis remettons "
                "le produit au travail."
            ),
        },
    },
    "wealth-cycle/model": {
        "rw": {
            "eyebrow": "Uburyo",
            "title": "Intambwe esheshatu, kandi turi",
            "accent": "kumwe nawe muri zose.",
            "body": (
                "Buri ntambwe yubaka iyikurikira. Usimbutse imwe uruziga ruracyakora — "
                "ruragenda gahoro gusa."
            ),
        },
        "fr": {
            "eyebrow": "Le modèle",
            "title": "Six étapes, et nous sommes",
            "accent": "à vos côtés sur toutes.",
            "body": (
                "Chaque étape alimente la suivante. Sautez-en une et le cycle fonctionne "
                "encore — simplement plus lentement."
            ),
        },
    },
    "wealth-cycle/calculator": {
        "rw": {
            "eyebrow": "Bara imibare yawe",
            "title": "Imari yawe yaba",
            "accent": "iki?",
            "body": (
                "Nyereza utubariro. Uyu ni urugero rushingiye ku byo dukoresha mu nama yo "
                "gutegura — izamuka ry’agaciro riva ku bwubatsi rya 35%, izamuka ry’ubutaka "
                "rya 16% ku mwaka, n’ubukode buri hafi 9% by’agaciro."
            ),
        },
        "fr": {
            "eyebrow": "Faites vos propres calculs",
            "title": "Que pourrait devenir",
            "accent": "votre capital ?",
            "body": (
                "Déplacez les curseurs. Modèle indicatif bâti sur les hypothèses que nous "
                "utilisons en séance de planification — une plus-value de construction d’environ "
                "35%, une appréciation de 16% par an sur le corridor, et un loyer autour de 9% "
                "de la valeur."
            ),
        },
    },
    "wealth-cycle/seo": {
        "rw": {
            "title": "Uruziga rw’Ubukungu rwa Evaramu — Kuva ku Mutungo Umwe",
            "body": (
                "Kugura, kubaka, kwinjiza, kugurisha, gushora, gusubiramo. Uburyo bwuzuye "
                "bw’intambwe esheshatu Evaramu ikoresha ivana umukiriya ku mutungo umwe "
                "ikamugeza kuri ine cyangwa itanu mu myaka itatu — imibare yose iri ahagaragara."
            ),
        },
        "fr": {
            "title": "Le Cycle de Richesse Evaramu — D’un bien à un portefeuille",
            "body": (
                "Acheter, construire, percevoir, vendre, réinvestir, recommencer. Le modèle "
                "complet en six étapes qu’Evaramu utilise pour faire passer un client d’un bien "
                "à quatre ou cinq en trois ans — avec toute l’arithmétique publiée."
            ),
        },
    },

    # ---------------- consultation ----------------
    "consultation/hero": {
        "rw": {
            "eyebrow": "Fata igihe cyo kuganira",
            "title": "Iminota mirongo itatu, n’",
            "accent": "igisubizo cy’ukuri.",
            "body": (
                "Tubwire ingengo y’imari yawe n’icyo ushaka kugeraho. Tuzakubwira mu buryo "
                "bweruye niba dushobora kugufasha, igiciro nyacyo byatwara, n’igihe bizamara. "
                "Nta gitutu, nta nshingano."
            ),
        },
        "fr": {
            "eyebrow": "Réserver une consultation",
            "title": "Trente minutes, et une",
            "accent": "réponse honnête.",
            "body": (
                "Dites-nous votre budget et votre objectif. Nous vous dirons clairement si nous "
                "pouvons vous aider, ce que cela coûterait réellement et combien de temps cela "
                "prendrait. Sans pression, sans engagement."
            ),
        },
    },
    "consultation/what_to_expect": {
        "rw": {
            "eyebrow": "Icyo witega",
            "title": "Nta kwamamaza.",
            "accent": "Isuzuma gusa.",
            "body": (
                "Twahitamo kukubwira ukuri ko iki atari cyo gihe, aho kukunyuza mu nzira "
                "itakaza amafaranga yawe n’izina ryacu."
            ),
        },
        "fr": {
            "eyebrow": "À quoi s’attendre",
            "title": "Aucun argumentaire de vente.",
            "accent": "Juste une évaluation.",
            "body": (
                "Nous préférons vous dire honnêtement que ce n’est pas le bon moment plutôt que "
                "de vous engager dans un processus qui gaspille votre argent et notre réputation."
            ),
        },
    },
    "consultation/seo": {
        "rw": {
            "title": "Fata igihe cyo kuganira — Evaramu Group Ltd",
            "body": (
                "Fata igihe cyo kuganira ku buntu na Evaramu i Kigali: ikiganiro cya mbere, "
                "gusura umutungo, inama yo gutegura Uruziga rw’Ubukungu, inama ku bwubatsi "
                "cyangwa ikiganiro ku ishoramari ry’abo mu mahanga. Hitamo itariki n’isaha ikubereye."
            ),
        },
        "fr": {
            "title": "Réserver une consultation — Evaramu Group Ltd",
            "body": (
                "Réservez une consultation gratuite avec Evaramu à Kigali : appel découverte, "
                "visite de bien, séance de planification du Cycle de Richesse, consultation "
                "construction ou briefing investissement diaspora. Choisissez la date et l’heure "
                "qui vous conviennent."
            ),
        },
    },

    # ---------------- contact ----------------
    "contact/hero": {
        "rw": {
            "eyebrow": "Twandikire",
            "title": "Buri kibazo gisubizwa",
            "accent": "mu masaha abiri.",
            "body": (
                "Si isezerano ryanditse ku kibaho — ni itegeko dupima. Waba ugura ikibanza "
                "cyawe cya mbere, ugurisha umutungo w’umuryango cyangwa wubaka uri mu mahanga, "
                "tubwire icyo ukeneye maze umuntu ushobora kugufasha akwandikire uyu munsi."
            ),
        },
        "fr": {
            "eyebrow": "Nous contacter",
            "title": "Chaque demande traitée",
            "accent": "en moins de deux heures.",
            "body": (
                "Pas une promesse sur une affiche — une règle que nous mesurons. Que vous "
                "achetiez votre première parcelle, vendiez un bien familial ou construisiez "
                "depuis l’étranger, dites-nous ce dont vous avez besoin et quelqu’un qui peut "
                "réellement vous aider vous répondra aujourd’hui."
            ),
        },
    },
    "contact/send_message": {
        "rw": {
            "eyebrow": "Ohereza ubutumwa",
            "title": "Tubwire icyo",
            "accent": "ushaka gukora.",
            "body": (
                "Uko usobanura neza, ni ko igisubizo cyacu cya mbere kizagira akamaro. Ingengo "
                "y’imari n’igihe ni byo bidufasha cyane."
            ),
        },
        "fr": {
            "eyebrow": "Envoyer un message",
            "title": "Dites-nous ce que vous",
            "accent": "cherchez à faire.",
            "body": (
                "Plus vous êtes précis, plus notre première réponse sera utile. Le budget et le "
                "calendrier nous aident le plus."
            ),
        },
    },
    "contact/seo": {
        "rw": {
            "title": "Twandikire Evaramu Group Ltd — Kigali, u Rwanda",
            "body": (
                "Vugana na Evaramu Group Ltd ku bijyanye no kugura, kugurisha, kubaka cyangwa "
                "gucunga imitungo mu Rwanda. WhatsApp, telefoni, imeyili cyangwa usure ibiro "
                "byacu i Kimihurura. Buri kibazo gisubizwa mu masaha abiri y’akazi."
            ),
        },
        "fr": {
            "title": "Contacter Evaramu Group Ltd — Kigali, Rwanda",
            "body": (
                "Parlez à Evaramu Group Ltd d’achat, de vente, de construction ou de gestion "
                "immobilière au Rwanda. WhatsApp, téléphone, e-mail ou visite à notre bureau de "
                "Kimihurura. Chaque demande traitée en deux heures ouvrées."
            ),
        },
    },

    # ---------------- team ----------------
    "team/hero": {
        "rw": {
            "title": "Ikipe nto.",
            "accent": "Buri wese afite icyo ashinzwe.",
            "body": (
                "Duhaka buhoro kandi dushyira abantu ku byo bazi, atari ku byoroshye. Nta "
                "n’umwe uhishwe mu nzego — buri wese muri aba ayobora umurimo kuva ku ntangiriro "
                "kugeza ku iherezo kandi akawutangaho raporo mu nama y’inama y’ubuyobozi y’ukwezi."
            ),
        },
        "fr": {
            "title": "Petite équipe.",
            "accent": "Chacun est responsable de quelque chose.",
            "body": (
                "Nous recrutons lentement et plaçons les gens sur leurs forces, pas par "
                "commodité. Personne n’est enfoui dans une hiérarchie — chacune de ces personnes "
                "pilote une fonction de bout en bout et en rend compte au conseil mensuel."
            ),
        },
    },
    "team/how_we_hire": {
        "rw": {
            "eyebrow": "Uko duhaka",
            "title": "Duhaka buhoro.",
            "accent": "Dusezerera vuba.",
            "body": (
                "Si uko tubikunda, ahubwo ni uko mu bucuruzi bwubakiye ku kwizerana, umuntu "
                "umwe utari ku mwanya we ahenda buri wese."
            ),
        },
        "fr": {
            "eyebrow": "Comment nous recrutons",
            "title": "Recruter lentement.",
            "accent": "Se séparer vite.",
            "body": (
                "Non par plaisir, mais parce que dans un métier entièrement bâti sur la "
                "confiance, une personne au mauvais poste coûte à tout le monde."
            ),
        },
    },
    "team/seo": {
        "rw": {
            "title": "Ikipe Yacu — Abantu bari inyuma ya Evaramu",
            "body": (
                "Menya ikipe ya Evaramu Group Ltd i Kigali: abajyanama ku mitungo, abashinzwe "
                "abo mu mahanga, abagenzuzi b’ubwubatsi, abashinzwe impapuro n’imari. Buri wese "
                "ayobora umurimo kuva ku ntangiriro kugeza ku iherezo."
            ),
        },
        "fr": {
            "title": "Notre équipe — Les personnes derrière Evaramu",
            "body": (
                "Rencontrez l’équipe d’Evaramu Group Ltd à Kigali : consultants immobiliers, "
                "relations diaspora, superviseurs de chantier, officiers fonciers et finance. "
                "Chacun pilote une fonction de bout en bout."
            ),
        },
    },

    # ---------------- insights, properties, property detail ----------------
    "insights/hero": {
        "rw": {
            "eyebrow": "Ubushishozi",
            "title": "Nta mucuruzi hafi mu Rwanda",
            "accent": "utangaza ikintu cy’ingirakamaro.",
            "body": (
                "Tubifata nk’amahirwe. Raporo z’isoko z’ukwezi, inyigisho ku bukungu, ikiguzi "
                "cy’ubwubatsi n’ubuyobozi bw’ukuri ku bagura bari mu mahanga — byanditswe "
                "n’abantu bakora ayo masoko."
            ),
        },
        "fr": {
            "eyebrow": "Analyses",
            "title": "Presque aucun agent au Rwanda",
            "accent": "ne publie quoi que ce soit d’utile.",
            "body": (
                "Nous y voyons une opportunité. Rapports de marché mensuels, éducation "
                "patrimoniale, coûts de construction et guides honnêtes pour acheter depuis "
                "l’étranger — écrits par ceux qui font réellement les transactions."
            ),
        },
    },
    "insights/seo": {
        "rw": {
            "title": "Ubushishozi na Raporo z’Isoko — Imitungo mu Rwanda",
            "body": (
                "Raporo ku biciro by’ubutaka i Kigali, isesengura ry’inyungu z’ubukode, "
                "ikiguzi cy’ubwubatsi n’ubuyobozi bufatika ku bagura bo mu mahanga. Bitangazwa "
                "buri kwezi na Evaramu Group Ltd."
            ),
        },
        "fr": {
            "title": "Analyses et rapports de marché — Immobilier au Rwanda",
            "body": (
                "Rapports sur les prix du foncier à Kigali, analyse des rendements locatifs, "
                "décomposition des coûts de construction et guides pratiques pour les acheteurs "
                "de la diaspora. Publiés chaque mois par Evaramu Group Ltd."
            ),
        },
    },
    "properties/seo": {
        "rw": {
            "title": "Imitungo Igurishwa n’Ikodeshwa mu Rwanda",
            "body": (
                "Reba ubutaka, amazu, apartema n’inyubako z’ubucuruzi byagenzuwe i Kigali no mu "
                "Rwanda hose. Buri tangazo rigenzurwa hakurikijwe UPI yaryo mu Kigo cy’Igihugu "
                "gishinzwe Ubutaka mbere yo gushyirwa ahagaragara."
            ),
        },
        "fr": {
            "title": "Biens à vendre et à louer au Rwanda",
            "body": (
                "Parcourez terrains, maisons, appartements et locaux commerciaux vérifiés à "
                "Kigali et dans tout le Rwanda. Chaque annonce est contrôlée via son UPI auprès "
                "de l’Autorité Nationale des Terres avant publication."
            ),
        },
    },
    "property-detail/related": {
        "rw": {
            "eyebrow": "Wanashimishwa na",
            "title": "Imitungo isa",
            "accent": "ikwiye kurebwa.",
        },
        "fr": {
            "eyebrow": "Vous pourriez aussi aimer",
            "title": "Des biens similaires",
            "accent": "à considérer.",
        },
    },
})

# `wealth-cycle/worked_example` and `worked_example_intro` carry the same copy.
CONTENT_BLOCKS["wealth-cycle/worked_example"] = {
    "rw": {
        "eyebrow": "Urugendo nyarwo rw’umukiriya",
        "title": "Miliyoni 8 z’amanyarwanda zizigamye.",
        "accent": "Imitungo itatu ku mwaka wa 3.",
        "body": (
            "Uru ni urugero rwuzuye ruvuye muri gahunda yacu y’ubucuruzi, rutangajwe rwose. "
            "Buri mubare ni uwo twabonye koko, si iteganyagihe twahimbye rigenewe agatabo."
        ),
    },
    "fr": {
        "eyebrow": "Un parcours client réel",
        "title": "8 millions RWF d’épargne.",
        "accent": "Trois biens à l’année 3.",
        "body": (
            "Voici l’exemple chiffré de notre plan d’affaires, publié intégralement. Chaque "
            "chiffre en est un que nous avons réellement observé, pas une projection inventée "
            "pour une brochure."
        ),
    },
}
CONTENT_BLOCKS["wealth-cycle/worked_example_intro"] = CONTENT_BLOCKS["wealth-cycle/worked_example"]


# `home/trust` and `home/why_gaps` carry byte-identical item lists to the two
# blocks above. Aliased rather than duplicated so a copy fix cannot drift apart.
CONTENT_BLOCKS["home/trust"] = {
    locale: {"items": fields["items"]}
    for locale, fields in CONTENT_BLOCKS["home/trust_points"].items()
}
CONTENT_BLOCKS["home/why_gaps"] = {
    locale: {"items": fields["items"]}
    for locale, fields in CONTENT_BLOCKS["home/why"].items()
}


# ------------------------------------------------------------------------ faqs
# Keyed by the English question, which is what the seeder matches on.
#
# Covers the `home` page set. The other seven pages (sell, construction,
# consultation, join, services, wealth-cycle, contact) are still English-only —
# add them here and re-run the seeder, no code change needed.
FAQS = {
    "How do you verify that a property title is clean?": {
        "rw": {
            "question": "Mugenzura mute ko impapuro z’umutungo zitagira ikibazo?",
            "answer": (
                "Buri kibanza dushyira ku rubuga kigenzurwa mu Kigo cy’Igihugu gishinzwe "
                "Ubutaka hakurikijwe UPI yacyo mbere y’uko kigaragara. Twemeza nyir’ubutaka "
                "wanditse, ubwoko bw’uburenganzira, ingano y’ikibanza n’imyenda iyo ari yo "
                "yose. Iyo impapuro zifite ikibazo, itangazo ntirishyirwa ahagaragara."
            ),
        },
        "fr": {
            "question": "Comment vérifiez-vous qu’un titre de propriété est sain ?",
            "answer": (
                "Chaque parcelle que nous publions est contrôlée auprès de l’Autorité "
                "Nationale des Terres via son UPI avant d’apparaître sur la plateforme. "
                "Nous confirmons le propriétaire enregistré, le type de tenure, la "
                "superficie et d’éventuelles charges. Si le titre n’est pas sain, "
                "l’annonce n’est pas publiée."
            ),
        },
    },
    "What is the Wealth Cycle, in plain terms?": {
        "rw": {
            "question": "Uruziga rw’Ubukungu ni iki, mu magambo yoroshye?",
            "answer": (
                "Ni isezerano ryacu ryo kuguma tuli kumwe nyuma y’igurisha. Tugufasha kugura "
                "umutungo wa mbere ukwiye, kuwubaka cyangwa kuwuvugurura kugira ngo agaciro "
                "kiyongere, gushyiraho abakodesha kugira ngo winjize, kugutera inkunga ku "
                "gihe cyo kugurisha, hanyuma amafaranga akashorwa mu bindi bibiri cyangwa bitatu."
            ),
        },
        "fr": {
            "question": "Qu’est-ce que le Cycle de Richesse, en termes simples ?",
            "answer": (
                "C’est notre engagement à rester à vos côtés après la vente. Nous vous aidons "
                "à acheter le bon premier bien, à le construire ou le rénover pour en élever "
                "la valeur, à y placer des locataires pour qu’il rapporte, à choisir le moment "
                "de vendre, puis à réinvestir le produit dans deux ou trois autres."
            ),
        },
    },
    "Can I buy from abroad without travelling to Rwanda?": {
        "rw": {
            "question": "Nshobora kugura ndi mu mahanga ntaje mu Rwanda?",
            "answer": (
                "Yego. Ubona amashusho agenda mu mutungo UPI igaragara, kugenzura impapuro "
                "muri NLA ku giti cyacyo mbere y’ubwishyu ubwo ari bwo bwose, amasezerano ya "
                "digitale ushobora gushyiraho umukono aho uri hose, na raporo z’amafoto buri "
                "kwezi mu gihe cyose cy’ubwubatsi."
            ),
        },
        "fr": {
            "question": "Puis-je acheter depuis l’étranger sans venir au Rwanda ?",
            "answer": (
                "Oui. Vous recevez des visites vidéo avec l’UPI visible, une vérification "
                "indépendante du titre auprès de la NLA avant tout acompte, des contrats "
                "numériques signables de partout, et un rapport photo mensuel pendant toute "
                "la durée d’un chantier."
            ),
        },
    },
    "How much does your construction division charge?": {
        "rw": {
            "question": "Ishami ryanyu ry’ubwubatsi risaba angahe?",
            "answer": (
                "Ibyiciro bitatu by’ibiciro bihamye: Standard Finish uhereye kuri RWF "
                "320,000/m², Premium Finish uhereye kuri RWF 520,000/m² na Luxury Finish "
                "uhereye kuri RWF 850,000/m². Buri masezerano avuga ku mugaragaro ingoboka "
                "ya 15% igihe cyo gushyira umukono."
            ),
        },
        "fr": {
            "question": "Combien facture votre division construction ?",
            "answer": (
                "Trois tranches à prix fixe : Standard Finish à partir de 320 000 RWF/m², "
                "Premium Finish à partir de 520 000 RWF/m² et Luxury Finish à partir de "
                "850 000 RWF/m². Chaque contrat mentionne ouvertement 15% d’imprévus à la "
                "signature."
            ),
        },
    },
    "What commission do you charge to sell my property?": {
        "rw": {
            "question": "Mufata komisiyo ingana iki mu kugurisha umutungo wanjye?",
            "answer": (
                "Komisiyo yumvikanwaho mu nyandiko mbere y’uko akazi katangira, kandi "
                "iboneka gusa iyo igurisha ryarangiye. Gusura no gusuzuma agaciro, uburyo "
                "bwo gushyiraho igiciro, amafoto y’umwuga n’amashusho ya drone byose birimo."
            ),
        },
        "fr": {
            "question": "Quelle commission prenez-vous pour vendre mon bien ?",
            "answer": (
                "La commission est convenue par écrit avant tout travail, et n’est due qu’à "
                "la conclusion de la vente. La visite d’évaluation, la stratégie de prix, la "
                "photographie professionnelle et la vidéo par drone sont toutes incluses."
            ),
        },
    },
    "Do you manage properties after the purchase?": {
        "rw": {
            "question": "Muracunga imitungo nyuma yo kuyigura?",
            "answer": (
                "Yego. Amafaranga yo gucunga ni 10% by’ubukode bwakusanyijwe, bityo twinjiza "
                "gusa iyo umutungo wawe winjije. Ibyo birimo gushaka no gusuzuma abakodesha, "
                "gukusanya ubukode, guhuza isanwa na raporo y’ukwezi."
            ),
        },
        "fr": {
            "question": "Gérez-vous les biens après l’achat ?",
            "answer": (
                "Oui. Nos honoraires de gestion sont de 10% des loyers encaissés : nous ne "
                "gagnons que lorsque votre bien gagne. Cela couvre la recherche et la "
                "sélection des locataires, l’encaissement des loyers, la coordination de "
                "l’entretien et un relevé mensuel."
            ),
        },
    },
}


# `sell/intro` and `sell/hero` are the same copy in two places on the page.
CONTENT_BLOCKS["sell/intro"] = CONTENT_BLOCKS["sell/hero"]

# ---- items-only blocks: the repeating card lists -------------------------------
CONTENT_BLOCKS.update({
    "about/divisions": {
        "rw": {"items": [
            {"name": "Evaramu Realty", "status": "Ishami rya 1 · Rirakora", "icon": "Home",
             "focus": "Guhuza abaguzi n’abagurisha, kugurisha, gukodesha, serivisi z’abo mu mahanga n’Uruziga rw’Ubukungu.", "active": True},
            {"name": "Evaramu Construction", "status": "Ishami rya 2 · Rirakora", "icon": "HardHat",
             "focus": "Kuvugurura, kurangiza, ubwubatsi bugenzurwa no gucunga ibibanza.", "active": True},
            {"name": "Evaramu Technologies", "status": "Ishami rya 3 · Icyiciro cya 3", "icon": "LayoutGrid",
             "focus": "Urubuga rwa PropTech, amatangazo, dashboards z’abakiriya n’ibikoresho bya AI.", "active": False},
            {"name": "Evaramu Capital", "status": "Ishami rya 4 · Icyiciro cya 4", "icon": "Wallet",
             "focus": "Ikigega cy’ishoramari mu mitungo, ubufatanye no gucunga imitungo.", "active": False},
        ]},
        "fr": {"items": [
            {"name": "Evaramu Realty", "status": "Division 1 · Active", "icon": "Home",
             "focus": "Courtage, ventes, locations, services diaspora et Cycle de Richesse.", "active": True},
            {"name": "Evaramu Construction", "status": "Division 2 · Active", "icon": "HardHat",
             "focus": "Rénovation, finition, chantiers supervisés et gestion de site.", "active": True},
            {"name": "Evaramu Technologies", "status": "Division 3 · Phase 3", "icon": "LayoutGrid",
             "focus": "Plateforme PropTech, annonces, tableaux de bord clients et outils IA.", "active": False},
            {"name": "Evaramu Capital", "status": "Division 4 · Phase 4", "icon": "Wallet",
             "focus": "Fonds d’investissement immobilier, syndications et gestion de portefeuille.", "active": False},
        ]},
    },
    "about/governance": {
        "rw": {"items": [
            {"role": "Perezida / Umwe mu bashinze", "responsibility": "Ashyiraho icyerekezo, afite gahunda, afata ibyemezo bikomeye."},
            {"role": "Umuyobozi Mukuru", "responsibility": "Imirimo ya buri munsi, gucunga ikipe, gusoza amasezerano, kubazwa inyungu."},
            {"role": "Umuyobozi w’Imitungo", "responsibility": "Ayobora Evaramu Realty — amatangazo, amasezerano, abakiriya bo mu mahanga."},
            {"role": "Umuyobozi w’Ubwubatsi", "responsibility": "Ayobora Evaramu Construction — imishinga, abubatsi, ubuziranenge ku kibanza."},
            {"role": "Umuyobozi w’Imari", "responsibility": "Amafaranga ainjira, fagitire, ingengo y’imari, komisiyo na raporo z’imari."},
            {"role": "Umujyanama utari mu buyobozi", "responsibility": "Ijwi rivuye hanze, kumenyekanisha no kugira inama ku byemezo bikomeye."},
        ]},
        "fr": {"items": [
            {"role": "Président / Cofondateur", "responsibility": "Définit la vision, porte la stratégie, autorité finale sur les décisions majeures."},
            {"role": "Directeur général", "responsibility": "Opérations quotidiennes, gestion d’équipe, exécution des transactions, compte de résultat."},
            {"role": "Directeur de l’immobilier", "responsibility": "Dirige Evaramu Realty — annonces, transactions, clients diaspora, cycle immobilier."},
            {"role": "Directeur de la construction", "responsibility": "Dirige Evaramu Construction — projets, entrepreneurs, qualité de chantier."},
            {"role": "Directeur financier", "responsibility": "Trésorerie, facturation, budgets, commissions et reporting financier."},
            {"role": "Conseiller non exécutif", "responsibility": "Regard extérieur, mises en relation et conseil sur les décisions majeures."},
        ]},
    },
    "about/timeline": {
        "rw": {"items": [
            {"period": "Amezi 1–3", "title": "Kwiyandikisha, kubaka, gushaka ikipe",
             "outcome": "Isosiyete yanditswe muri RDB. Ikirango cyatangiye. Imitungo mirongo itanu yanditswe.", "done": True},
            {"period": "Amezi 4–9", "title": "Amasezerano ya mbere n’ubwubatsi bwa mbere",
             "outcome": "Amasezerano 10+ yasojwe. Imishinga 3–5 yo kuvugurura yarangiye. Abakiriya ba mbere b’Uruziga.", "done": True},
            {"period": "Amezi 10–24", "title": "Ikirango n’urubuga rw’ikoranabuhanga",
             "outcome": "Urubuga rw’amatangazo rurakora. Dashboards ku bo mu mahanga. Amazu 15+ acungwa.", "done": False},
            {"period": "Umwaka wa 3", "title": "Uyoboye isoko ryo hagati i Kigali",
             "outcome": "Umushinga wa mbere w’amazu menshi uri kubakwa. Kwaguka mu Ntara y’Iburasirazuba.", "done": False},
        ]},
        "fr": {"items": [
            {"period": "Mois 1–3", "title": "Enregistrer, bâtir, constituer l’équipe",
             "outcome": "Société enregistrée au RDB. Marque en ligne. Cinquante biens catalogués.", "done": True},
            {"period": "Mois 4–9", "title": "Premières transactions et premiers chantiers",
             "outcome": "Plus de 10 transactions conclues. 3–5 rénovations livrées. Premiers clients du Cycle.", "done": True},
            {"period": "Mois 10–24", "title": "Marque et plateforme technologique",
             "outcome": "Plateforme d’annonces en ligne. Tableaux de bord diaspora. Plus de 15 logements gérés.", "done": False},
            {"period": "Année 3", "title": "Leader du milieu de marché à Kigali",
             "outcome": "Premier développement multi-logements en construction. Expansion dans la Province de l’Est.", "done": False},
        ]},
    },
    "join/culture_rules": {
        "rw": {"items": [
            {"title": "Buri masezerano yandikwa", "body": "Nta masezerano yo mu kanwa gusa, imbere cyangwa hanze y’isosiyete. Icyo kutanditse ntabwo cyabaye."},
            {"title": "Umuvuduko ni wo dutandukaniraho", "body": "Buri mukiriya asubizwa mu masaha abiri. Abandi bamara iminsi — icyo cyuho ni cyo mbaraga zacu kandi turakirinda."},
            {"title": "Nta wuhisha ikibazo", "body": "Amakuru mabi asangizwa ako kanya kugira ngo akemuke. Guhisha ikibazo ni cyo kintu kimwe kidashobora kubabarirwa hano."},
            {"title": "Kwizerwa n’umukiriya ni cyo tugurisha", "body": "Buri wese arakirinda cyangwa akagenda. Isezerano rimwe ribi ryangiza izina ryatwaye imyaka kubakwa."},
            {"title": "Ibyagezweho biruta uburambe", "body": "Igitekerezo cyiza gitsinda uwo ari we wese wagitanze."},
        ]},
        "fr": {"items": [
            {"title": "Chaque affaire est documentée", "body": "Aucun accord purement verbal, en interne comme à l’extérieur. Si ce n’est pas écrit, cela n’a pas eu lieu."},
            {"title": "La réactivité est notre différence", "body": "Chaque prospect reçoit une réponse sous deux heures. Les concurrents mettent des jours — cet écart est notre avantage et nous le protégeons."},
            {"title": "Personne ne cache un problème", "body": "Une mauvaise nouvelle se partage immédiatement pour être corrigée. Cacher un problème est la seule chose vraiment impardonnable ici."},
            {"title": "La confiance du client est le produit", "body": "Chaque membre de l’équipe la protège, ou s’en va. Une seule mauvaise affaire abîme une marque bâtie en des années."},
            {"title": "Les résultats avant l’ancienneté", "body": "La meilleure idée l’emporte, quel que soit celui qui l’a proposée."},
        ]},
    },
    "not-found/suggestions": {
        "rw": {"items": [
            {"to": "/properties", "icon": "Search", "title": "Reba imitungo",
             "description": "Ubutaka, amazu n’inyubako z’ubucuruzi byagenzuwe mu Rwanda hose"},
            {"to": "/wealth-cycle", "icon": "RefreshCw", "title": "Uruziga rw’Ubukungu",
             "description": "Uko umutungo umwe uba ine cyangwa itanu mu myaka itatu"},
            {"to": "/construction", "icon": "HardHat", "title": "Pake z’ubwubatsi",
             "description": "Standard, Premium na Luxury ku biciro bihamye"},
            {"to": "/consultation", "icon": "Compass", "title": "Fata igihe cyo kuganira",
             "description": "Ikiganiro cy’iminota 30 ku buntu cyo kureba icyashoboka"},
        ]},
        "fr": {"items": [
            {"to": "/properties", "icon": "Search", "title": "Parcourir les biens",
             "description": "Terrains, maisons et locaux commerciaux vérifiés dans tout le Rwanda"},
            {"to": "/wealth-cycle", "icon": "RefreshCw", "title": "Le Cycle de Richesse",
             "description": "Comment un bien en devient quatre ou cinq en trois ans"},
            {"to": "/construction", "icon": "HardHat", "title": "Formules de construction",
             "description": "Finitions Standard, Premium et Luxury à prix fixe"},
            {"to": "/consultation", "icon": "Compass", "title": "Réserver une consultation",
             "description": "Un appel gratuit de 30 minutes pour cerner ce qui est réalisable"},
        ]},
    },
    "sell/steps": {
        "rw": {"items": [
            {"id": "type", "title": "Ubwoko bw’umutungo", "description": "Utangaza iki?"},
            {"id": "parcel", "title": "Amakuru y’ikibanza", "description": "UPI n’aho giherereye"},
            {"id": "spec", "title": "Ibiranga", "description": "Ibisobanuro by’uyu mutungo"},
            {"id": "price", "title": "Igiciro n’amashusho", "description": "Icyo uwushakaho"},
            {"id": "contact", "title": "Amakuru yawe", "description": "Uko twakugeraho"},
        ]},
        "fr": {"items": [
            {"id": "type", "title": "Type de bien", "description": "Que publiez-vous ?"},
            {"id": "parcel", "title": "Détails de la parcelle", "description": "UPI et localisation"},
            {"id": "spec", "title": "Caractéristiques", "description": "Les spécificités de ce bien"},
            {"id": "price", "title": "Prix et médias", "description": "Ce que vous en attendez"},
            {"id": "contact", "title": "Vos coordonnées", "description": "Comment vous joindre"},
        ]},
    },
    "sell/why_list_items": {
        "rw": {"items": [
            {"icon": "Camera", "title": "Kwamamazwa uko bikwiye",
             "body": "Amashusho ya drone, amafoto y’umwuga n’itangazo rifite ikarita — aho kuba amafoto ya telefoni mu itsinda rya WhatsApp."},
            {"icon": "ShieldCheck", "title": "Abaguzi bagenzurwa mbere",
             "body": "Turareba ko umuguzi ashobora kwishyura mbere yo kugera ku mutungo wawe. Isura nke, ariko nziza."},
            {"icon": "FileCheck2", "title": "Byanditse kuva ku ntangiriro",
             "body": "Amasezerano ya digitale, inyemezabwishyu kuri buri bwishyu, n’inyandiko ya buri cyifuzo. Nta masezerano yo mu kanwa, nta mpaka."},
            {"icon": "Handshake", "title": "Komisiyo mu nyandiko",
             "body": "Yumvikanwaho mbere y’uko akazi gatangira kandi ihabwa gusa iyo igurisha ryarangiye."},
        ]},
        "fr": {"items": [
            {"icon": "Camera", "title": "Commercialisé correctement",
             "body": "Vidéo par drone, photographie professionnelle et annonce cartographiée — au lieu de clichés de téléphone dans un groupe WhatsApp."},
            {"icon": "ShieldCheck", "title": "Acheteurs qualifiés d’abord",
             "body": "Nous vérifions qu’un acheteur peut réellement financer l’achat avant qu’il ne mette un pied chez vous. Moins de visites, de meilleure qualité."},
            {"icon": "FileCheck2", "title": "Documenté de bout en bout",
             "body": "Contrats numériques, reçus pour chaque paiement et trace écrite de chaque offre. Pas d’accords verbaux, pas de litiges."},
            {"icon": "Handshake", "title": "Commission par écrit",
             "body": "Convenue avant tout travail et due uniquement à la conclusion de la vente."},
        ]},
    },
    "services/management_includes": {
        "rw": {"items": [
            {"title": "Gushaka no gusuzuma abakodesha",
             "body": "Twamamaza inzu, tugasuzuma abasaba kandi tukareba ko bashobora kuyishyura. Abakiriya b’ibigo na ONG barashakishwa ku bushake — basinya igihe kirekire kandi bakishyura ku gihe."},
            {"title": "Gukusanya ubukode n’imyenda",
             "body": "Bukusanywa ku gihe bukoherezwa. Iyo umukodesha atinze, turabikurikirana — ni cyo amafaranga yacu akora."},
            {"title": "Guhuza isanwa",
             "body": "Ishami ryacu ry’ubwubatsi rikora isanwa ku kiguzi nyacyo, ku buryo igisenge kivamo amazi kidahinduka ibiganiro by’ibyumweru bitatu n’umuntu utazwi."},
            {"title": "Ibigenzurwa na raporo z’imiterere",
             "body": "Ibigenzurwa bifite amafoto hagati y’abakodesha, ku buryo ingwate ziganirwaho hashingiwe ku bimenyetso."},
        ]},
        "fr": {"items": [
            {"title": "Recherche et sélection des locataires",
             "body": "Nous commercialisons le logement, examinons les candidats et vérifions qu’ils peuvent réellement payer. Les entreprises et ONG sont ciblées délibérément — elles signent plus longtemps et paient à temps."},
            {"title": "Encaissement des loyers et impayés",
             "body": "Encaissés dans les délais et reversés. Si un locataire prend du retard, nous le relançons — c’est à cela que servent nos honoraires."},
            {"title": "Coordination de l’entretien",
             "body": "Notre division construction réalise les réparations à prix coûtant, pour qu’une toiture qui fuit ne devienne pas trois semaines de négociation avec un inconnu."},
            {"title": "Inspections et états des lieux",
             "body": "Inspections photographiées entre deux locations, pour que les cautions se discutent sur preuves."},
        ]},
    },
})
