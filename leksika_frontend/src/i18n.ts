import { createI18n } from 'vue-i18n';

// Import locale files
import id from './locales/id';
import en from './locales/en';
import ru from './locales/ru';
import ar from './locales/ar';
import de from './locales/de';
import el from './locales/el';
import es from './locales/es';
import fr from './locales/fr';
import hi from './locales/hi';
import it from './locales/it';
import ja from './locales/ja';
import ko from './locales/ko';
import pt from './locales/pt';
import zh from './locales/zh';

const messages = {
  id,
  en,
  ru,
  ar,
  de,
  el,
  es,
  fr,
  hi,
  it,
  ja,
  ko,
  pt,
  zh,
};

// Define Message Schema based on English (fallback)
export type MessageSchema = typeof en;

declare module 'vue-i18n' {
  // Define custom locale message type
  export interface DefineLocaleMessage extends MessageSchema {}
}

const i18n = createI18n<[MessageSchema], 'id' | 'en'>({
  legacy: false, // Use Composition API
  locale: 'id', // Default locale
  fallbackLocale: 'en', // Fallback locale
  messages,
});

export default i18n;
