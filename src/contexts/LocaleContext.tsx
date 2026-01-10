"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "ar";
type Direction = "ltr" | "rtl";

interface LocaleContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// Read language immediately on first render (prevents "English flash")
const getInitialLanguage = (): Language => {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("language");
  if (stored === "ar" || stored === "en") return stored;
  return "en";
};

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const initialLang = getInitialLanguage();

  const [language, setLanguageState] = useState<Language>(initialLang);
  const [direction, setDirection] = useState<Direction>(
    initialLang === "ar" ? "rtl" : "ltr"
  );

  // Sync <html dir> with selected language
  useEffect(() => {
    document.documentElement.dir = direction;
  }, [direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setDirection(lang === "ar" ? "rtl" : "ltr");
    localStorage.setItem("language", lang);
  };

  return (
    <LocaleContext.Provider value={{ language, direction, setLanguage }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
};
