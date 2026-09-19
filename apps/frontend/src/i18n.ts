import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en/translation.json'
import hi from './locales/hi/translation.json'
import mr from './locales/mr/translation.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      // Checks localStorage first so a manual language choice survives a
      // page reload/navigation, per the spec's "no navigation reset" requirement.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n