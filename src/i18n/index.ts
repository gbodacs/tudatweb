import translations from './translations.json';

export type Language = 'hu' | 'en' | 'de';

const DEFAULT_LANGUAGE: Language = 'hu';
const SUPPORTED_LANGUAGES: Language[] = ['hu', 'en', 'de'];
const LANGUAGE_COOKIE_NAME = 'tudatai_language';

export interface I18nContext {
  language: Language;
  t: (key: string) => string;
  availableLanguages: Language[];
}

/**
 * Get language from query parameter, cookie, or default
 */
export function getLanguageFromRequest(req: any): Language {
  // Check query parameter first
  if (req.query?.lang && SUPPORTED_LANGUAGES.includes(req.query.lang)) {
    return req.query.lang as Language;
  }

  // Check cookie
  const cookies = parseCookies(req);
  const cookieLang = cookies[LANGUAGE_COOKIE_NAME];
  if (cookieLang && (SUPPORTED_LANGUAGES as string[]).includes(cookieLang)) {
    return cookieLang as Language;
  }

  // Default
  return DEFAULT_LANGUAGE;
}

/**
 * Parse cookies from request header
 */
function parseCookies(req: any): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach((cookie: string) => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = decodeURIComponent(value || '');
    });
  }
  return cookies;
}

/**
 * Get translation function for a given language
 */
export function getTranslationFunction(language: Language): (key: string) => string {
  const lang = translations[language as keyof typeof translations] || translations.hu;

  return (key: string): string => {
    const keys = key.split('.');
    let result: any = lang;

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        // Fallback to Hungarian if translation not found
        result = translations.hu;
        for (const k2 of keys) {
          if (result && typeof result === 'object' && k2 in result) {
            result = result[k2];
          } else {
            return key; // Return key if not found
          }
        }
      }
    }

    return typeof result === 'string' ? result : key;
  };
}

/**
 * Create i18n context for a request
 */
export function createI18nContext(req: any): I18nContext {
  const language = getLanguageFromRequest(req);
  return {
    language,
    t: getTranslationFunction(language),
    availableLanguages: SUPPORTED_LANGUAGES,
  };
}

/**
 * Get language cookie set header
 */
export function getLanguageCookieHeader(language: Language): string {
  const maxAge = 365 * 24 * 60 * 60; // 1 year
  return `${LANGUAGE_COOKIE_NAME}=${language}; Max-Age=${maxAge}; Path=/`;
}

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, LANGUAGE_COOKIE_NAME };
