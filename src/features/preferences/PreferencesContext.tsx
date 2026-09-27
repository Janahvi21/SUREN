import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Language = 'en' | 'mr' | 'hi'
export type Theme = 'light' | 'dark' | 'system'

type TranslationKey = 'overview' | 'resources' | 'requests' | 'transactions' | 'analytics' | 'demand' | 'matching' | 'users' | 'map' | 'profile' | 'settings' | 'signOut' | 'dashboard' | 'systemNote' | 'welcome'

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: { overview: 'Overview', resources: 'Resources', requests: 'Requests', transactions: 'Transactions', analytics: 'Analytics', demand: 'Demand', matching: 'Matching', users: 'Users', map: 'Map', profile: 'Profile', settings: 'Settings', signOut: 'Sign out', dashboard: 'Dashboard', systemNote: 'System note', welcome: 'Welcome' },
  mr: { overview: 'आढावा', resources: 'संसाधने', requests: 'विनंत्या', transactions: 'व्यवहार', analytics: 'विश्लेषण', demand: 'मागणी', matching: 'जुळणी', users: 'वापरकर्ते', map: 'नकाशा', profile: 'प्रोफाइल', settings: 'सेटिंग्ज', signOut: 'साइन आउट', dashboard: 'डॅशबोर्ड', systemNote: 'सिस्टम नोंद', welcome: 'स्वागत' },
  hi: { overview: 'अवलोकन', resources: 'संसाधन', requests: 'अनुरोध', transactions: 'लेन-देन', analytics: 'विश्लेषण', demand: 'मांग', matching: 'मिलान', users: 'उपयोगकर्ता', map: 'मानचित्र', profile: 'प्रोफ़ाइल', settings: 'सेटिंग्स', signOut: 'साइन आउट', dashboard: 'डैशबोर्ड', systemNote: 'सिस्टम नोट', welcome: 'स्वागत' },
}

type PreferencesContextValue = { language: Language; theme: Theme; setLanguage: (language: Language) => void; setTheme: (theme: Theme) => void; t: (key: TranslationKey) => string }
const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined)

function getStored<T extends string>(key: string, fallback: T): T {
  const value = window.localStorage.getItem(key)
  return (value as T | null) ?? fallback
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => getStored('suren-language', 'en'))
  const [theme, setThemeState] = useState<Theme>(() => getStored('suren-theme', 'system'))

  useEffect(() => {
    window.localStorage.setItem('suren-language', language)
  }, [language])

  useEffect(() => {
    window.localStorage.setItem('suren-theme', theme)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.dataset.theme = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  }, [theme])

  return <PreferencesContext.Provider value={{ language, theme, setLanguage: setLanguageState, setTheme: setThemeState, t: (key) => translations[language][key] }}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences must be used within PreferencesProvider')
  return context
}
