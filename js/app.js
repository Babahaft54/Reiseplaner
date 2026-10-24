/**
 * Reisetasche - Core Application Controller
 * Vollständige Anbindung von NLP-Parser, Buchungs-Parser, Open-Meteo Live-Wetter,
 * Screenshot-Offline-Ablage, 10-Minuten Tür-Check und Jahresarchiv mit Minimalismus-Review.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Theme initialisieren
  if (window.StorageService) {
    window.StorageService.initTheme();
  }

  const App = {
    activeTrip: null,
    currentTab: 'packlist',
    packlistFilter: 'all', // 'all', 'open', 'worn', 'packed'
    activeSubTab: 'items', // 'items' | 'shopping'
    weatherData: null,

    async init() {
      this.loadTrip();
      this.bindEvents();
      this.render();
      await this.refreshWeather();
      if (window.lucide) {
        window.lucide.createIcons();
      }
    },

    loadTrip() {
      this.activeTrip = window.StorageService.getActiveTrip();
    },

    saveTrip() {
      window.StorageService.saveActiveTrip(this.activeTrip);
      this.updateStats();
    },

    bindEvents() {
      // 1. Theme Toggle
      const themeToggleBtn = document.getElementById('theme-toggle');
      if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
          const isDark = document.documentElement.classList.contains('dark');
          window.StorageService.setTheme(isDark ? 'light' : 'dark');
        });
      }

      // 2. Tab Navigation
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tab = e.currentTarget.dataset.tab;
          this.switchTab(tab);
        });
      });

      // 3. NLP Smart-Input Form
      const quickForm = document.getElementById('quick-trip-form');
      if (quickForm) {
        quickForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleQuickInput();
        });
      }

      // 4. Sub-Tabs in Packliste (Gepäck vs. Vor-Ort)
      document.querySelectorAll('.subtab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.activeSubTab = e.currentTarget.dataset.subtab;
          document.querySelectorAll('.subtab-btn').forEach(b => {
            b.classList.remove('bg-white', 'dark:bg-neutral-800', 'shadow-xs', 'text-neutral-900', 'dark:text-white', 'font-medium');
            b.classList.add('text-neutral-500', 'dark:text-neutral-400');
          });
          e.currentTarget.classList.add('bg-white', 'dark:bg-neutral-800', 'shadow-xs', 'text-neutral-900', 'dark:text-white', 'font-medium');
          e.currentTarget.classList.remove('text-neutral-500', 'dark:text-neutral-400');
          this.renderPacklist();
        });
      });

      // 5. Filter Buttons in Packliste
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.packlistFilter = e.currentTarget.dataset.filter;
          document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('bg-neutral-900', 'text-white', 'dark:bg-neutral-100', 'dark:text-neutral-900');
            b.classList.add('bg-neutral-100', 'text-neutral-600', 'dark:bg-neutral-800', 'dark:text-neutral-300');
          });
          e.currentTarget.classList.add('bg-neutral-900', 'text-white', 'dark:bg-neutral-100', 'dark:text-neutral-900');
          e.currentTarget.classList.remove('bg-neutral-100', 'text-neutral-600', 'dark:bg-neutral-800', 'dark:text-neutral-300');
          this.renderPacklist();
        });
      });

      // 6. PNR 1-Klick-Kopieren
      const copyPnrBtn = document.getElementById('copy-pnr-btn');
      if (copyPnrBtn) {
        copyPnrBtn.addEventListener('click', () => {
          const pnrText = document.getElementById('pnr-display')?.innerText;
          if (pnrText && pnrText !== 'KEIN PNR') {
            navigator.clipboard.writeText(pnrText).then(() => {
              const origHtml = copyPnrBtn.innerHTML;
              copyPnrBtn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-500 mr-1"></i> Kopiert!';
              if (window.lucide) window.lucide.createIcons();
              setTimeout(() => {
                copyPnrBtn.innerHTML = origHtml;
                if (window.lucide) window.lucide.createIcons();
              }, 2000);
            });
          }
        });
      }

      // 7. Smart-Mail Parser Button
      const parseMailBtn = document.getElementById('btn-parse-mail');
      if (parseMailBtn) {
        parseMailBtn.addEventListener('click', () => {
          this.handleMailParse();
        });
      }

      // 8. Screenshot-Upload Paste Handler (Strg+V / Cmd+V)
      window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            this.handleScreenshotFile(blob);
            break;
          }
        }
      });

      // 9. Item Hinzufügen Form
      const addItemForm = document.getElementById('add-item-form');
      if (addItemForm) {
        addItemForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const input = document.getElementById('add-item-input');
          const catSelect = document.getElementById('add-item-category');
          if (input && input.value.trim()) {
            this.addItem(input.value.trim(), catSelect ? catSelect.value : 'Sonstiges');
            input.value = '';
          }
        });
      }

      // 10. Vor-Ort Besorgung Hinzufügen Form
      const addShopForm = document.getElementById('add-shop-form');
      if (addShopForm) {
        addShopForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const input = document.getElementById('add-shop-input');
          if (input && input.value.trim()) {
            this.addShoppingItem(input.value.trim());
            input.value = '';
          }
        });
      }

      // 11. Reise abschließen Button (Header)
      const finishTripBtn = document.getElementById('btn-finish-trip');
      if (finishTripBtn) {
        finishTripBtn.addEventListener('click', () => {
          this.openReviewModal();
        });
      }
    },

    switchTab(tabId) {
      this.currentTab = tabId;
      document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.dataset.tab === tabId;
        if (isActive) {
          btn.classList.add('border-neutral-900', 'text-neutral-900', 'dark:border-white', 'dark:text-white', 'font-semibold');
          btn.classList.remove('border-transparent', 'text-neutral-500', 'dark:text-neutral-400');
        } else {
          btn.classList.remove('border-neutral-900', 'text-neutral-900', 'dark:border-white', 'dark:text-white', 'font-semibold');
          btn.classList.add('border-transparent', 'text-neutral-500', 'dark:text-neutral-400');
        }
      });

      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));
      const activePane = document.getElementById(`pane-${tabId}`);
      if (activePane) activePane.classList.remove('hidden');

      if (tabId === 'weather') {
        this.renderWeather();
      } else if (tabId === 'archive') {
        this.renderArchive();
      }

      if (window.lucide) window.lucide.createIcons();
    },

    // -------------------------------------------------------------------------
    // NLP SMART TRIP GENERATION
    // -------------------------------------------------------------------------
    async handleQuickInput() {
      const input = document.getElementById('quick-input');
      if (!input || !input.value.trim()) return;

      const raw = input.value.trim();
      let parsed = null;

      if (window.TripParser) {
        parsed = window.TripParser.parse(raw);
      }

      // Checkboxen aus der Schnell-Leiste (können den Parser überstimmen, falls angehakt)
      const optWash = document.getElementById('opt-wash')?.checked;
      const optCold = document.getElementById('opt-cold')?.checked;
      const optSwim = document.getElementById('opt-swim')?.checked;

      const destination = parsed ? parsed.destination : 'Spanien';
      const days = parsed ? parsed.days : 5;
      const activity = parsed ? parsed.activity : 'wandern';
      const canWash = optWash !== undefined ? (optWash || (parsed ? parsed.canWash : false)) : false;
      const isCold = optCold !== undefined ? (optCold || (parsed ? parsed.isCold : false)) : false;
      const isSwim = optSwim !== undefined ? (optSwim || (parsed ? parsed.isSwim : false)) : false;

      this.activeTrip = window.INVENTORY.generateDefaultTrip(
        raw,
        destination,
        days,
        activity,
        canWash,
        isCold,
        isSwim
      );

      this.saveTrip();
      this.render();
      input.value = '';

      // Live-Wetter für neues Ziel abrufen
      await this.refreshWeather();
    },

    // -------------------------------------------------------------------------
    // SMART MAIL PARSER
    // -------------------------------------------------------------------------
    handleMailParse() {
      const textarea = document.getElementById('mail-parser-input');
      if (!textarea || !textarea.value.trim()) return;

      if (window.BookingParser) {
        const parsed = window.BookingParser.parseEmailText(textarea.value.trim());
        if (parsed) {
          if (!this.activeTrip.booking) this.activeTrip.booking = {};

          if (parsed.pnr) this.activeTrip.booking.pnr = parsed.pnr;
          if (parsed.details) this.activeTrip.booking.details = parsed.details;
          if (parsed.notes) this.activeTrip.booking.notes = parsed.notes;

          this.saveTrip();
          this.renderBooking();
          textarea.value = '';

          // Visuelle Bestätigung
          const btn = document.getElementById('btn-parse-mail');
          if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i> Extrahiert!';
            if (window.lucide) window.lucide.createIcons();
            setTimeout(() => {
              btn.innerHTML = orig;
              if (window.lucide) window.lucide.createIcons();
            }, 2000);
          }
        }
      }
    },

    // -------------------------------------------------------------------------
    // OFFLINE SCREENSHOT / TICKET HANDLER
    // -------------------------------------------------------------------------
    handleScreenshotFile(file) {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!this.activeTrip.booking) this.activeTrip.booking = {};
        this.activeTrip.booking.screenshotUrl = e.target.result;
        this.saveTrip();
        this.renderBooking();
      };
      reader.readAsDataURL(file);
    },

    removeScreenshot() {
      if (this.activeTrip && this.activeTrip.booking) {
        delete this.activeTrip.booking.screenshotUrl;
        this.saveTrip();
        this.renderBooking();
      }
    },

    openImageViewer() {
      const imgUrl = this.activeTrip?.booking?.screenshotUrl;
      if (!imgUrl) return;
      const modal = document.getElementById('modal-image-viewer');
      const img = document.getElementById('modal-image-img');
      if (modal && img) {
        img.src = imgUrl;
        modal.classList.remove('hidden');
      }
    },

    closeImageViewer() {
      const modal = document.getElementById('modal-image-viewer');
      if (modal) modal.classList.add('hidden');
    },

    // -------------------------------------------------------------------------
    // ITEM MANAGEMENT
    // -------------------------------------------------------------------------
    addItem(name, category) {
      if (!this.activeTrip) return;
      const newItem = {
        id: 'item_' + Date.now(),
        name,
        category: category || 'Sonstiges',
        packed: false,
        worn: false,
        defaultQty: 1
      };
      this.activeTrip.items.push(newItem);
      this.saveTrip();
      this.renderPacklist();
    },

    togglePacked(itemId) {
      const item = this.activeTrip.items.find(i => i.id === itemId);
      if (item) {
        item.packed = !item.packed;
        this.saveTrip();
        this.renderPacklist();
      }
    },

    toggleWorn(itemId) {
      const item = this.activeTrip.items.find(i => i.id === itemId);
      if (item) {
        item.worn = !item.worn;
        if (item.worn) {
          item.packed = true;
        }
        this.saveTrip();
        this.renderPacklist();
      }
    },

    deleteItem(itemId) {
      this.activeTrip.items = this.activeTrip.items.filter(i => i.id !== itemId);
      this.saveTrip();
      this.renderPacklist();
    },

    // -------------------------------------------------------------------------
    // VOR-ORT BESORGUNGEN
    // -------------------------------------------------------------------------
    addShoppingItem(name) {
      if (!this.activeTrip) return;
      if (!this.activeTrip.shoppingList) this.activeTrip.shoppingList = [];
      this.activeTrip.shoppingList.push({
        id: 'shop_' + Date.now(),
        name,
        checked: false
      });
      this.saveTrip();
      this.renderPacklist();
    },

    toggleShoppingItem(shopId) {
      const shopItem = this.activeTrip.shoppingList.find(s => s.id === shopId);
      if (shopItem) {
        shopItem.checked = !shopItem.checked;
        this.saveTrip();
        this.renderPacklist();
      }
    },

    deleteShoppingItem(shopId) {
      this.activeTrip.shoppingList = this.activeTrip.shoppingList.filter(s => s.id !== shopId);
      this.saveTrip();
      this.renderPacklist();
    },

    // -------------------------------------------------------------------------
    // PRE-TRIP CHECKS
    // -------------------------------------------------------------------------
    toggleCheck(checkId) {
      const check = this.activeTrip.checks.find(c => c.id === checkId);
      if (check) {
        check.checked = !check.checked;
        this.saveTrip();
        this.renderChecks();
        this.renderDoorCheck();
      }
    },

    // -------------------------------------------------------------------------
    // LIVE WETTER ABFRAGE & RENDERING
    // -------------------------------------------------------------------------
    async refreshWeather() {
      if (!this.activeTrip || !window.WeatherService) return;
      const destination = this.activeTrip.destination || 'Spanien';
      this.weatherData = await window.WeatherService.fetchWeather(destination);

      // Header Weather Pill aktualisieren
      const pill = document.getElementById('quick-weather-pill');
      const text = document.getElementById('quick-weather-text');
      if (pill && text && this.weatherData && this.weatherData.current) {
        text.innerText = `${this.weatherData.current.symbol} ${this.weatherData.destinationName}: ${this.weatherData.current.maxTemp}°C`;
        pill.classList.remove('hidden');
      }

      // Packliste Alert Banner aktualisieren (z. B. Regenwarnung)
      const alertBanner = document.getElementById('weather-pack-alert');
      const alertText = document.getElementById('weather-alert-text');
      const alertIcon = document.getElementById('weather-alert-icon');
      if (alertBanner && this.weatherData && this.weatherData.packTips && this.weatherData.packTips.length > 0) {
        const topTip = this.weatherData.packTips[0];
        if (topTip.type === 'warning') {
          alertBanner.className = 'p-3 rounded-xl border text-xs flex items-center justify-between bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200';
          if (alertText) alertText.innerText = topTip.text;
          alertBanner.classList.remove('hidden');
        } else {
          alertBanner.classList.add('hidden');
        }
      }

      this.renderWeather();
    },

    renderWeather() {
      const container = document.getElementById('weather-content-container');
      if (!container) return;

      if (!this.weatherData) {
        container.innerHTML = `
          <div class="p-8 text-center text-neutral-400">
            <i data-lucide="cloud-off" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
            <p class="text-xs">Keine Wetterdaten verfügbar.</p>
          </div>
        `;
        return;
      }

      const w = this.weatherData;
      let daysHtml = '';
      w.days.forEach((d, idx) => {
        daysHtml += `
          <div class="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-neutral-100 dark:border-neutral-800 text-center flex flex-col justify-between">
            <span class="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">${idx === 0 ? 'Heute' : d.date.slice(5)}</span>
            <div class="text-2xl my-1.5">${d.symbol}</div>
            <div>
              <div class="text-sm font-bold font-mono-code text-neutral-800 dark:text-neutral-100">${d.maxTemp}° <span class="text-xs font-normal text-neutral-400 font-mono-code">${d.minTemp}°</span></div>
              <div class="text-[10px] text-sky-600 dark:text-sky-400 font-mono-code mt-0.5">${d.rainProb}% Regen</div>
            </div>
          </div>
        `;
      });

      let packTipsHtml = '';
      w.packTips.forEach(tip => {
        packTipsHtml += `
          <div class="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-neutral-100 dark:border-neutral-800 flex items-start space-x-2 text-xs">
            <i data-lucide="${tip.type === 'warning' ? 'alert-triangle' : 'lightbulb'}" class="w-4 h-4 flex-shrink-0 ${tip.type === 'warning' ? 'text-amber-500' : 'text-sky-500'} mt-0.5"></i>
            <span class="text-neutral-700 dark:text-neutral-300">${tip.text}</span>
          </div>
        `;
      });

      container.innerHTML = `
        <div class="space-y-4">
          <!-- Wetter Forecast Hero -->
          <div class="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-base font-bold text-neutral-900 dark:text-white flex items-center space-x-2">
                  <span>${w.destinationName}</span>
                </h3>
                <p class="text-xs text-neutral-400">Vorhersage für die nächsten Reisetage via Open-Meteo</p>
              </div>
              <span class="text-2xl">${w.current.symbol}</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              ${daysHtml}
            </div>
          </div>

          <!-- Pack-Hinweise & Wetter-Tipps -->
          <div class="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Wetter-Empfehlungen für dein Gepäck
            </h4>
            <div class="space-y-2">
              ${packTipsHtml}
            </div>
          </div>

          <!-- Destination Länder-Fakten -->
          <div class="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
              Länder-Check & Reisetipps
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <span class="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Steckdosen-Typ</span>
                <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 block">${w.info.plug}</span>
              </div>
              <div class="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <span class="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Währung</span>
                <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 block">${w.info.currency}</span>
              </div>
              <div class="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <span class="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Notruf</span>
                <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 block">${w.info.emergency}</span>
              </div>
            </div>
            <div class="mt-3 p-3 bg-sky-50 dark:bg-sky-950/30 rounded-xl text-xs text-sky-800 dark:text-sky-300 border border-sky-100 dark:border-sky-900/40">
              💡 <strong>Tipp vor Ort:</strong> ${w.info.tip}
            </div>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    },

    // -------------------------------------------------------------------------
    // POST-TRIP REVIEW & ARCHIV
    // -------------------------------------------------------------------------
    openReviewModal() {
      if (!this.activeTrip) return;
      const modal = document.getElementById('modal-review');
      const listEl = document.getElementById('review-items-list');
      if (!modal || !listEl) return;

      // Nur gepackte/mitgeführte Gegenstände anzeigen
      const packedItems = this.activeTrip.items.filter(i => i.packed || i.worn);
      if (packedItems.length === 0) {
        listEl.innerHTML = `<p class="p-3 text-xs text-neutral-400">Keine Gegenstände als gepackt markiert.</p>`;
      } else {
        let html = '';
        packedItems.forEach(item => {
          html += `
            <label class="flex items-center space-x-2.5 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer text-xs">
              <input type="checkbox" class="review-item-check rounded border-neutral-300 dark:border-neutral-700 text-rose-500 focus:ring-0" value="${item.name}">
              <span class="text-neutral-800 dark:text-neutral-200">${item.name}</span>
            </label>
          `;
        });
        listEl.innerHTML = html;
      }

      modal.classList.remove('hidden');
    },

    closeReviewModal() {
      const modal = document.getElementById('modal-review');
      if (modal) modal.classList.add('hidden');
    },

    saveReviewAndArchive() {
      const unusedChecks = document.querySelectorAll('.review-item-check:checked');
      const unusedItems = Array.from(unusedChecks).map(c => c.value);
      const notes = document.getElementById('review-notes-input')?.value.trim() || '';

      const review = {
        unusedItems,
        notes
      };

      // Trip ins Archiv schieben
      window.StorageService.archiveTrip(this.activeTrip, review);
      this.closeReviewModal();

      // Neuen frischen Trip vorbereiten
      this.activeTrip = window.INVENTORY.generateDefaultTrip(
        'Neues Reise-Setup',
        'Neues Ziel',
        3,
        'wandern',
        false,
        false,
        false
      );
      this.saveTrip();
      this.render();
      this.switchTab('archive');
    },

    restoreArchivedTrip(tripId) {
      const archive = window.StorageService.getArchive();
      const trip = archive.find(t => t.id === tripId);
      if (trip) {
        this.activeTrip = JSON.parse(JSON.stringify(trip));
        // Reset check status for the fresh trip
        this.activeTrip.id = 'trip_' + Date.now();
        this.activeTrip.items.forEach(i => { i.packed = false; });
        if (this.activeTrip.shoppingList) {
          this.activeTrip.shoppingList.forEach(s => { s.checked = false; });
        }
        if (this.activeTrip.checks) {
          this.activeTrip.checks.forEach(c => { c.checked = false; });
        }
        this.saveTrip();
        this.render();
        this.switchTab('packlist');
      }
    },

    deleteArchivedTrip(tripId) {
      window.StorageService.deleteArchivedTrip(tripId);
      this.renderArchive();
    },

    renderArchive() {
      const container = document.getElementById('archive-container');
      if (!container) return;

      const currentYear = new Date().getFullYear();
      const stats = window.StorageService.getAnnualStats(currentYear);

      // Aktivitäten-Badges
      let actBadges = '';
      for (const [act, count] of Object.entries(stats.activityCounts)) {
        actBadges += `
          <span class="px-2 py-0.5 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono-code">
            ${count}x ${act}
          </span>
        `;
      }

      // Häufig unbenutzte Gegenstände (Minimalismus Insights)
      let unusedListHtml = '';
      const unusedEntries = Object.entries(stats.unusedItemsCounter);
      if (unusedEntries.length > 0) {
        unusedEntries.sort((a, b) => b[1] - a[1]);
        unusedListHtml = `
          <div class="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-xl space-y-2">
            <div class="flex items-center space-x-2 text-rose-800 dark:text-rose-300 font-semibold text-xs">
              <i data-lucide="scale" class="w-4 h-4 text-rose-500"></i>
              <span>Minimalismus-Feedback: Häufig nicht gebraucht!</span>
            </div>
            <p class="text-[11px] text-rose-700 dark:text-rose-400">
              Diese Teile blieben auf deinen Reisen unbenutzt. Beim nächsten Trip vielleicht direkt zu Hause lassen?
            </p>
            <div class="flex flex-wrap gap-1.5 pt-1">
              ${unusedEntries.map(([name, count]) => `
                <span class="px-2 py-0.5 bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded text-xs font-mono-code">
                  ${name} (${count}x ungenutzt)
                </span>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Trip Chronik
      let tripsListHtml = '';
      if (stats.trips.length === 0) {
        tripsListHtml = `
          <div class="p-8 text-center text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
            <p class="text-xs">Keine Reisen im Jahr ${currentYear} abgeschlossen.</p>
          </div>
        `;
      } else {
        stats.trips.forEach(trip => {
          const dateStr = trip.completedAt ? new Date(trip.completedAt).toLocaleDateString('de-DE') : '';
          const unusedBadges = trip.review?.unusedItems?.length > 0
            ? trip.review.unusedItems.map(i => `<span class="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded text-[10px] font-mono-code">${i}</span>`).join(' ')
            : '<span class="text-[11px] text-emerald-600 dark:text-emerald-400">Alles gebraucht!</span>';

          tripsListHtml += `
            <div class="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center space-x-2">
                  <h4 class="text-sm font-bold text-neutral-900 dark:text-white">${trip.title}</h4>
                  <span class="text-[11px] font-mono-code text-neutral-400">${dateStr}</span>
                </div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400 flex items-center space-x-2">
                  <span>${trip.days} Tage</span>
                  <span>·</span>
                  <span class="capitalize">${trip.activity}</span>
                  <span>·</span>
                  <span>${trip.destination}</span>
                </div>
                <div class="pt-1 flex items-center space-x-1 flex-wrap gap-1">
                  <span class="text-[10px] text-neutral-400 uppercase font-semibold">Nicht gebraucht:</span>
                  ${unusedBadges}
                </div>
                ${trip.review?.notes ? `<p class="text-xs text-neutral-400 italic mt-1">"${trip.review.notes}"</p>` : ''}
              </div>

              <div class="flex items-center space-x-2 flex-shrink-0">
                <button 
                  onclick="App.restoreArchivedTrip('${trip.id}')"
                  class="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-fast flex items-center space-x-1"
                >
                  <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                  <span>Als Vorlage</span>
                </button>
                <button 
                  onclick="App.deleteArchivedTrip('${trip.id}')"
                  class="p-1.5 text-neutral-400 hover:text-rose-500 transition-fast"
                  title="Aus Archiv löschen"
                >
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        });
      }

      container.innerHTML = `
        <div class="space-y-4">
          <!-- Jahresrückblick Hero Kachel -->
          <div class="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-base font-bold text-neutral-900 dark:text-white">
                  Jahresauswertung ${currentYear}
                </h3>
                <p class="text-xs text-neutral-400">Zusammenfassung all deiner absolvierten Reisen</p>
              </div>
              <span class="px-2.5 py-1 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-xs font-bold font-mono-code">
                ${stats.totalDays} Reisetage
              </span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl text-center">
                <span class="text-[10px] text-neutral-400 uppercase font-semibold block">Absolvierte Trips</span>
                <span class="text-xl font-bold font-mono-code text-neutral-800 dark:text-white mt-1 block">${stats.tripCount}</span>
              </div>
              <div class="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl text-center">
                <span class="text-[10px] text-neutral-400 uppercase font-semibold block">Reisetage</span>
                <span class="text-xl font-bold font-mono-code text-sky-600 dark:text-sky-400 mt-1 block">${stats.totalDays}</span>
              </div>
              <div class="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl text-center">
                <span class="text-[10px] text-neutral-400 uppercase font-semibold block">Ziele / Länder</span>
                <span class="text-xl font-bold font-mono-code text-neutral-800 dark:text-white mt-1 block">${stats.destinations.length}</span>
              </div>
              <div class="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl text-center">
                <span class="text-[10px] text-neutral-400 uppercase font-semibold block">Aktivitäten</span>
                <div class="flex flex-wrap justify-center gap-1 mt-1">${actBadges || '<span class="text-xs text-neutral-400">-</span>'}</div>
              </div>
            </div>
          </div>

          <!-- Minimalismus Feedback Box -->
          ${unusedListHtml}

          <!-- Reise Chronik -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Vergangene Reisen
            </h4>
            <div class="space-y-2.5">
              ${tripsListHtml}
            </div>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    },

    // -------------------------------------------------------------------------
    // STATS & PROGRESS UPDATE
    // -------------------------------------------------------------------------
    updateStats() {
      if (!this.activeTrip) return;
      const total = this.activeTrip.items.length;
      const packed = this.activeTrip.items.filter(i => i.packed).length;
      const percent = total > 0 ? Math.round((packed / total) * 100) : 0;

      const progressEl = document.getElementById('progress-bar');
      const progressTextEl = document.getElementById('progress-text');
      const badgeEl = document.getElementById('trip-badge');
      const titleEl = document.getElementById('active-trip-title');
      const shopCountEl = document.getElementById('shopping-badge-count');

      if (progressEl) progressEl.style.width = `${percent}%`;
      if (progressTextEl) progressTextEl.innerText = `${packed} von ${total} erledigt (${percent}%)`;
      if (badgeEl) {
        badgeEl.innerText = `${this.activeTrip.destination} · ${this.activeTrip.days} Tage · ${this.activeTrip.activity}`;
      }
      if (titleEl) {
        titleEl.innerText = this.activeTrip.title;
      }
      if (shopCountEl) {
        const unchecked = (this.activeTrip.shoppingList || []).filter(s => !s.checked).length;
        shopCountEl.innerText = unchecked;
      }
    },

    // -------------------------------------------------------------------------
    // MASTER RENDER
    // -------------------------------------------------------------------------
    render() {
      this.updateStats();
      this.renderPacklist();
      this.renderChecks();
      this.renderBooking();
      this.renderDoorCheck();
      if (window.lucide) window.lucide.createIcons();
    },

    // -------------------------------------------------------------------------
    // PACKLISTE RENDERING
    // -------------------------------------------------------------------------
    renderPacklist() {
      const container = document.getElementById('packlist-items-container');
      const shoppingContainer = document.getElementById('shopping-items-container');
      const itemsView = document.getElementById('view-pack-items');
      const shoppingView = document.getElementById('view-pack-shopping');

      if (this.activeSubTab === 'shopping') {
        itemsView?.classList.add('hidden');
        shoppingView?.classList.remove('hidden');
        this.renderShoppingList(shoppingContainer);
        return;
      }

      itemsView?.classList.remove('hidden');
      shoppingView?.classList.add('hidden');

      if (!container || !this.activeTrip) return;

      let items = this.activeTrip.items;
      if (this.packlistFilter === 'open') {
        items = items.filter(i => !i.packed);
      } else if (this.packlistFilter === 'packed') {
        items = items.filter(i => i.packed && !i.worn);
      } else if (this.packlistFilter === 'worn') {
        items = items.filter(i => i.worn);
      }

      const groups = {};
      items.forEach(item => {
        const cat = item.category || 'Sonstiges';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(item);
      });

      if (Object.keys(groups).length === 0) {
        container.innerHTML = `
          <div class="py-12 text-center text-neutral-400 dark:text-neutral-500">
            <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
            <p class="text-sm font-medium">Keine Gegenstände im gewählten Filter.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      let html = '';
      for (const [category, catItems] of Object.entries(groups)) {
        const catPacked = catItems.filter(i => i.packed).length;
        html += `
          <div class="mb-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
            <div class="px-4 py-2.5 bg-neutral-50/70 dark:bg-neutral-800/40 border-b border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between">
              <span class="text-xs font-semibold tracking-wide uppercase text-neutral-600 dark:text-neutral-400">${category}</span>
              <span class="text-xs font-mono-code text-neutral-400 dark:text-neutral-500">${catPacked}/${catItems.length}</span>
            </div>
            <div class="divide-y divide-neutral-100 dark:divide-neutral-800/60">
        `;

        catItems.forEach(item => {
          const isDone = item.packed;
          const isWorn = item.worn;

          html += `
            <div class="item-row px-4 py-2.5 flex items-center justify-between group hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 ${isDone ? 'opacity-70' : ''}">
              <div class="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                <input 
                  type="checkbox" 
                  class="custom-checkbox flex-shrink-0" 
                  ${isDone ? 'checked' : ''} 
                  onchange="App.togglePacked('${item.id}')"
                />
                <div class="min-w-0">
                  <div class="flex items-center space-x-2">
                    <span class="text-sm ${isDone ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-800 dark:text-neutral-200 font-normal'} truncate">
                      ${item.name}
                    </span>
                    ${item.defaultQty && item.defaultQty > 1 ? `<span class="px-1.5 py-0.2 text-[10px] font-mono-code bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">${item.defaultQty}x</span>` : ''}
                    ${item.note ? `<span class="text-[11px] text-neutral-400 hidden sm:inline truncate">(${item.note})</span>` : ''}
                  </div>
                </div>
              </div>

              <div class="flex items-center space-x-1.5 flex-shrink-0">
                <!-- Am Körper Getragen Toggle -->
                <button 
                  onclick="App.toggleWorn('${item.id}')"
                  title="Am Körper getragen (zählt nicht zum Taschenvolumen)"
                  class="px-2 py-1 text-xs rounded-md border flex items-center space-x-1 transition-fast ${isWorn ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-medium' : 'bg-transparent border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}"
                >
                  <i data-lucide="shirt" class="w-3.5 h-3.5"></i>
                  <span class="text-[11px] hidden sm:inline">${isWorn ? 'Am Körper' : 'Tragen'}</span>
                </button>

                <!-- Item löschen -->
                <button 
                  onclick="App.deleteItem('${item.id}')"
                  title="Löschen"
                  class="p-1 text-neutral-300 hover:text-rose-500 dark:text-neutral-600 dark:hover:text-rose-400 transition-fast opacity-0 group-hover:opacity-100"
                >
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      }

      container.innerHTML = html;
      if (window.lucide) window.lucide.createIcons();
    },

    renderShoppingList(container) {
      if (!container || !this.activeTrip) return;
      const list = this.activeTrip.shoppingList || [];

      if (list.length === 0) {
        container.innerHTML = `
          <div class="py-10 text-center text-neutral-400 dark:text-neutral-500">
            <i data-lucide="shopping-bag" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
            <p class="text-sm font-medium">Keine Vor-Ort-Besorgungen eingetragen.</p>
            <p class="text-xs text-neutral-400 mt-1">z. B. Gaskartusche fürs Camping oder 5L Wasser nach Ankunft.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      let html = `
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800/60 shadow-xs">
      `;

      list.forEach(item => {
        html += `
          <div class="item-row px-4 py-3 flex items-center justify-between group hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30">
            <div class="flex items-center space-x-3 min-w-0 flex-1">
              <input 
                type="checkbox" 
                class="custom-checkbox flex-shrink-0" 
                ${item.checked ? 'checked' : ''} 
                onchange="App.toggleShoppingItem('${item.id}')"
              />
              <span class="text-sm ${item.checked ? 'line-through text-neutral-400' : 'text-neutral-800 dark:text-neutral-200'}">
                ${item.name}
              </span>
            </div>
            <button 
              onclick="App.deleteShoppingItem('${item.id}')"
              class="p-1 text-neutral-300 hover:text-rose-500 dark:text-neutral-600 dark:hover:text-rose-400 transition-fast"
            >
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `;
      });

      html += `</div>`;
      container.innerHTML = html;
      if (window.lucide) window.lucide.createIcons();
    },

    renderChecks() {
      const container = document.getElementById('checks-container');
      if (!container || !this.activeTrip) return;

      const checks = this.activeTrip.checks || [];
      const groups = {};
      checks.forEach(c => {
        const cat = c.category || 'Allgemein';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(c);
      });

      let html = '';
      for (const [cat, items] of Object.entries(groups)) {
        const completed = items.filter(i => i.checked).length;
        html += `
          <div class="mb-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
            <div class="px-4 py-2.5 bg-neutral-50/70 dark:bg-neutral-800/40 border-b border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between">
              <span class="text-xs font-semibold tracking-wide uppercase text-neutral-600 dark:text-neutral-400">${cat}</span>
              <span class="text-xs font-mono-code text-neutral-400">${completed}/${items.length}</span>
            </div>
            <div class="divide-y divide-neutral-100 dark:divide-neutral-800/60">
        `;

        items.forEach(c => {
          html += `
            <div class="px-4 py-3 flex items-start space-x-3 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-fast ${c.checked ? 'opacity-60' : ''}">
              <input 
                type="checkbox" 
                class="custom-checkbox mt-0.5 flex-shrink-0" 
                ${c.checked ? 'checked' : ''} 
                onchange="App.toggleCheck('${c.id}')"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2">
                  <span class="text-sm ${c.checked ? 'line-through text-neutral-400' : 'text-neutral-800 dark:text-neutral-200 font-normal'}">
                    ${c.text}
                  </span>
                  ${c.badge ? `<span class="px-1.5 py-0.5 text-[10px] font-mono-code bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 rounded font-medium">${c.badge}</span>` : ''}
                </div>
                ${c.note ? `<p class="text-xs text-neutral-400 mt-0.5">${c.note}</p>` : ''}
              </div>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      }

      container.innerHTML = html;
      if (window.lucide) window.lucide.createIcons();
    },

    renderBooking() {
      const pnrDisplay = document.getElementById('pnr-display');
      const flightDetails = document.getElementById('booking-flight-details');
      const bookingNotes = document.getElementById('booking-notes');
      const previewContainer = document.getElementById('screenshot-preview-container');

      if (this.activeTrip && this.activeTrip.booking) {
        if (pnrDisplay) pnrDisplay.innerText = this.activeTrip.booking.pnr || 'KEIN PNR';
        if (flightDetails) flightDetails.innerText = this.activeTrip.booking.details || 'Keine Reisedetails hinterlegt';
        if (bookingNotes) bookingNotes.innerText = this.activeTrip.booking.notes || '';

        // Screenshot-Vorschau
        if (previewContainer) {
          if (this.activeTrip.booking.screenshotUrl) {
            previewContainer.innerHTML = `
              <div class="flex items-center justify-between p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <div class="flex items-center space-x-2.5 cursor-pointer" onclick="App.openImageViewer()">
                  <img src="${this.activeTrip.booking.screenshotUrl}" alt="Thumbnail" class="w-10 h-10 object-cover rounded border border-neutral-300 dark:border-neutral-700">
                  <div>
                    <span class="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">Screenshot hinterlegt</span>
                    <span class="text-[10px] text-sky-600 dark:text-sky-400">Klick für Vollbild</span>
                  </div>
                </div>
                <button onclick="App.removeScreenshot()" class="p-1 text-neutral-400 hover:text-rose-500 transition-fast" title="Screenshot entfernen">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            `;
          } else {
            previewContainer.innerHTML = `
              <label class="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-fast">
                <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                <span>Screenshot hochladen oder einfügen</span>
                <input type="file" class="hidden" accept="image/*" onchange="App.handleScreenshotFile(this.files[0])">
              </label>
            `;
          }
        }
      }
      if (window.lucide) window.lucide.createIcons();
    },

    renderDoorCheck() {
      const container = document.getElementById('doorcheck-container');
      const banner = document.getElementById('doorcheck-status-banner');
      if (!container || !this.activeTrip) return;

      const doorChecks = this.activeTrip.checks?.filter(c => c.category === 'Vor Abreise / Wohnung') || [];
      let html = '';
      let allDone = doorChecks.length > 0;

      doorChecks.forEach(c => {
        if (!c.checked) allDone = false;
        html += `
          <label class="flex items-center space-x-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-sky-500/50 cursor-pointer bg-neutral-50/50 dark:bg-neutral-800/30 transition-fast">
            <input 
              type="checkbox" 
              class="custom-checkbox w-5 h-5 flex-shrink-0" 
              ${c.checked ? 'checked' : ''} 
              onchange="App.toggleCheck('${c.id}')"
            />
            <span class="text-sm font-medium ${c.checked ? 'line-through text-neutral-400' : 'text-neutral-800 dark:text-neutral-200'}">
              ${c.text}
            </span>
          </label>
        `;
      });

      container.innerHTML = html;
      if (banner) {
        if (allDone) {
          banner.classList.remove('hidden');
        } else {
          banner.classList.add('hidden');
        }
      }
      if (window.lucide) window.lucide.createIcons();
    }
  };

  window.App = App;
  App.init();
});
