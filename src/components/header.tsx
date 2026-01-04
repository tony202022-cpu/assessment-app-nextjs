"use client";

import React from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/button";

const Header = () => {
  const { language, setLanguage } = useLocale();

  const handleLanguageToggle = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  return (
    <header className="w-full flex items-center justify-end p-4 bg-white/60 backdrop-blur border-b">
      <Button variant="outline" onClick={handleLanguageToggle}>
        {language === "en" ? "العربية" : "English"}
      </Button>
    </header>
  );
};

export default Header;
