"use client";

import React from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const { language, setLanguage } = useLocale();
  const { user } = useSession();
  const isArabic = language === "ar";

  const handleLanguageToggle = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="w-full flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
          LU
        </div>
        <span className="font-black text-slate-900 hidden sm:inline-block">
          LevelUp
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLanguageToggle}
          className="flex items-center gap-2 text-slate-600"
        >
          <Globe size={18} />
          <span className="font-bold">{language === "en" ? "العربية" : "English"}</span>
        </Button>

        {user ? (
          <DropdownMenu dir={isArabic ? "rtl" : "ltr"}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full border-2 border-blue-100">
                <User size={20} className="text-blue-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-bold">
                {user.user_metadata?.full_name || user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 font-bold cursor-pointer">
                <LogOut size={16} className={isArabic ? "ml-2" : "mr-2"} />
                {isArabic ? "تسجيل الخروج" : "Logout"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
};

export default Header;