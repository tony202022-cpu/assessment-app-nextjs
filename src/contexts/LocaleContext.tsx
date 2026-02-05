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

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  // Initialize with a stable value that matches the server's default
  const [language, setLanguageState] = useState<Language>("en");
  const [direction, setDirection] = useState<Direction>("ltr");
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle initial language load from localStorage after hydration
  useEffect(() => {
    const stored = localStorage.getItem("language");
    if (stored === "ar" || stored === "en") {
      setLanguageState(stored as Language);
      setDirection(stored === "ar" ? "rtl" : "ltr");
    }
    setIsHydrated(true);
  }, []);

  // Update document attributes when language/direction changes
  useEffect(() => {
    if (!isHydrated) return;
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction, isHydrated]);

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