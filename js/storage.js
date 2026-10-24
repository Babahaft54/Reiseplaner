/**
 * Reisetasche - LocalStorage Management Layer
 * Dauerhafte Speicherung von Trips, Archiv, Benutzer-Präferenzen und Analytics.
 */

const STORAGE_KEYS = {
  ACTIVE_TRIP: 'reisetasche_active_trip',
  ARCHIVE: 'reisetasche_archive',
  SETTINGS: 'reisetasche_settings',
  THEME: 'reisetasche_theme'
};

const StorageService = {
  // Aktive Reise laden
  getActiveTrip() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Fehler beim Laden der aktiven Reise:', e);
    }
    // Fallback: Default-Reise generieren
    if (window.INVENTORY && typeof window.INVENTORY.generateDefaultTrip === 'function') {
      const defaultTrip = window.INVENTORY.generateDefaultTrip(
        '5 Tage Spanien Wandern',
        'Spanien',
        5,
        'wandern',
        false, // canWash
        false, // isCold
        false  // isSwim
      );
      this.saveActiveTrip(defaultTrip);
      return defaultTrip;
    }
    return null;
  },

  // Aktive Reise speichern
  saveActiveTrip(trip) {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP, JSON.stringify(trip));
    } catch (e) {
      console.error('Fehler beim Speichern der Reise:', e);
    }
  },

  // Archiv abrufen
  getArchive() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ARCHIVE);
      if (data) {
        return JSON.parse(data);
      }
      // Demo-Archiv für Erstnutzung (Jahresrückblick sofort erlebbar)
      const sampleArchive = [
        {
          id: 'archive_sample_1',
          title: '3 Tage Harz Bikepacking',
          destination: 'Harz, Deutschland',
          days: 3,
          activity: 'fahrrad',
          canWash: false,
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(),
          items: [
            { id: 'b_wasser', name: 'Wasser', packed: true },
            { id: 'f_multitool', name: 'Multitool', packed: true },
            { id: 'u_schlafsack', name: 'Schlafsack', packed: true },
            { id: 'c_panzertape', name: 'Panzertape', packed: true }
          ],
          review: {
            unusedItems: ['Panzertape', 'Zusatz-Powerbank'],
            notes: 'Sehr gute Route, Reifendruck 4/5 bar lief perfekt.'
          }
        }
      ];
      this.saveArchive(sampleArchive);
      return sampleArchive;
    } catch (e) {
      console.error('Fehler beim Laden des Archivs:', e);
      return [];
    }
  },

  saveArchive(archive) {
    try {
      localStorage.setItem(STORAGE_KEYS.ARCHIVE, JSON.stringify(archive));
    } catch (e) {
      console.error('Fehler beim Speichern des Archivs:', e);
    }
  },

  // Reise ins Archiv verschieben
  archiveTrip(trip, postTripReview = null) {
    try {
      const archive = this.getArchive();
      const archivedTrip = {
        ...trip,
        completedAt: new Date().toISOString(),
        review: postTripReview || { unusedItems: [], notes: '' }
      };
      archive.unshift(archivedTrip);
      this.saveArchive(archive);
      return true;
    } catch (e) {
      console.error('Fehler beim Archivieren:', e);
      return false;
    }
  },

  deleteArchivedTrip(tripId) {
    try {
      let archive = this.getArchive();
      archive = archive.filter(t => t.id !== tripId);
      this.saveArchive(archive);
      return true;
    } catch (e) {
      console.error('Fehler beim Löschen:', e);
      return false;
    }
  },

  // Jahres-Auswertung generieren
  getAnnualStats(targetYear = new Date().getFullYear()) {
    const archive = this.getArchive();
    const tripsThisYear = archive.filter(t => {
      if (!t.completedAt) return false;
      return new Date(t.completedAt).getFullYear() === targetYear;
    });

    let totalDays = 0;
    const destinations = new Set();
    const activityCounts = {};
    const unusedItemsCounter = {};

    tripsThisYear.forEach(trip => {
      totalDays += (parseInt(trip.days, 10) || 1);
      if (trip.destination) destinations.add(trip.destination);
      
      const act = trip.activity || 'Reise';
      activityCounts[act] = (activityCounts[act] || 0) + 1;

      if (trip.review && Array.isArray(trip.review.unusedItems)) {
        trip.review.unusedItems.forEach(item => {
          unusedItemsCounter[item] = (unusedItemsCounter[item] || 0) + 1;
        });
      }
    });

    return {
      year: targetYear,
      tripCount: tripsThisYear.length,
      totalDays,
      destinations: Array.from(destinations),
      activityCounts,
      unusedItemsCounter,
      trips: tripsThisYear
    };
  },

  // Theme laden & setzen
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  },

  setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  initTheme() {
    const savedTheme = this.getTheme();
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }
};

window.StorageService = StorageService;
