/**
 * Reisetasche - Smart Parser
 * 1. TripParser: Erkennt Reisedauer, Zielort, Aktivität und Parameter aus natürlicher Sprache.
 * 2. BookingParser: Extrahiert PNR, Flugnummern, Abflugzeiten und Bahndaten aus Mail-Kopien.
 */

const TripParser = {
  // Liste gängiger Reiseziele zur präzisen Erkennung
  knownDestinations: [
    'Spanien', 'Mallorca', 'Teneriffa', 'Gran Canaria', 'Ibiza', 'Barcelona', 'Madrid', 'Andalusien',
    'Italien', 'Rom', 'Mailand', 'Südtirol', 'Toskana', 'Sizilien', 'Sardinien',
    'Frankreich', 'Paris', 'Provence', 'Bretagne', 'Alpen',
    'Portugal', 'Lissabon', 'Porto', 'Algarve', 'Madeira', 'Azoren',
    'Griechenland', 'Kreta', 'Rhodos', 'Athen',
    'Deutschland', 'Berlin', 'Hamburg', 'München', 'Schwarzwald', 'Harz', 'Bodensee', 'Ostsee', 'Nordsee',
    'Österreich', 'Wien', 'Salzburg', 'Tirol',
    'Schweiz', 'Zürich', 'Genf', 'Wallis',
    'Norwegen', 'Schweden', 'Dänemark', 'Kopenhagen', 'Stockholm', 'Oslo',
    'Kroatien', 'Slowenien', 'Schottland', 'Irland', 'Island'
  ],

  parse(input) {
    if (!input || typeof input !== 'string') return null;
    const cleanText = input.trim();
    const lower = cleanText.toLowerCase();

    // 1. DAUER (Tage / Wochen / Wochenende)
    let days = 5; // Standardwert
    if (lower.includes('wochenende')) {
      days = 3;
    } else if (lower.includes('1 woche') || lower.includes('eine woche')) {
      days = 7;
    } else if (lower.includes('2 wochen') || lower.includes('zwei wochen')) {
      days = 14;
    } else {
      const match = lower.match(/(\d+)\s*(?:tage|tag|t|d)\b/);
      if (match) {
        days = Math.max(1, parseInt(match[1], 10));
      }
    }

    // 2. AKTIVITÄT
    let activity = 'wandern'; // Default gemäß Nutzerfokus
    if (/fahrrad|rad|bike|bikepacking|gravel|rennrad|radtour/i.test(lower)) {
      activity = 'fahrrad';
    } else if (/motorrad|moto|biker|moped/i.test(lower)) {
      activity = 'motorrad';
    } else if (/stadt|city|sightseeing|metropole|museum/i.test(lower)) {
      activity = 'stadt';
    } else if (/business|geschäft|arbeit|konferenz|meeting/i.test(lower)) {
      activity = 'business';
    } else if (/wandern|wanderung|hike|hiking|trekking|berge|alpen/i.test(lower)) {
      activity = 'wandern';
    }

    // 3. ZIELORT / DESTINATION
    let destination = 'Spanien'; // Default
    let foundDest = this.knownDestinations.find(d => new RegExp(`\\b${d}\\b`, 'i').test(cleanText));
    if (foundDest) {
      destination = foundDest;
    } else {
      // Wortsuche nach großgeschriebenen Wörtern, die nicht Tage/Aktivitäten sind
      const stopWords = ['Tage', 'Tag', 'Wandern', 'Fahrrad', 'Bikepacking', 'Motorrad', 'Städtetrip', 'Reise', 'Trip', 'Tour', 'Mit', 'Und', 'Für'];
      const words = cleanText.split(/\s+/);
      for (const w of words) {
        const stripped = w.replace(/[^a-zA-ZäöüÄÖÜß]/g, '');
        if (stripped.length > 2 && /^[A-ZÄÖÜ]/.test(stripped) && !stopWords.includes(stripped)) {
          destination = stripped;
          break;
        }
      }
    }

    // 4. WASCH-OPTION
    let canWash = false;
    if (lower.includes('mit wäsche') || lower.includes('kann waschen') || lower.includes('waschmaschine') || lower.includes('waschen')) {
      if (!lower.includes('nicht waschen') && !lower.includes('ohne wäsche') && !lower.includes('keine wäsche')) {
        canWash = true;
      }
    }

    // 5. WETTER- & MODUL-FLAGS
    const isCold = /kalt|winter|schnee|frieren|herbst|frost|minus/i.test(lower);
    const isSwim = /schwimm|strand|bade|meer|see|pool|ocean/i.test(lower);
    const isCamping = /zelt|zelten|camping|biwak|hängematte|draußen schlafen/i.test(lower);

    // Formatierten Titel erzeugen
    const title = `${days} Tage ${destination} ${this.capitalize(activity)}`;

    return {
      rawInput: input,
      title,
      destination,
      days,
      activity,
      canWash,
      isCold,
      isSwim,
      isCamping
    };
  },

  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

const BookingParser = {
  /**
   * Liest unstrukturierten Text aus Bestätigungs-Mails (Lufthansa, Ryanair, DB, Booking usw.)
   * und extrahiert PNR, Flugnummern, Zeiten und Flughäfen.
   */
  parseEmailText(text) {
    if (!text || typeof text !== 'string') return null;

    const result = {
      pnr: null,
      flightNumber: null,
      transportType: 'Flug / Reise',
      departureTime: null,
      arrivalTime: null,
      origin: null,
      destination: null,
      details: '',
      notes: ''
    };

    // 1. PNR / Buchungscode erkennen
    // Erlaubt auch "Buchungscode (PNR): XR94KL" oder "Buchungscode / PNR: XR94KL"
    const pnrExplicit = text.match(/(?:PNR|Buchungscode|Buchungsreferenz|Booking\s*(?:Ref|Code|Number)|Record\s*Locator)[\s:\-\(\)\/]*(?:PNR)?[\s:\-\(\)\/]*([A-Z0-9]{5,7})\b/i);
    if (pnrExplicit) {
      result.pnr = pnrExplicit[1].toUpperCase();
    } else {
      // Fallback: 6-stelliger Alphanumerischer Code mit Zahlen und Buchstaben
      const pnrGeneric = text.match(/\b([A-Z0-9]{6})\b/g);
      if (pnrGeneric) {
        const blacklist = ['FLIGHT', 'TICKET', 'BERLIN', 'ONLINE', 'MADRID', 'RETURN', 'TRAVEL', 'PERSON', 'NUMBER'];
        const candidate = pnrGeneric.find(c => !blacklist.includes(c) && /\d/.test(c) && /[A-Z]/.test(c));
        if (candidate) {
          result.pnr = candidate;
        }
      }
    }

    // 2. Flugnummer / Zugnummer erkennen
    // Airlines: LH123, FR4567, EW987, IB3120, VY6100 etc.
    const flightMatch = text.match(/\b([A-Z0-9]{2}\s?\d{2,4})\b/);
    if (flightMatch) {
      result.flightNumber = flightMatch[1].replace(/\s+/, ' ').toUpperCase();
      result.transportType = 'Flug ' + result.flightNumber;
    } else if (/(ICE|IC|EC|RE|RB)\s?\d{2,5}/i.test(text)) {
      const trainMatch = text.match(/\b(ICE|IC|EC|RE|RB)\s?\d{2,5}\b/i);
      result.flightNumber = trainMatch[0].toUpperCase();
      result.transportType = 'Bahn ' + result.flightNumber;
    }

    // 3. Zeiten erkennen (entweder Range oder alle gefundenen Zeiten der Reihe nach)
    const timeRangeMatch = text.match(/(\d{1,2}:\d{2})\s*(?:Uhr)?.*?(?:-|–|->|bis|to).*?(\d{1,2}:\d{2})/i);
    if (timeRangeMatch) {
      result.departureTime = timeRangeMatch[1];
      result.arrivalTime = timeRangeMatch[2];
    } else {
      const allTimes = text.match(/\b(\d{1,2}:\d{2})\b/g);
      if (allTimes && allTimes.length >= 2) {
        result.departureTime = allTimes[0];
        result.arrivalTime = allTimes[1];
      } else if (allTimes && allTimes.length === 1) {
        result.departureTime = allTimes[0];
      }
    }

    // 4. IATA Airport Codes (3 Großbuchstaben)
    const airportMatches = text.match(/\b([A-Z]{3})\b/g);
    if (airportMatches) {
      const iataList = ['BER', 'FRA', 'MUC', 'HAM', 'DUS', 'CGN', 'MAD', 'BCN', 'PMI', 'AGP', 'ALC', 'VLC', 'FCO', 'MXP', 'CDG', 'LIS', 'OPO', 'ATH', 'VIE', 'ZRH'];
      const foundIatas = airportMatches.filter(code => iataList.includes(code));
      if (foundIatas.length >= 2) {
        result.origin = foundIatas[0];
        result.destination = foundIatas[1];
      } else if (foundIatas.length === 1) {
        result.destination = foundIatas[0];
      }
    }

    // 5. Details zusammenstellen
    const detailParts = [];
    if (result.transportType) detailParts.push(result.transportType);
    if (result.departureTime && result.arrivalTime) {
      detailParts.push(`${result.departureTime} Uhr → ${result.arrivalTime} Uhr`);
    } else if (result.departureTime) {
      detailParts.push(`Abfahrt/Abflug: ${result.departureTime} Uhr`);
    }
    if (result.origin && result.destination) {
      detailParts.push(`(${result.origin} → ${result.destination})`);
    } else if (result.destination) {
      detailParts.push(`(Ziel: ${result.destination})`);
    }

    result.details = detailParts.join(' · ') || 'Buchungsdetails importiert';
    result.notes = 'Automatisch aus Mail extrahiert';

    return result;
  }
};

window.TripParser = TripParser;
window.BookingParser = BookingParser;
