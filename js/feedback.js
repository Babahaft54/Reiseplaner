/**
 * Reisetasche — In-App Feedback & AI Prompt Generator
 * Ermöglicht direktes Markieren beliebiger Elemente auf der Webseite (Inspector-Modus),
 * das Erfassen von Anmerkungen/Bugs, optionale clientseitige Screenshots (html2canvas)
 * und die 1-Klick-Generierung eines strukturierten KI-Prompts für Antigravity.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'reisetasche_feedbacks_v1';

  const FeedbackService = {
    feedbacks: [],
    isInspectorActive: false,
    hoveredElement: null,
    highlightBox: null,
    inspectorBanner: null,
    currentScreenshotData: null,
    selectedTargetContext: null,

    init() {
      this.loadFeedbacks();
      this.createInspectorOverlay();
      this.bindEvents();
      this.updateBadge();
    },

    // -------------------------------------------------------------------------
    // 1. Storage & State Management
    // -------------------------------------------------------------------------
    loadFeedbacks() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        this.feedbacks = raw ? JSON.parse(raw) : [];
      } catch (err) {
        console.warn('FeedbackService: Konnte Feedbacks nicht laden', err);
        this.feedbacks = [];
      }
    },

    saveFeedbacks() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.feedbacks));
        this.updateBadge();
        this.renderFeedbackList();
      } catch (err) {
        console.warn('FeedbackService: Speichern fehlgeschlagen (evtl. Quota)', err);
        alert('Speicherlimit erreicht. Bitte Screenshots verkleinern oder Prompt generieren und Feedbacks leeren.');
      }
    },

    addFeedback(item) {
      const newEntry = {
        id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        timestamp: new Date().toISOString(),
        category: item.category || 'Wunsch 💡', // Bug 🐛, Design 🎨, Wunsch 💡, Text ✏️
        comment: item.comment.trim(),
        targetName: item.targetName || 'Allgemein',
        targetSelector: item.targetSelector || '',
        activeTab: item.activeTab || 'Unbekannt',
        screenshot: item.screenshot || null
      };

      this.feedbacks.unshift(newEntry);
      this.saveFeedbacks();
      this.showToast('✅ Feedback gespeichert!');
    },

    deleteFeedback(id) {
      this.feedbacks = this.feedbacks.filter(f => f.id !== id);
      this.saveFeedbacks();
    },

    clearAllFeedbacks() {
      if (this.feedbacks.length === 0) return;
      if (confirm('Möchtest du wirklich alle gesammelten Feedback-Punkte leeren?')) {
        this.feedbacks = [];
        this.saveFeedbacks();
        this.showToast('Feedback-Liste geleert.');
      }
    },

    // -------------------------------------------------------------------------
    // 2. Inspector Overlay (Point & Click Feedback)
    // -------------------------------------------------------------------------
    createInspectorOverlay() {
      // 1. Highlight-Box
      this.highlightBox = document.createElement('div');
      this.highlightBox.id = 'feedback-inspector-highlight';
      this.highlightBox.className = 'fixed pointer-events-none z-[99998] transition-all duration-75 border-2 border-dashed border-sky-500 bg-sky-500/10 rounded-md hidden';
      
      const badge = document.createElement('div');
      badge.id = 'feedback-inspector-tag';
      badge.className = 'absolute -top-7 left-0 bg-sky-600 text-white text-[11px] font-mono px-2 py-0.5 rounded shadow-md whitespace-nowrap truncate max-w-xs pointer-events-none';
      this.highlightBox.appendChild(badge);

      document.body.appendChild(this.highlightBox);

      // 2. Inspector Top Banner
      this.inspectorBanner = document.createElement('div');
      this.inspectorBanner.id = 'feedback-inspector-banner';
      this.inspectorBanner.className = 'fixed top-3 left-1/2 -translate-x-1/2 z-[99999] bg-neutral-900/95 dark:bg-white/95 text-white dark:text-neutral-900 px-4 py-2 rounded-full shadow-2xl flex items-center space-x-3 text-xs font-medium backdrop-blur-md border border-neutral-700/50 dark:border-neutral-200 hidden transition-all animate-bounce-subtle';
      this.inspectorBanner.innerHTML = `
        <span class="flex items-center space-x-1.5">
          <span class="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
          <span>Klicke auf eine Stelle oder ein Element</span>
        </span>
        <button id="btn-cancel-inspector" class="bg-neutral-800 dark:bg-neutral-200 hover:bg-neutral-700 dark:hover:bg-neutral-300 text-white dark:text-neutral-900 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-fast">
          Abbrechen (ESC)
        </button>
      `;
      document.body.appendChild(this.inspectorBanner);

      const cancelBtn = this.inspectorBanner.querySelector('#btn-cancel-inspector');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.stopInspectorMode();
        });
      }
    },

    startInspectorMode() {
      this.closeFeedbackDrawer();
      this.isInspectorActive = true;
      document.body.classList.add('feedback-inspector-cursor');
      if (this.inspectorBanner) this.inspectorBanner.classList.remove('hidden');

      // Key listener for ESC
      this.escHandler = (e) => {
        if (e.key === 'Escape') this.stopInspectorMode();
      };
      window.addEventListener('keydown', this.escHandler, { once: true });
    },

    stopInspectorMode() {
      this.isInspectorActive = false;
      document.body.classList.remove('feedback-inspector-cursor');
      if (this.highlightBox) this.highlightBox.classList.add('hidden');
      if (this.inspectorBanner) this.inspectorBanner.classList.add('hidden');
      this.hoveredElement = null;
    },

    handleMouseOver(e) {
      if (!this.isInspectorActive) return;

      const target = e.target.closest('button, input, [data-category], [data-tab], .tab-pane, header, nav, h1, h2, h3, p, li, label, div[id]') || e.target;

      // Vermeide UI-Elemente des Feedback-Systems selbst
      if (target.closest('#feedback-drawer') || target.closest('#modal-feedback-create') || target.closest('#modal-prompt-view') || target.closest('#feedback-inspector-banner') || target.closest('#btn-feedback-fab')) {
        this.highlightBox.classList.add('hidden');
        return;
      }

      this.hoveredElement = target;
      const rect = target.getBoundingClientRect();
      const context = this.describeElement(target);

      this.highlightBox.style.top = `${rect.top + window.scrollY}px`;
      this.highlightBox.style.left = `${rect.left + window.scrollX}px`;
      this.highlightBox.style.width = `${rect.width}px`;
      this.highlightBox.style.height = `${rect.height}px`;

      const tagEl = this.highlightBox.querySelector('#feedback-inspector-tag');
      if (tagEl) {
        tagEl.innerText = context.shortLabel;
      }

      this.highlightBox.classList.remove('hidden');
    },

    handleElementClick(e) {
      if (!this.isInspectorActive) return;

      e.preventDefault();
      e.stopPropagation();

      const el = this.hoveredElement || e.target;
      this.selectedTargetContext = this.describeElement(el);
      this.stopInspectorMode();
      this.openCommentModal(this.selectedTargetContext, el);
    },

    describeElement(el) {
      if (!el || el === document.body) {
        return {
          shortLabel: 'Ganze Seite',
          details: 'Allgemeine Ansicht',
          selector: 'body',
          tab: this.detectActiveTab()
        };
      }

      const activeTab = this.detectActiveTab();

      // Textinhalt extrahieren (gekürzt)
      let rawText = (el.innerText || el.placeholder || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
      if (rawText.length > 35) rawText = rawText.substring(0, 32) + '...';

      // Spezifische Reisetasche Elemente erkennen
      const itemRow = el.closest('[data-item-id]');
      const categorySec = el.closest('[data-category]');
      const checkRow = el.closest('[data-check-id]');
      const tabBtn = el.closest('.tab-btn');

      let shortLabel = el.tagName.toLowerCase();
      let details = '';

      if (itemRow) {
        const title = itemRow.querySelector('span')?.innerText || rawText;
        shortLabel = `Item: "${title}"`;
        details = `Gepäckstück in Packliste (${title})`;
      } else if (categorySec) {
        const catTitle = categorySec.dataset.category || 'Kategorie';
        shortLabel = `Kategorie: ${catTitle}`;
        details = `Kategoriebereich "${catTitle}"`;
      } else if (checkRow) {
        shortLabel = `Check: "${rawText}"`;
        details = `Checkliste / Routine`;
      } else if (tabBtn) {
        shortLabel = `Tab-Button: "${rawText}"`;
        details = `Hauptnavigation Tab`;
      } else if (rawText) {
        shortLabel = `${el.tagName.toLowerCase()}: "${rawText}"`;
        details = `Element mit Text "${rawText}"`;
      } else if (el.id) {
        shortLabel = `#${el.id}`;
        details = `Element ID: #${el.id}`;
      }

      // CSS Selector berechnen
      let selector = el.id ? `#${el.id}` : el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const mainClass = el.className.split(' ').find(c => c && !c.includes(':') && !c.includes('[') && !c.includes('/'));
        if (mainClass) selector += `.${mainClass}`;
      }

      return {
        shortLabel,
        details,
        selector,
        tab: activeTab
      };
    },

    detectActiveTab() {
      const activeBtn = document.querySelector('.tab-btn.active, .tab-btn.bg-white, .tab-btn.dark\\:bg-neutral-800');
      if (activeBtn) {
        const label = activeBtn.querySelector('span')?.innerText || activeBtn.innerText;
        return label.trim();
      }
      return 'Packliste';
    },

    // -------------------------------------------------------------------------
    // 3. Screenshot Erstellung (html2canvas)
    // -------------------------------------------------------------------------
    async captureScreenshot(targetElement = null) {
      if (!window.html2canvas) {
        this.showToast('Screenshot-Modul lädt noch... Bitte kurz warten.');
        return null;
      }

      try {
        const elementToCapture = targetElement && targetElement !== document.body ? targetElement : document.body;

        // Screenshot aufnehmen
        const canvas = await window.html2canvas(elementToCapture, {
          useCORS: true,
          allowTaint: true,
          logging: false,
          scale: 1, // normale Skalierung gegen zu große Payloads
          ignoreElements: (el) => {
            return el.id === 'feedback-inspector-highlight' ||
                   el.id === 'feedback-inspector-banner' ||
                   el.id === 'feedback-drawer' ||
                   el.id === 'modal-feedback-create' ||
                   el.id === 'modal-prompt-view' ||
                   el.id === 'btn-feedback-fab';
          }
        });

        // Bild komprimieren (max 800px Breite, JPEG 0.72)
        const maxW = 800;
        let finalCanvas = canvas;

        if (canvas.width > maxW) {
          const ratio = maxW / canvas.width;
          const scaledCanvas = document.createElement('canvas');
          scaledCanvas.width = maxW;
          scaledCanvas.height = Math.round(canvas.height * ratio);
          const ctx = scaledCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
          finalCanvas = scaledCanvas;
        }

        return finalCanvas.toDataURL('image/jpeg', 0.72);
      } catch (err) {
        console.error('Screenshot fehlgeschlagen:', err);
        return null;
      }
    },

    // -------------------------------------------------------------------------
    // 4. Modal Dialogs (Comment & Drawer)
    // -------------------------------------------------------------------------
    openCommentModal(targetContext = null, targetElement = null) {
      this.selectedTargetContext = targetContext || {
        shortLabel: 'Allgemein',
        details: 'Gesamte Seite / Übergreifend',
        selector: 'body',
        tab: this.detectActiveTab()
      };
      this.currentScreenshotData = null;

      const modal = document.getElementById('modal-feedback-create');
      if (!modal) return;

      // Felder befüllen
      const targetLabelEl = document.getElementById('fb-target-label');
      const targetTabEl = document.getElementById('fb-target-tab');
      const commentInput = document.getElementById('fb-comment-input');
      const screenshotPreview = document.getElementById('fb-screenshot-preview');
      const screenshotPreviewImg = document.getElementById('fb-screenshot-img');
      const btnTakeScreenshot = document.getElementById('fb-btn-take-screenshot');

      if (targetLabelEl) targetLabelEl.innerText = this.selectedTargetContext.shortLabel;
      if (targetTabEl) targetTabEl.innerText = `Tab: ${this.selectedTargetContext.tab}`;
      if (commentInput) {
        commentInput.value = '';
        setTimeout(() => commentInput.focus(), 150);
      }
      if (screenshotPreview) screenshotPreview.classList.add('hidden');
      if (screenshotPreviewImg) screenshotPreviewImg.src = '';

      // Automatischen Screenshot im Hintergrund vorbereiten, falls Button geklickt wird
      if (btnTakeScreenshot) {
        btnTakeScreenshot.onclick = async () => {
          btnTakeScreenshot.disabled = true;
          btnTakeScreenshot.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin mr-1"></i> Aufnahme läuft...';
          if (window.lucide) window.lucide.createIcons();

          // Temporär das Modal ausblenden für freie Sicht
          modal.classList.add('opacity-0');
          await new Promise(r => setTimeout(r, 60));

          const dataUrl = await this.captureScreenshot(targetElement);
          modal.classList.remove('opacity-0');

          btnTakeScreenshot.disabled = false;
          btnTakeScreenshot.innerHTML = '<i data-lucide="camera" class="w-3.5 h-3.5 mr-1 text-sky-500"></i> Screenshot erneuern';
          if (window.lucide) window.lucide.createIcons();

          if (dataUrl) {
            this.currentScreenshotData = dataUrl;
            if (screenshotPreviewImg) screenshotPreviewImg.src = dataUrl;
            if (screenshotPreview) screenshotPreview.classList.remove('hidden');
          }
        };
      }

      modal.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons();
    },

    closeCommentModal() {
      const modal = document.getElementById('modal-feedback-create');
      if (modal) modal.classList.add('hidden');
      this.currentScreenshotData = null;
      this.selectedTargetContext = null;
    },

    submitCommentModal() {
      const commentInput = document.getElementById('fb-comment-input');
      const comment = commentInput ? commentInput.value.trim() : '';
      if (!comment) {
        alert('Bitte gib einen kurzen Kommentar oder Verbesserungswunsch ein.');
        if (commentInput) commentInput.focus();
        return;
      }

      // Gewählte Kategorie auslesen
      const checkedCategory = document.querySelector('input[name="fb-category"]:checked');
      const category = checkedCategory ? checkedCategory.value : 'Wunsch 💡';

      this.addFeedback({
        category,
        comment,
        targetName: this.selectedTargetContext?.shortLabel || 'Allgemein',
        targetSelector: this.selectedTargetContext?.selector || '',
        activeTab: this.selectedTargetContext?.tab || this.detectActiveTab(),
        screenshot: this.currentScreenshotData
      });

      this.closeCommentModal();
    },

    // -------------------------------------------------------------------------
    // 5. Feedback Drawer & Prompt Generation
    // -------------------------------------------------------------------------
    openFeedbackDrawer() {
      const drawer = document.getElementById('feedback-drawer');
      if (!drawer) return;
      this.renderFeedbackList();
      drawer.classList.remove('translate-x-full');
      if (window.lucide) window.lucide.createIcons();
    },

    closeFeedbackDrawer() {
      const drawer = document.getElementById('feedback-drawer');
      if (drawer) drawer.classList.add('translate-x-full');
    },

    toggleFeedbackDrawer() {
      const drawer = document.getElementById('feedback-drawer');
      if (drawer) {
        if (drawer.classList.contains('translate-x-full')) {
          this.openFeedbackDrawer();
        } else {
          this.closeFeedbackDrawer();
        }
      }
    },

    renderFeedbackList() {
      const container = document.getElementById('feedback-list-container');
      const countHeader = document.getElementById('feedback-count-header');
      if (!container) return;

      if (countHeader) {
        countHeader.innerText = `${this.feedbacks.length} Punkt${this.feedbacks.length === 1 ? '' : 'e'}`;
      }

      if (this.feedbacks.length === 0) {
        container.innerHTML = `
          <div class="py-12 text-center text-neutral-400 dark:text-neutral-500 space-y-2">
            <i data-lucide="sparkles" class="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-600"></i>
            <p class="text-xs font-medium">Noch keine Feedback-Punkte vorhanden.</p>
            <p class="text-[11px] text-neutral-400">Klicke auf "🎯 Element markieren" oder nutze den Button unten, um Anmerkungen zu sammeln.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      let html = '';
      this.feedbacks.forEach(item => {
        let badgeColor = 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300';
        if (item.category.includes('Bug')) badgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';
        if (item.category.includes('Design')) badgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
        if (item.category.includes('Text')) badgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';

        html += `
          <div class="p-3 bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2 shadow-2xs transition-fast">
            <div class="flex items-start justify-between gap-2">
              <div class="flex flex-wrap items-center gap-1.5 min-w-0">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}">
                  ${item.category}
                </span>
                <span class="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[170px]" title="${item.targetName}">
                  ${item.targetName}
                </span>
                <span class="text-[10px] text-neutral-400 font-mono">
                  [${item.activeTab}]
                </span>
              </div>
              <button onclick="FeedbackService.deleteFeedback('${item.id}')" title="Löschen" class="text-neutral-400 hover:text-rose-500 p-1 rounded transition-fast">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <p class="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
              ${this.escapeHtml(item.comment)}
            </p>

            ${item.screenshot ? `
              <div class="pt-1">
                <div class="flex items-center space-x-2">
                  <img src="${item.screenshot}" alt="Screenshot" onclick="FeedbackService.previewImage('${item.screenshot}')" class="h-10 w-16 object-cover rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:opacity-80 transition-fast" />
                  <span class="text-[10px] text-neutral-400 font-mono-code">Klick zum Vergrößern</span>
                </div>
              </div>
            ` : ''}
          </div>
        `;
      });

      container.innerHTML = html;
      if (window.lucide) window.lucide.createIcons();
    },

    previewImage(src) {
      if (window.App && typeof window.App.openImageViewer === 'function') {
        window.App.openImageViewer(src);
      } else {
        const win = window.open();
        if (win) {
          win.document.write(`<img src="${src}" style="max-width:100%; height:auto;" />`);
        }
      }
    },

    updateBadge() {
      const badge = document.getElementById('feedback-badge');
      const headerBtn = document.getElementById('header-feedback-badge');
      const count = this.feedbacks.length;

      if (badge) {
        if (count > 0) {
          badge.innerText = count;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }

      if (headerBtn) {
        if (count > 0) {
          headerBtn.innerText = count;
          headerBtn.classList.remove('hidden');
        } else {
          headerBtn.classList.add('hidden');
        }
      }
    },

    // -------------------------------------------------------------------------
    // 6. KI-Prompt Generator
    // -------------------------------------------------------------------------
    generateAIPrompt() {
      if (this.feedbacks.length === 0) {
        alert('Es liegen noch keine Feedback-Punkte vor. Bitte erfasse zuerst Feedback.');
        return null;
      }

      const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      let prompt = `Hier ist gebündeltes Nutzer-Feedback zur Web-App "Reisetasche" (Stand: ${dateStr}).\n`;
      prompt += `Bitte bearbeite alle aufgeführten Punkte im Code, führe die Tests durch und pushe das fertige Update ins GitHub-Repository.\n\n`;
      prompt += `### Übersicht der Aufgaben (${this.feedbacks.length} Punkte):\n`;

      this.feedbacks.forEach((fb, index) => {
        prompt += `${index + 1}. **[${fb.category}] ${fb.targetName}** (Bereich: ${fb.activeTab}): ${fb.comment.split('\n')[0]}\n`;
      });

      prompt += `\n---\n\n### Detaillierte Feedback-Punkte:\n\n`;

      this.feedbacks.forEach((fb, index) => {
        prompt += `#### Punkt ${index + 1}: ${fb.targetName}\n`;
        prompt += `- **Bereich / Tab:** ${fb.activeTab}\n`;
        prompt += `- **Kategorie:** ${fb.category}\n`;
        if (fb.targetSelector) {
          prompt += `- **Selektor / Code-Referenz:** \`${fb.targetSelector}\`\n`;
        }
        prompt += `- **Feedback / Gewünschte Änderung:**\n  > ${fb.comment.replace(/\n/g, '\n  > ')}\n`;
        if (fb.screenshot) {
          prompt += `- **Screenshot vorhanden:** Ja (Client-Screenshot erfasst)\n`;
        }
        prompt += `\n`;
      });

      prompt += `---\n\n`;
      prompt += `### Handlungsanweisung für Antigravity:\n`;
      prompt += `1. Analysiere die betroffenen Komponenten in \`index.html\`, \`css/styles.css\` oder \`js/*.js\`.\n`;
      prompt += `2. Setze die gewünschten Anpassungen, Fehlerbehebungen und UI-Verbesserungen vollständig um.\n`;
      prompt += `3. Achte darauf, das bestehende minimalistische Design, Offline-Fähigkeit und Benutzerdaten nicht zu beschädigen.\n`;
      prompt += `4. Teste die Änderungen und pushe sie abschließend ins Git-Repository, damit die Änderungen auf GitHub Pages online sind.\n`;

      return prompt;
    },

    copyPromptToClipboard() {
      const prompt = this.generateAIPrompt();
      if (!prompt) return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(prompt).then(() => {
          this.showToast('🚀 KI-Prompt in Zwischenablage kopiert!');
          this.showPromptFallbackModal(prompt, true);
        }).catch(() => {
          this.showPromptFallbackModal(prompt, false);
        });
      } else {
        this.showPromptFallbackModal(prompt, false);
      }
    },

    showPromptFallbackModal(promptText, wasCopied = false) {
      const modal = document.getElementById('modal-prompt-view');
      const textarea = document.getElementById('prompt-text-display');
      const statusNotice = document.getElementById('prompt-copy-status');
      if (!modal || !textarea) return;

      textarea.value = promptText;
      if (statusNotice) {
        statusNotice.innerText = wasCopied 
          ? '✅ Bereits in die Zwischenablage kopiert! Du kannst den Text direkt im Chat einfügen.'
          : 'Kopiere den Text unten und füge ihn im Chat ein:';
      }

      modal.classList.remove('hidden');
    },

    closePromptModal() {
      const modal = document.getElementById('modal-prompt-view');
      if (modal) modal.classList.add('hidden');
    },

    // -------------------------------------------------------------------------
    // 7. Helpers & Event Binding
    // -------------------------------------------------------------------------
    showToast(message) {
      let toast = document.getElementById('feedback-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'feedback-toast';
        toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-[99999] bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 rounded-xl text-xs font-semibold shadow-xl transition-all duration-300 pointer-events-none opacity-0 translate-y-3';
        document.body.appendChild(toast);
      }

      toast.innerText = message;
      toast.classList.remove('opacity-0', 'translate-y-3');
      toast.classList.add('opacity-100', 'translate-y-0');

      setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-3');
      }, 2500);
    },

    escapeHtml(text) {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    bindEvents() {
      // Mouse move & click for Inspector
      document.addEventListener('mouseover', (e) => this.handleMouseOver(e));
      document.addEventListener('click', (e) => this.handleElementClick(e), true);

      // Clipboard paste listener in Comment Modal (allows pasting screenshots directly!)
      window.addEventListener('paste', (e) => {
        const modal = document.getElementById('modal-feedback-create');
        if (!modal || modal.classList.contains('hidden')) return;

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => {
              this.currentScreenshotData = event.target.result;
              const preview = document.getElementById('fb-screenshot-preview');
              const previewImg = document.getElementById('fb-screenshot-img');
              if (previewImg) previewImg.src = this.currentScreenshotData;
              if (preview) preview.classList.remove('hidden');
              this.showToast('📸 Screenshot aus Zwischenablage eingefügt!');
            };
            reader.readAsDataURL(blob);
          }
        }
      });
    }
  };

  // Expose globally
  window.FeedbackService = FeedbackService;

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FeedbackService.init());
  } else {
    FeedbackService.init();
  }
})();
