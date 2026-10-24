/**
 * Reisetasche - Inventar & Standard-Checks
 * Enthält deine persönlichen Packgegenstände, Mengenkalkulationen und Routinen.
 */

const INVENTORY = {
  // 1. BASIS-INVENTAR (Immer relevant)
  basic: {
    essentiell: [
      { id: 'b_wasser', name: 'Wasser', category: 'Essentiell', packed: false, worn: false, defaultQty: 1 },
      { id: 'b_essen', name: 'Essen / Wegzehrung', category: 'Essentiell', packed: false, worn: false, defaultQty: 1 },
      { id: 'b_besteck', name: 'Besteck', category: 'Essentiell', packed: false, worn: false, defaultQty: 1 }
    ],
    dokumente: [
      { id: 'b_ausweis', name: 'Ausweis / Reisepass', category: 'Dokumente', packed: false, worn: true, defaultQty: 1, note: 'Gültigkeit prüfen' },
      { id: 'b_fuehrerschein', name: 'Führerschein', category: 'Dokumente', packed: false, worn: true, defaultQty: 1 },
      { id: 'b_schluessel', name: 'Schlüssel', category: 'Dokumente', packed: false, worn: true, defaultQty: 1 },
      { id: 'b_kreditkarte', name: 'Kreditkarte / Geldbeutel', category: 'Dokumente', packed: false, worn: true, defaultQty: 1 }
    ],
    kleidung_static: [
      { id: 'b_schlappen', name: 'Schlappen / Flip-Flops', category: 'Kleidung', packed: false, worn: false, defaultQty: 1 },
      { id: 'b_brille', name: '(Sonnen-)Brille', category: 'Kleidung', packed: false, worn: true, defaultQty: 1 },
      { id: 'b_kopfbedeckung', name: 'Kopfbedeckung (Cap / Mütze)', category: 'Kleidung', packed: false, worn: false, defaultQty: 1 },
      { id: 'b_tuch', name: 'Multifunktionstuch', category: 'Kleidung', packed: false, worn: false, defaultQty: 1 },
      { id: 'b_regenjacke', name: 'Regenjacke', category: 'Kleidung', packed: false, worn: false, defaultQty: 1 }
    ],
    hygiene: [
      { id: 'h_desinfektion', name: 'Desinfektionsmittel', category: 'Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'h_zahnpasta', name: 'Zahnpasta', category: 'Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'h_zahnbuerste', name: 'Zahnbürste', category: 'Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'h_nagelset', name: 'Nagel-Set', category: 'Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'h_sonnencreme', name: 'Sonnencreme', category: 'Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'h_jojobaoel', name: 'Jojobaöl', category: 'Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'h_deo', name: 'Deo', category: 'Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'h_mundwasser', name: 'Mundwasser / Kaugummi', category: 'Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'h_ketozolin', name: 'Ketozolin', category: 'Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'h_creme', name: 'Creme', category: 'Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'h_tuecher', name: 'Tücher', category: 'Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'h_lippenbalsam', name: 'Lippenbalsam', category: 'Hygiene', packed: false, worn: false, defaultQty: 1 }
    ],
    elektronik: [
      { id: 'e_netzteil', name: 'Netzteil', category: 'Elektronik', packed: false, worn: false, defaultQty: 1 },
      { id: 'e_typc', name: 'Typ-C Kabel', category: 'Elektronik', packed: false, worn: false, defaultQty: 1 },
      { id: 'e_smartphone', name: 'Smartphone', category: 'Elektronik', packed: false, worn: true, defaultQty: 1 },
      { id: 'e_kopfhoerer', name: 'Kopfhörer', category: 'Elektronik', packed: false, worn: true, defaultQty: 1 }
    ],
    sonstiges: [
      { id: 's_kaffee', name: 'Kaffee Setup', category: 'Sonstiges', packed: false, worn: false, defaultQty: 1 },
      { id: 's_adapter', name: 'Reise-Adapter', category: 'Sonstiges', packed: false, worn: false, defaultQty: 1 },
      { id: 's_schlafmaske', name: 'Schlafmaske', category: 'Sonstiges', packed: false, worn: false, defaultQty: 1 },
      { id: 's_ebook', name: 'E-Book Reader', category: 'Sonstiges', packed: false, worn: false, defaultQty: 1 }
    ]
  },

  // 2. SPEZIELLE MODULE / BEDINGUNGEN
  modules: {
    kalt: [
      { id: 'm_thermowaesche', name: 'Thermowäsche', category: 'Kleidung (Kalt)', packed: false, worn: false, defaultQty: 1 },
      { id: 'm_warmejacke', name: 'Warme Jacke', category: 'Kleidung (Kalt)', packed: false, worn: false, defaultQty: 1 }
    ],
    schwimmen: [
      { id: 'm_badehose', name: 'Badehose', category: 'Kleidung (Schwimmen)', packed: false, worn: false, defaultQty: 1 }
    ],
    wandern_abenteuer: [
      { id: 'a_trailmix', name: 'Trail-Mix / Gummibärchen', category: 'Verpflegung', packed: false, worn: false, defaultQty: 1 },
      { id: 'a_elektrolyte', name: 'Elektrolyte', category: 'Verpflegung', packed: false, worn: false, defaultQty: 1 },
      { id: 'a_moskito', name: 'Moskitospray', category: 'Outdoor Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'a_feuchttuecher', name: 'Feuchttücher', category: 'Outdoor Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'a_zeckenhebel', name: 'Zeckenhebel', category: 'Outdoor Hygiene', packed: false, worn: false, defaultQty: 1 },
      { id: 'a_sunhoody', name: 'Sun Hoody', category: 'Kleidung (Outdoor)', packed: false, worn: false, defaultQty: 1 }
    ],
    uebernachtung: [
      { id: 'u_zelt_haengematte', name: 'Hängematte / Zelt', category: 'Übernachtung', packed: false, worn: false, defaultQty: 1 },
      { id: 'u_isomatte', name: 'Iso-Matte', category: 'Übernachtung', packed: false, worn: false, defaultQty: 1 },
      { id: 'u_schlafsack', name: 'Schlafsack', category: 'Übernachtung', packed: false, worn: false, defaultQty: 1 },
      { id: 'u_faltmatte', name: 'Faltbare Isomatte', category: 'Übernachtung', packed: false, worn: false, defaultQty: 1 }
    ],
    camping_sonstiges: [
      { id: 'c_kocher', name: 'Campingkocher (inkl. Topf etc.)', category: 'Camping & Werkzeug', packed: false, worn: false, defaultQty: 1 },
      { id: 'c_spanngurte', name: 'Spanngurte', category: 'Camping & Werkzeug', packed: false, worn: false, defaultQty: 2 },
      { id: 'c_muellbeutel', name: 'Müllbeutel', category: 'Camping & Werkzeug', packed: false, worn: false, defaultQty: 2 },
      { id: 'c_taschenmesser', name: 'Taschenmesser', category: 'Camping & Werkzeug', packed: false, worn: false, defaultQty: 1 },
      { id: 'c_panzertape', name: 'Panzertape', category: 'Camping & Werkzeug', packed: false, worn: false, defaultQty: 1 }
    ],
    fahrrad: [
      { id: 'f_multitool', name: 'Multitool', category: 'Fahrrad / Bikepacking', packed: false, worn: false, defaultQty: 1 },
      { id: 'f_tuch', name: 'Putztuch / Lappen', category: 'Fahrrad / Bikepacking', packed: false, worn: false, defaultQty: 1 },
      { id: 'f_patchkit', name: 'Patch-Kit (Flickzeug)', category: 'Fahrrad / Bikepacking', packed: false, worn: false, defaultQty: 1 },
      { id: 'f_reifenheber', name: 'Reifenheber', category: 'Fahrrad / Bikepacking', packed: false, worn: false, defaultQty: 2 },
      { id: 'f_radlerhose', name: 'Radlerhose', category: 'Fahrrad / Bikepacking', packed: false, worn: false, defaultQty: 1 },
      { id: 'f_licht', name: 'Fahrradlicht (vorne & hinten)', category: 'Fahrrad / Bikepacking', packed: false, worn: false, defaultQty: 1 },
      { id: 'f_antischeuer', name: 'Anti-Scheuer-Creme', category: 'Fahrrad / Bikepacking', packed: false, worn: false, defaultQty: 1 },
      { id: 'f_schnellebrille', name: 'Schnelle Brille', category: 'Fahrrad / Bikepacking', packed: false, worn: true, defaultQty: 1 }
    ],
    motorrad: [
      { id: 'mot_jacke', name: 'Motorradjacke', category: 'Motorrad', packed: false, worn: true, defaultQty: 1 },
      { id: 'mot_nierengurt', name: 'Nierengurt', category: 'Motorrad', packed: false, worn: true, defaultQty: 1 },
      { id: 'mot_festehose', name: 'Feste Hose / Motorradhose', category: 'Motorrad', packed: false, worn: true, defaultQty: 1 }
    ],
    ideen: [
      { id: 'id_kanu', name: 'Kanu Equipment', category: 'Idee & Wasser', packed: false, worn: false, defaultQty: 1 },
      { id: 'id_wasserfilter', name: 'Wasserfilter + Wasserteststreifen', category: 'Idee & Wasser', packed: false, worn: false, defaultQty: 1 }
    ]
  },

  // 3. PRE-TRIP CHECKS & ROUTINEN
  checks: {
    wandern: [
      { id: 'cw_route', text: 'Route bestimmen (Startpunkt, Schlafplatz, Rückreise)', checked: false, note: 'Ggf. Offline-Karten laden' },
      { id: 'cw_tasche', text: 'Tasche packen -> alles laden', checked: false, note: 'Powerbank & Geräte zu 100%' },
      { id: 'cw_besorgungen', text: 'Vor-Ort-Besorgungen planen', checked: false, note: 'Gaskartusche, Proviant etc.' },
      { id: 'cw_wetter', text: 'Wetter vor Ort final prüfen', checked: false, note: 'Regenrisiko, Temperatursturz' }
    ],
    fahrrad: [
      { id: 'cf_carbloading', text: 'Carbloading: Tage vorher Carbs, Morgens Porridge, unterwegs Gummibärchen & viel Carbs (Brot, Riegel), abends ausgewogen', checked: false, badge: 'Ernährung' },
      { id: 'cf_wasser', text: 'Wasser-Setup: 1:1 mit Apfelsaft & pro 0,5l eine Prise Salz (STATT Elektrolyte)', checked: false, badge: 'DIY-Isodrink' },
      { id: 'cf_druck', text: 'Luftdruck: Vorne 4 bar / Hinten 5 bar', checked: false, badge: 'Hardware' },
      { id: 'cf_route', text: 'Route bestimmen mit bikerouter.de & Import zu OsmAnd', checked: false, badge: 'Navigation' },
      { id: 'cf_kette', text: 'Kette reinigen und schmieren', checked: false, badge: 'Wartung' },
      { id: 'cf_schrauben', text: 'Schrauben nachziehen', checked: false, badge: 'Sicherheit' }
    ],
    home_door: [
      { id: 'ch_fenster', text: 'Fenster geschlossen & verriegelt', checked: false },
      { id: 'ch_herd', text: 'Herd & elektronische Geräte ausgeschaltet', checked: false },
      { id: 'ch_muell', text: 'Müll entsorgt & Kühlschrank geprüft', checked: false },
      { id: 'ch_wasser', text: 'Wasserhahn & Heizung kontrolliert', checked: false },
      { id: 'cd_schluessel', text: 'Schlüssel im Gepäck / an Mann', checked: false, highlight: true },
      { id: 'cd_phone', text: 'Smartphone & Ladekabel', checked: false, highlight: true },
      { id: 'cd_karten', text: 'Geldbeutel / Kreditkarten / Bargeld', checked: false, highlight: true },
      { id: 'cd_ausweis', text: 'Ausweis / Tickets / PNR griffbereit', checked: false, highlight: true }
    ]
  },

  // 4. GENERIERUNGS-LOGIK
  calculateClothing(days = 3, canWash = false) {
    // Minimalistische Faustformel:
    // Wenn waschbar: max. 3 Sets (1 am Körper, 2 im Gepäck)
    // Wenn nicht waschbar: Tage + 1 Puffer (max 7)
    let qty = canWash ? Math.min(days, 3) : Math.min(days + 1, 8);
    return [
      { id: 'b_unterwaesche', name: 'Unterwäsche (Sets)', category: 'Kleidung', packed: false, worn: true, defaultQty: qty, note: canWash ? 'Wäscheoption aktiv (rotieren)' : 'Frisch für jeden Tag' },
      { id: 'b_socken', name: 'Socken (Paare)', category: 'Kleidung', packed: false, worn: true, defaultQty: qty },
      { id: 'b_tshirts', name: 'T-Shirts / Shirts', category: 'Kleidung', packed: false, worn: true, defaultQty: qty }
    ];
  },

  generateDefaultTrip(title = 'Spanien Wandertrip', destination = 'Spanien', days = 5, activity = 'wandern', canWash = false, isCold = false, isSwim = false) {
    const items = [];

    // Basis Essentiell
    INVENTORY.basic.essentiell.forEach(i => items.push({ ...i }));
    INVENTORY.basic.dokumente.forEach(i => items.push({ ...i }));
    INVENTORY.basic.kleidung_static.forEach(i => items.push({ ...i }));
    INVENTORY.calculateClothing(days, canWash).forEach(i => items.push({ ...i }));
    INVENTORY.basic.hygiene.forEach(i => items.push({ ...i }));
    INVENTORY.basic.elektronik.forEach(i => items.push({ ...i }));
    INVENTORY.basic.sonstiges.forEach(i => items.push({ ...i }));

    // Konditionelle Module
    if (isCold) {
      INVENTORY.modules.kalt.forEach(i => items.push({ ...i }));
    }
    if (isSwim) {
      INVENTORY.modules.schwimmen.forEach(i => items.push({ ...i }));
    }

    // Aktivitäts-Module
    if (activity === 'wandern' || activity === 'abenteuer') {
      INVENTORY.modules.wandern_abenteuer.forEach(i => items.push({ ...i }));
      INVENTORY.modules.uebernachtung.forEach(i => items.push({ ...i }));
      INVENTORY.modules.camping_sonstiges.forEach(i => items.push({ ...i }));
    } else if (activity === 'fahrrad') {
      INVENTORY.modules.fahrrad.forEach(i => items.push({ ...i }));
      INVENTORY.modules.uebernachtung.forEach(i => items.push({ ...i }));
      INVENTORY.modules.camping_sonstiges.forEach(i => items.push({ ...i }));
    } else if (activity === 'motorrad') {
      INVENTORY.modules.motorrad.forEach(i => items.push({ ...i }));
    }

    // Default Checks für diesen Trip
    const activeChecks = [];
    if (activity === 'wandern') {
      INVENTORY.checks.wandern.forEach(c => activeChecks.push({ ...c, category: 'Wandern' }));
    } else if (activity === 'fahrrad') {
      INVENTORY.checks.fahrrad.forEach(c => activeChecks.push({ ...c, category: 'Fahrrad & Ernährung' }));
    }
    INVENTORY.checks.home_door.forEach(c => activeChecks.push({ ...c, category: 'Vor Abreise / Wohnung' }));

    return {
      id: 'trip_' + Date.now(),
      title: title || `${days} Tage ${destination} ${activity}`,
      destination: destination || 'Spanien',
      days: days || 5,
      activity: activity || 'wandern',
      canWash: canWash,
      isCold: isCold,
      isSwim: isSwim,
      createdAt: new Date().toISOString(),
      items: items,
      shoppingList: [
        { id: 'shop_1', name: 'Gaskartusche vor Ort kaufen (Schraubventil)', checked: false },
        { id: 'shop_2', name: '5L Trinkwasser-Kanister am Supermarkt', checked: false }
      ],
      checks: activeChecks,
      booking: {
        pnr: 'XR94KL',
        transportType: 'Flug',
        details: 'Hinflug: 08:45 Uhr -> 11:20 Uhr Madrid (MAD)',
        notes: 'Handgepäck 8kg, Maße 55x40x20'
      }
    };
  }
};

window.INVENTORY = INVENTORY;
