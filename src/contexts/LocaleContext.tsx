"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';
type Direction = 'ltr' | 'rtl';

interface LocaleContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [direction, setDirection] = useState<Direction>('ltr');

  useEffect(() => {
    // Initialize language from localStorage or default to 'en'
    const storedLang = localStorage.getItem('language') as Language;
    if (storedLang) {
      setLanguageState(storedLang);
      setDirection(storedLang === 'ar' ? 'rtl' : 'ltr');
    }
  }, []);

  useEffect(() => {
    // Set the dir attribute on the html element
    document.documentElement.dir = direction;
  }, [direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setDirection(lang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('language', lang);
  };

  return (
    <LocaleContext.Provider value={{ language, direction, setLanguage }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};