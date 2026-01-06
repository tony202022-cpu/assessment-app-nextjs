// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

// Public (safe) env vars for browser usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Exported singleton client used across the app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
