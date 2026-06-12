/**
 * Supported locales. Used by:
 *   - Per-configurator translation editor (BuilderTranslations)
 *   - API Demo language selector (BuilderApiDemo)
 *   - Future CMS-wide i18n
 *
 * Keep `code` aligned with ISO 639-1 so it can be used as `?lang=` value
 * and as the HTML `lang` attribute.
 */
export const LOCALES = {
  en: { name: 'English' },
  et: { name: 'Eesti' },
  fi: { name: 'Suomi' },
  lv: { name: 'Latviešu' },
  lt: { name: 'Lietuvių' },
  ru: { name: 'Русский' },
  de: { name: 'Deutsch' },
  sv: { name: 'Svenska' },
  pl: { name: 'Polski' },
}

export const DEFAULT_LOCALE = 'en'
