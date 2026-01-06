"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useLocale } from '@/contexts/LocaleContext';
import { getTranslation } from '@/lib/translations';
import Header from '@/components/header';

export default function LoginPage() {
  const { language } = useLocale();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-6">
            {getTranslation('login', language)}
          </h1>
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary-foreground))',
                  },
                },
              },
            }}
            theme="light"
            localization={{
              variables: {
                sign_in: {
                  email_label: getTranslation('email', language),
                  password_label: getTranslation('password', language),
                  email_input_placeholder: getTranslation('yourEmail', language),
                  password_input_placeholder: getTranslation('yourPassword', language),
                  button_label: getTranslation('signIn', language),
                  social_provider_text: getTranslation('signInWith', language),
                  link_text: getTranslation('alreadyHaveAccount', language),
                },
                sign_up: {
                  email_label: getTranslation('email', language),
                  password_label: getTranslation('password', language),
                  email_input_placeholder: getTranslation('yourEmail', language),
                  password_input_placeholder: getTranslation('yourPassword', language),
                  button_label: getTranslation('signUp', language),
                  social_provider_text: getTranslation('signUpWith', language),
                  link_text: getTranslation('dontHaveAccount', language),
                },
                forgotten_password: {
                  email_label: getTranslation('email', language),
                  email_input_placeholder: getTranslation('yourEmail', language),
                  button_label: getTranslation('sendResetInstructions', language),
                  link_text: getTranslation('forgotPassword', language),
                },
                update_password: {
                  password_label: getTranslation('newPassword', language),
                  password_input_placeholder: getTranslation('yourNewPassword', language),
                  button_label: getTranslation('updatePassword', language),
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}