/**
 * Reisetasche - Live-Wetter & Destination Service (Open-Meteo)
 * Kostenlos, keine API-Keys notwendig, CORS-kompatibel, mit intelligenten Pack-Tipps.
 */

const WeatherService = {
  // Destination-Infos (Stecker, Währung, Notruf)
  countryInfo: {
    'Spanien': { plug: 'Typ C & F (Euro & Schuko)', currency: 'EUR (€)', emergency: '112', tip: 'Perfekt für Outdoor. Siesta-Zeiten bei Besorgungen beachten.' },
    'Italien': { plug: 'Typ C & L (Adapter meist nicht nötig)', currency: 'EUR (€)', emergency: '112', tip: 'Trinkwasserbrunnen (Fontanelle) in Städten kostenlos nutzbar.' },
    'Frankreich': { plug: 'Typ C & E (Eurostecker passt)', currency: 'EUR (€)', emergency: '112', tip: 'Kartenzahlung überall Standard, auch für Kleinstbeträge.' },
    'Portugal': { plug: 'Typ C & F', currency: 'EUR (€)', emergency: '112', tip: 'An der Atlantikküste oft windig und abends kühl.' },
    'Schweiz': { plug: 'Typ J (Adapter für Schuko nötig!)', currency: 'CHF (Franken)', emergency: '112 / 144', tip: 'Typ J Steckdose: Flache Eurostecker passen, dicke Schukostecker nicht!' },
    'Österreich': { plug: 'Typ C & F (identisch zu DE)', currency: 'EUR (€)', emergency: '112', tip: 'Wetterumschwünge in den Bergen stets einplanen.' },
    'Norwegen': { plug: 'Typ C & F', currency: 'NOK (Krone)', emergency: '112', tip: 'Fast 100% bargeldlos. Regenkleidung ist Pflicht.' },
    'Deutschland': { plug: 'Typ C & F', currency: 'EUR (€)', emergency: '112', tip: 'Bargeld für Berghütten und kleinere Läden bereithalten.' }
  },

  // WMO Code Übersetzung & Icons
  wmoDescriptions: {
    0: { desc: 'Klarer Himmel', icon: 'sun', symbol: '☀️' },
    1: { desc: 'Überwiegend sonnig', icon: 'sun-dim', symbol: '🌤️' },
    2: { desc: 'Teilweise bewölkt', icon: 'cloud-sun', symbol: '⛅' },
    3: { desc: 'Bedeckt', icon: 'cloud', symbol: '☁️' },
    45: { desc: 'Nebel', icon: 'cloud-fog', symbol: '🌫️' },
    48: { desc: 'Raureif-Nebel', icon: 'cloud-fog', symbol: '🌫️' },
    51: { desc: 'Leichter Nieselregen', icon: 'cloud-drizzle', symbol: '🌦️' },
    53: { desc: 'Nieselregen', icon: 'cloud-drizzle', symbol: '🌦️' },
    55: { desc: 'Starker Nieselregen', icon: 'cloud-rain', symbol: '🌧️' },
    61: { desc: 'Leichter Regen', icon: 'cloud-rain', symbol: '🌧️' },
    63: { desc: 'Mäßiger Regen', icon: 'cloud-rain', symbol: '🌧️' },
    65: { desc: 'Kräftiger Regen', icon: 'cloud-rain', symbol: '🌧️' },
    71: { desc: 'Leichter Schneefall', icon: 'cloud-snow', symbol: '🌨️' },
    73: { desc: 'Schneefall', icon: 'cloud-snow', symbol: '❄️' },
    75: { desc: 'Starker Schneefall', icon: 'snowflake', symbol: '❄️' },
    80: { desc: 'Leichte Regenschauer', icon: 'cloud-rain', symbol: '🌦️' },
    81: { desc: 'Regenschauer', icon: 'cloud-rain', symbol: '🌧️' },
    82: { desc: 'Heftige Schauer', icon: 'cloud-rain', symbol: '⛈️' },
    95: { desc: 'Gewitter', icon: 'cloud-lightning', symbol: '⚡' },
    96: { desc: 'Gewitter mit Hagel', icon: 'cloud-lightning', symbol: '⛈️' }
  },

  cache: {},

  /**
   * Geocoding & Wettervorhersage von Open-Meteo abrufen
   */
  async fetchWeather(destination) {
    if (!destination) destination = 'Spanien';
    const cacheKey = destination.toLowerCase().trim();

    if (this.cache[cacheKey] && (Date.now() - this.cache[cacheKey].timestamp < 1000 * 60 * 30)) {
      return this.cache[cacheKey].data;
    }

    try {
      // 1. Geocoding
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=de&format=json`;
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) throw new Error('Geocoding fehlgeschlagen');
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        return this.getFallbackWeather(destination);
      }

      const place = geoData.results[0];
      const lat = place.latitude;
      const lon = place.longitude;
      const resolvedName = place.name + (place.country ? `, ${place.country}` : '');

      // 2. Wettervorhersage abrufen
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) throw new Error('Wetterdaten nicht erreichbar');
      const weatherData = await weatherRes.json();

      const daily = weatherData.daily;
      const forecastDays = [];

      for (let i = 0; i < Math.min(daily.time.length, 5); i++) {
        const code = daily.weathercode[i];
        const wmo = this.wmoDescriptions[code] || { desc: 'Wechselhaft', icon: 'cloud', symbol: '⛅' };
        forecastDays.push({
          date: daily.time[i],
          maxTemp: Math.round(daily.temperature_2m_max[i]),
          minTemp: Math.round(daily.temperature_2m_min[i]),
          rainProb: daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0,
          desc: wmo.desc,
          icon: wmo.icon,
          symbol: wmo.symbol
        });
      }

      // Pack-Hinweise generieren
      const highestTemp = Math.max(...forecastDays.map(d => d.maxTemp));
      const lowestTemp = Math.min(...forecastDays.map(d => d.minTemp));
      const highestRain = Math.max(...forecastDays.map(d => d.rainProb));

      const packTips = [];
      if (highestRain >= 35) {
        packTips.push({
          type: 'warning',
          text: `Regenrisiko bis zu ${highestRain}%: Regenjacke, Regenhülle für Rucksack & wasserdichte Beutel mitnehmen!`,
          itemSuggestion: 'Regenjacke'
        });
      }
      if (lowestTemp <= 10) {
        packTips.push({
          type: 'info',
          text: `Kühle Nächte/Morgen (${lowestTemp}°C): Thermowäsche oder warme Zusatzschicht einpacken!`,
          itemSuggestion: 'Thermowäsche'
        });
      }
      if (highestTemp >= 25) {
        packTips.push({
          type: 'tip',
          text: `Warme Temperaturen (${highestTemp}°C): Sonnencreme, Kopfbedeckung & ausreichend Wasser-Kapazität einplanen.`,
          itemSuggestion: 'Sonnencreme'
        });
      }

      const countryKey = Object.keys(this.countryInfo).find(c => destination.toLowerCase().includes(c.toLowerCase())) || 'Spanien';
      const info = this.countryInfo[countryKey] || this.countryInfo['Spanien'];

      const result = {
        destinationName: resolvedName,
        current: forecastDays[0],
        days: forecastDays,
        highestTemp,
        lowestTemp,
        highestRain,
        packTips,
        info
      };

      this.cache[cacheKey] = {
        timestamp: Date.now(),
        data: result
      };

      return result;
    } catch (err) {
      console.warn('Wetter konnte nicht geladen werden, verwende Fallback:', err);
      return this.getFallbackWeather(destination);
    }
  },

  getFallbackWeather(destination) {
    const countryKey = Object.keys(this.countryInfo).find(c => destination.toLowerCase().includes(c.toLowerCase())) || 'Spanien';
    const info = this.countryInfo[countryKey] || this.countryInfo['Spanien'];

    return {
      destinationName: destination,
      current: {
        date: new Date().toISOString().slice(0, 10),
        maxTemp: 22,
        minTemp: 14,
        rainProb: 15,
        desc: 'Sonnig & Mild',
        icon: 'sun',
        symbol: '☀️'
      },
      days: [
        { date: 'Tag 1', maxTemp: 22, minTemp: 14, rainProb: 15, desc: 'Sonnig', symbol: '☀️' },
        { date: 'Tag 2', maxTemp: 23, minTemp: 15, rainProb: 10, desc: 'Heiter', symbol: '🌤️' },
        { date: 'Tag 3', maxTemp: 21, minTemp: 13, rainProb: 25, desc: 'Teilw. bewölkt', symbol: '⛅' }
      ],
      highestTemp: 23,
      lowestTemp: 13,
      highestRain: 25,
      packTips: [
        { type: 'tip', text: 'Angenehmes Reisewetter vorhergesagt. Standard-Inventar ausreichend.', itemSuggestion: null }
      ],
      info
    };
  }
};

window.WeatherService = WeatherService;
