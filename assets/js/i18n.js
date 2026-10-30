// Enhanced i18n system with dynamic language loading
class I18n {
  constructor() {
    this.currentLang = localStorage.getItem('lang') || 'en';
    this.translations = {};
    this.supportedLanguages = ['en', 'de'];
  }

  async loadLanguage(lang) {
    if (this.translations[lang]) {
      return this.translations[lang];
    }

    try {
      const self = document.querySelector('script[src$="assets/js/i18n.js"]');
      const base = self ? self.getAttribute('src').replace(/assets\/js\/i18n\.js$/, '') : '';
      const response = await fetch(`${base}assets/js/lang/${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${lang}.json`);
      }
      
      this.translations[lang] = await response.json();
      return this.translations[lang];
    } catch (error) {
      console.error(`Error loading language ${lang}:`, error);
      
      // Fallback to English if available
      if (lang !== 'en' && !this.translations['en']) {
        return await this.loadLanguage('en');
      }
      
      return {};
    }
  }

  async setLanguage(lang) {
    if (!this.supportedLanguages.includes(lang)) {
      console.warn(`Language ${lang} not supported. Using English.`);
      lang = 'en';
    }

    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang-btn]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.langBtn === lang));
    });
    
    await this.loadLanguage(lang);
    this.updatePageContent();
    this.updatePortfolioSummary();
    
    // Update quotes if loading screen is visible
    const loadingWindow = document.getElementById('loadingWindow');
    if (loadingWindow && loadingWindow.style.display !== 'none' && typeof cycleQuotes === 'function') {
      cycleQuotes();
    }
    
    // Trigger custom event for other components
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  }

  t(key, fallback = null, variables = {}) {
    const langData = this.translations[this.currentLang];
    let translation = null;
    
    if (langData && langData[key]) {
      translation = langData[key];
    } else {
      // Fallback to English
      const enData = this.translations['en'];
      if (enData && enData[key]) {
        translation = enData[key];
      }
    }
    
    if (!translation) {
      return fallback || key;
    }
    
    // If translation is an array, return it as-is (for quotes, etc.)
    if (Array.isArray(translation)) {
      return translation;
    }
    
    // Replace template variables for strings
    if (typeof translation === 'string') {
      return translation.replace(/\{(\w+)\}/g, (match, varName) => {
        return variables[varName] || match;
      });
    }
    
    // Return as-is for other types
    return translation;
  }

  updatePageContent() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      if (element.tagName === 'INPUT' && element.type === 'text') {
        element.placeholder = translation;
      } else if (element.tagName === 'INPUT' && element.type === 'submit') {
        element.value = translation;
      } else {
        element.innerHTML = translation;
      }
    });

    // Update document title
    document.title = this.t('siteTitle');
  }

  updatePortfolioSummary() {
    // Update real estate text
    const realEstateElement = document.getElementById('realEstateText');
    const realEstateValueElement = document.getElementById('realEstateValue');
    if (realEstateElement && realEstateValueElement) {
      const realEstateValue = realEstateValueElement.textContent;
      const realEstateType = this.t('realEstateValue');
      realEstateElement.innerHTML = this.t('realEstateValueText', '', {
        realEstateType: realEstateType,
        value: realEstateValue
      });
    }

    // Update bitcoin text
    const bitcoinElement = document.getElementById('bitcoinText');
    const valueAElement = document.getElementById('valueA');
    const valueBElement = document.getElementById('valueB');
    const avgFlag2Element = document.getElementById('avgFlag2');
    if (bitcoinElement && valueAElement) {
      const bitcoinType = this.t('bitcoinValue');
      let valueRange = valueAElement.textContent;
      if (valueBElement && valueBElement.textContent && avgFlag2Element) {
        valueRange += avgFlag2Element.textContent + valueBElement.textContent;
      }
      bitcoinElement.innerHTML = this.t('bitcoinValueText', '', {
        bitcoinType: bitcoinType,
        valueRange: valueRange
      });
    }

    // Update combined portfolio text
    const combinedElement = document.getElementById('combinedPortfolioText');
    const combinedMinElement = document.getElementById('combinedValueMin');
    const combinedMaxElement = document.getElementById('combinedValueMax');
    const avgFlag1Element = document.getElementById('avgFlag1');
    if (combinedElement && combinedMinElement) {
      const portfolioType = this.t('combinedPortfolio');
      let valueRange = combinedMinElement.textContent;
      if (combinedMaxElement && combinedMaxElement.textContent && avgFlag1Element) {
        valueRange += avgFlag1Element.textContent + combinedMaxElement.textContent;
      }
      combinedElement.innerHTML = this.t('combinedPortfolioText', '', {
        portfolioType: portfolioType,
        valueRange: valueRange
      });
    }

    // Update btc accounts for text
    const btcAccountsElement = document.getElementById('btcAccountsForText');
    if (btcAccountsElement) {
      btcAccountsElement.innerHTML = this.t('btcAccountsForText', '', {
        percentage: '' // This will be filled by the existing spans
      }).replace('{percentage}%', '');
    }
  }

  async init() {
    document.querySelectorAll('[data-lang-btn]').forEach((b) => {
      b.addEventListener('click', () => this.setLanguage(b.dataset.langBtn));
    });
    await this.setLanguage(this.currentLang);
  }
}

// Initialize global i18n instance
window.i18n = new I18n();

// Backward compatibility - expose translations on window for existing code
window.translations = new Proxy({}, {
  get: (target, prop) => {
    if (prop === window.i18n.currentLang) {
      return window.i18n.translations[prop] || {};
    }
    return window.i18n.translations[prop] || {};
  }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.i18n.init();
});