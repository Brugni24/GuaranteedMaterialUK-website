/**
 * Guaranteed Material UK Ltd - Cookie Consent & Google Analytics 4 Module
 * 
 * Implements:
 * - UK GDPR / PECR & EU GDPR Compliant Prior Consent (Opt-in)
 * - Google Consent Mode v2 (Basic Mode: no tag injection or network ping prior to explicit consent)
 * - Accessible, responsive UI (Banner + Preferences Modal)
 * - Centralized GA4 configuration
 * - Persistent choice in localStorage with revocation / settings trigger support
 */

(function () {
    'use strict';

    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    // Inserisci qui il tuo Measurement ID di Google Analytics quando avrai l'account.
    // Esempio: const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
    const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

    const CONSENT_STORAGE_KEY = 'gmuk_cookie_consent';
    const CONSENT_VERSION = '1.0';
    const CONSENT_EXPIRY_DAYS = 365; // Durata massima validità consenso (12 mesi raccomandati da ICO)

    // =========================================================================
    // GOOGLE CONSENT MODE v2 - INIZIALIZZAZIONE IMMEDIATA (DEFAULT: DENIED)
    // =========================================================================
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    // Imposta lo stato di default su "denied" prima di qualsiasi caricamento o evento
    gtag('consent', 'default', {
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
        'wait_for_update': 500
    });

    let gaScriptInjected = false;

    /**
     * Valida il Measurement ID (deve iniziare con G-, non essere vuoto o il placeholder)
     */
    function isValidMeasurementId(id) {
        return typeof id === 'string' &&
            id.trim().startsWith('G-') &&
            id.trim() !== 'G-XXXXXXXXXX' &&
            id.trim().length > 4;
    }

    /**
     * Carica lo script di GA4 e invia l'evento di configurazione (eseguito solo se acconsentito)
     */
    function enableGoogleAnalytics() {
        if (!isValidMeasurementId(GA_MEASUREMENT_ID)) {
            // ID assente o segnaposto: nessun caricamento, nessun errore
            return;
        }

        // Se era stato precedentemente disabilitato nella sessione
        window['ga-disable-' + GA_MEASUREMENT_ID] = false;

        // Aggiorna Google Consent Mode v2 a granted
        gtag('consent', 'update', {
            'analytics_storage': 'granted'
        });

        // Inietta lo script di GA4 solo se non è già presente
        if (!gaScriptInjected) {
            gaScriptInjected = true;
            const script = document.createElement('script');
            script.async = true;
            script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
            document.head.appendChild(script);

            gtag('js', new Date());
            gtag('config', GA_MEASUREMENT_ID);
        }
    }

    /**
     * Disabilita Google Analytics e cancella i cookie per quanto tecnicamente possibile
     */
    function disableGoogleAnalytics() {
        if (isValidMeasurementId(GA_MEASUREMENT_ID)) {
            window['ga-disable-' + GA_MEASUREMENT_ID] = true;
        }

        gtag('consent', 'update', {
            'analytics_storage': 'denied'
        });

        // Rimozione cookie di GA (_ga, _gid, _ga_*)
        try {
            const cookies = document.cookie.split(';');
            const hostname = window.location.hostname;
            const domains = [
                hostname,
                '.' + hostname,
                hostname.replace(/^www\./, ''),
                '.' + hostname.replace(/^www\./, '')
            ];

            cookies.forEach(function (c) {
                const name = c.split('=')[0].trim();
                if (name === '_ga' || name === '_gid' || name.startsWith('_ga_')) {
                    domains.forEach(function (domain) {
                        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + domain + '; SameSite=Lax';
                    });
                    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
                }
            });
        } catch (e) {
            // Ignore cookie clear exceptions in restricted contexts
        }
    }

    // =========================================================================
    // GESTIONE STATO CONSENSO IN LOCALSTORAGE
    // =========================================================================
    function getStoredConsent() {
        try {
            const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || data.version !== CONSENT_VERSION || !data.timestamp) return null;

            // Verifica scadenza temporale
            const ageMs = Date.now() - new Date(data.timestamp).getTime();
            const maxAgeMs = CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
            if (ageMs > maxAgeMs) {
                localStorage.removeItem(CONSENT_STORAGE_KEY);
                return null;
            }
            return data;
        } catch (e) {
            return null;
        }
    }

    function saveConsent(analyticsAccepted) {
        const consentData = {
            version: CONSENT_VERSION,
            timestamp: new Date().toISOString(),
            necessary: true,
            analytics: Boolean(analyticsAccepted)
        };
        try {
            localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData));
        } catch (e) {
            // Ignore localStorage errors (e.g. storage full / private mode)
        }

        if (analyticsAccepted) {
            enableGoogleAnalytics();
        } else {
            disableGoogleAnalytics();
        }
        hideBanner();
        hideModal();
    }

    // =========================================================================
    // INIEZIONE STILI CSS PER IL BANNER E LA MODALE (ISOLATI E ACCESSIBILI)
    // =========================================================================
    function injectStyles() {
        if (document.getElementById('gmuk-cookie-styles')) return;
        const style = document.createElement('style');
        style.id = 'gmuk-cookie-styles';
        style.textContent = `
            .gmuk-cookie-banner {
                position: fixed;
                bottom: 1.25rem;
                right: 1.25rem;
                left: 1.25rem;
                max-width: 540px;
                background-color: #ffffff;
                color: #1a1a1a;
                border-radius: 1rem;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                border: 1px solid #e5e7eb;
                padding: 1.5rem;
                z-index: 99998;
                font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                transform: translateY(120%);
                opacity: 0;
                transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
                display: none;
            }
            @media (min-width: 640px) {
                .gmuk-cookie-banner {
                    left: auto;
                    right: 1.5rem;
                    bottom: 1.5rem;
                }
            }
            .gmuk-cookie-banner.gmuk-visible {
                display: block;
                transform: translateY(0);
                opacity: 1;
            }
            .gmuk-cookie-modal-overlay {
                position: fixed;
                inset: 0;
                background-color: rgba(0, 0, 0, 0.55);
                backdrop-filter: blur(3px);
                -webkit-backdrop-filter: blur(3px);
                z-index: 99999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                opacity: 0;
                transition: opacity 0.25s ease;
            }
            .gmuk-cookie-modal-overlay.gmuk-visible {
                display: flex;
                opacity: 1;
            }
            .gmuk-cookie-modal {
                background: #ffffff;
                color: #1a1a1a;
                width: 100%;
                max-width: 580px;
                max-height: 90vh;
                overflow-y: auto;
                border-radius: 1.25rem;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                border: 1px solid #e5e7eb;
                padding: 1.75rem;
                position: relative;
                font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                transform: scale(0.95);
                transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .gmuk-cookie-modal-overlay.gmuk-visible .gmuk-cookie-modal {
                transform: scale(1);
            }
            .gmuk-btn-primary {
                background-color: #214339;
                color: #ffffff;
                border: 1.5px solid #214339;
                border-radius: 9999px;
                font-size: 0.875rem;
                font-weight: 600;
                padding: 0.625rem 1.25rem;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            .gmuk-btn-primary:hover {
                background-color: #17322a;
                border-color: #17322a;
            }
            .gmuk-btn-primary:focus-visible {
                outline: 2px solid #214339;
                outline-offset: 2px;
            }
            .gmuk-btn-secondary {
                background-color: #ffffff;
                color: #1a1a1a;
                border: 1.5px solid #d1d5db;
                border-radius: 9999px;
                font-size: 0.875rem;
                font-weight: 600;
                padding: 0.625rem 1.25rem;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            .gmuk-btn-secondary:hover {
                background-color: #f3f4f6;
                border-color: #9ca3af;
            }
            .gmuk-btn-secondary:focus-visible {
                outline: 2px solid #214339;
                outline-offset: 2px;
            }
            .gmuk-btn-text {
                background: none;
                border: none;
                color: #555555;
                font-size: 0.8125rem;
                font-weight: 500;
                text-decoration: underline;
                text-underline-offset: 3px;
                cursor: pointer;
                padding: 0.35rem 0.5rem;
                transition: color 0.2s ease;
            }
            .gmuk-btn-text:hover {
                color: #1a1a1a;
            }
            .gmuk-btn-text:focus-visible {
                outline: 2px solid #214339;
                outline-offset: 2px;
                border-radius: 4px;
            }
            .gmuk-toggle {
                position: relative;
                display: inline-block;
                width: 44px;
                height: 24px;
                flex-shrink: 0;
            }
            .gmuk-toggle input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .gmuk-slider {
                position: absolute;
                cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: #d1d5db;
                transition: 0.25s;
                border-radius: 24px;
            }
            .gmuk-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: 0.25s;
                border-radius: 50%;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            }
            .gmuk-toggle input:checked + .gmuk-slider {
                background-color: #214339;
            }
            .gmuk-toggle input:focus-visible + .gmuk-slider {
                outline: 2px solid #214339;
                outline-offset: 2px;
            }
            .gmuk-toggle input:checked + .gmuk-slider:before {
                transform: translateX(20px);
            }
            .gmuk-toggle input:disabled + .gmuk-slider {
                background-color: #9ca3af;
                cursor: not-allowed;
                opacity: 0.7;
            }
        `;
        document.head.appendChild(style);
    }

    // =========================================================================
    // CREAZIONE INTERFACCIA UTENTE (BANNER & MODALE PREFERENZE)
    // =========================================================================
    let bannerElement = null;
    let modalElement = null;

    function createBanner() {
        if (document.getElementById('gmuk-cookie-banner')) return;

        const banner = document.createElement('aside');
        banner.id = 'gmuk-cookie-banner';
        banner.className = 'gmuk-cookie-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Cookie consent banner');

        banner.innerHTML = `
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #214339;"></span>
                    <span style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #214339;">Privacy & Cookies</span>
                </div>
            </div>
            <h2 style="font-size: 1.125rem; font-weight: 700; color: #1a1a1a; margin: 0 0 0.5rem 0; line-height: 1.3;">
                We Value Your Privacy
            </h2>
            <p style="font-size: 0.8125rem; color: #555555; line-height: 1.55; margin: 0 0 1rem 0;">
                We use strictly necessary cookies to ensure the proper functioning and security of our website. With your consent, we would also like to use optional analytics cookies (Google Analytics 4) to collect aggregated data to help us understand site usage and improve our roofing systems content.
            </p>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;">
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    <button type="button" id="gmuk-accept-all-banner" class="gmuk-btn-primary" style="flex: 1 1 auto; min-width: 130px;">
                        Accept All
                    </button>
                    <button type="button" id="gmuk-reject-all-banner" class="gmuk-btn-secondary" style="flex: 1 1 auto; min-width: 130px;">
                        Reject Non-Essential
                    </button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem;">
                    <button type="button" id="gmuk-open-preferences-banner" class="gmuk-btn-text">
                        Customize Preferences
                    </button>
                    <a href="/legal/cookies/" class="gmuk-btn-text" style="color: #6b7280;">
                        Read Policy
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
        bannerElement = banner;

        document.getElementById('gmuk-accept-all-banner').addEventListener('click', function () {
            saveConsent(true);
        });
        document.getElementById('gmuk-reject-all-banner').addEventListener('click', function () {
            saveConsent(false);
        });
        document.getElementById('gmuk-open-preferences-banner').addEventListener('click', function () {
            hideBanner();
            showModal();
        });
    }

    function createModal() {
        if (document.getElementById('gmuk-cookie-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'gmuk-cookie-modal-overlay';
        overlay.className = 'gmuk-cookie-modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'gmuk-modal-title');

        overlay.innerHTML = `
            <div class="gmuk-cookie-modal" id="gmuk-cookie-modal">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.75rem;">
                    <div>
                        <span style="font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #214339; display: block; margin-bottom: 0.25rem;">Guaranteed Material UK</span>
                        <h2 id="gmuk-modal-title" style="font-size: 1.25rem; font-weight: 700; color: #1a1a1a; margin: 0; line-height: 1.3;">
                            Cookie & Privacy Preferences
                        </h2>
                    </div>
                    <button type="button" id="gmuk-close-modal-btn" aria-label="Close cookie preferences dialog" style="background: none; border: none; font-size: 1.5rem; line-height: 1; color: #6b7280; cursor: pointer; padding: 0.25rem; border-radius: 4px;">
                        &times;
                    </button>
                </div>

                <p style="font-size: 0.8125rem; color: #555555; line-height: 1.55; margin-bottom: 1.25rem;">
                    You can choose which categories of cookies to enable. Strictly necessary cookies cannot be disabled as they are required for basic site operations and security. For more details, consult our <a href="/legal/cookies/" style="color: #214339; font-weight: 600; text-decoration: underline;">Cookie Policy</a>.
                </p>

                <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
                    <!-- Categoria 1: Strettamente Necessari -->
                    <div style="border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1rem; background-color: #f9fafb;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.375rem;">
                            <span style="font-size: 0.875rem; font-weight: 700; color: #1a1a1a;">1. Strictly Necessary Cookies</span>
                            <span style="font-size: 0.6875rem; font-weight: 600; color: #214339; background: #e6edea; padding: 0.25rem 0.5rem; border-radius: 9999px;">Always Active</span>
                        </div>
                        <p style="font-size: 0.75rem; color: #6b7280; margin: 0; line-height: 1.5;">
                            Required for navigation, form safety, core platform stability, and remembering your cookie consent status. They do not store personally identifiable info.
                        </p>
                    </div>

                    <!-- Categoria 2: Analitici / Prestazionali -->
                    <div style="border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1rem; background-color: #ffffff;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.375rem;">
                            <label for="gmuk-analytics-toggle" style="font-size: 0.875rem; font-weight: 700; color: #1a1a1a; cursor: pointer;">
                                2. Performance & Analytics Cookies
                            </label>
                            <label class="gmuk-toggle" for="gmuk-analytics-toggle">
                                <input type="checkbox" id="gmuk-analytics-toggle">
                                <span class="gmuk-slider"></span>
                            </label>
                        </div>
                        <p style="font-size: 0.75rem; color: #6b7280; margin: 0; line-height: 1.5;">
                            Google Analytics 4 helps us measure website traffic, user journeys, and popular roofing systems using aggregated, pseudonymous metrics. No tracking scripts run unless enabled.
                        </p>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 0.625rem; border-top: 1px solid #e5e7eb; padding-top: 1rem;">
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: flex-end;">
                        <button type="button" id="gmuk-save-preferences-btn" class="gmuk-btn-primary" style="flex: 1 1 auto; min-width: 140px;">
                            Save My Preferences
                        </button>
                        <button type="button" id="gmuk-reject-all-modal-btn" class="gmuk-btn-secondary" style="flex: 1 1 auto; min-width: 140px;">
                            Reject Non-Essential
                        </button>
                        <button type="button" id="gmuk-accept-all-modal-btn" class="gmuk-btn-primary" style="flex: 1 1 100%; background-color: #17322a;">
                            Accept All
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        modalElement = overlay;

        // Gestione eventi modale
        document.getElementById('gmuk-close-modal-btn').addEventListener('click', hideModal);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                hideModal();
            }
        });

        // Tasto Escape per chiudere
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.classList.contains('gmuk-visible')) {
                hideModal();
            }
        });

        document.getElementById('gmuk-save-preferences-btn').addEventListener('click', function () {
            const isAnalyticsChecked = document.getElementById('gmuk-analytics-toggle').checked;
            saveConsent(isAnalyticsChecked);
        });

        document.getElementById('gmuk-reject-all-modal-btn').addEventListener('click', function () {
            saveConsent(false);
        });

        document.getElementById('gmuk-accept-all-modal-btn').addEventListener('click', function () {
            saveConsent(true);
        });
    }

    function showBanner() {
        if (!bannerElement) createBanner();
        bannerElement.classList.add('gmuk-visible');
    }

    function hideBanner() {
        if (bannerElement) {
            bannerElement.classList.remove('gmuk-visible');
        }
    }

    function showModal() {
        if (!modalElement) createModal();
        // Aggiorna lo stato della checkbox in base al consenso attuale salvato
        const currentConsent = getStoredConsent();
        const toggle = document.getElementById('gmuk-analytics-toggle');
        if (toggle) {
            toggle.checked = currentConsent ? Boolean(currentConsent.analytics) : false;
        }
        modalElement.classList.add('gmuk-visible');
        const closeBtn = document.getElementById('gmuk-close-modal-btn');
        if (closeBtn) closeBtn.focus();
    }

    function hideModal() {
        if (modalElement) {
            modalElement.classList.remove('gmuk-visible');
        }
    }

    // =========================================================================
    // COLLEGAMENTO TRIGGER "COOKIE SETTINGS" NEL FOOTER
    // =========================================================================
    function bindTriggers() {
        // Cerca bottoni o link con classe o ID cookie-settings
        const triggers = document.querySelectorAll('.cookie-settings-trigger, #open-cookie-settings, [data-open-cookie-settings]');
        triggers.forEach(function (trigger) {
            trigger.removeEventListener('click', showModal);
            trigger.addEventListener('click', function (e) {
                e.preventDefault();
                showModal();
            });
        });
    }

    // =========================================================================
    // INIZIALIZZAZIONE ALL'AVVIO
    // =========================================================================
    function init() {
        injectStyles();
        createBanner();
        createModal();
        bindTriggers();

        const stored = getStoredConsent();
        if (stored === null) {
            // Nessun consenso registrato: mostra il banner
            showBanner();
        } else {
            // Consenso già presente: applicalo
            if (stored.analytics === true) {
                enableGoogleAnalytics();
            } else {
                disableGoogleAnalytics();
            }
        }
    }

    // Esegui quando il DOM è pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Esponi per eventuale controllo programmatico o debug
    window.GMUK_COOKIE_CONSENT = {
        openSettings: showModal,
        getConsent: getStoredConsent,
        resetConsent: function () {
            localStorage.removeItem(CONSENT_STORAGE_KEY);
            disableGoogleAnalytics();
            showBanner();
        },
        measurementId: GA_MEASUREMENT_ID
    };

})();
