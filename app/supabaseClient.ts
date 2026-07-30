import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

export const cloudConfiguration = {
  ready: Boolean(supabaseUrl && supabasePublishableKey),
  missing: [
    !supabaseUrl ? "VITE_SUPABASE_URL" : "",
    !supabasePublishableKey ? "VITE_SUPABASE_PUBLISHABLE_KEY" : "",
  ].filter(Boolean),
};

export const supabase: SupabaseClient | null = cloudConfiguration.ready
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storageKey: "up-training-center-cloud-session",
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "El servicio de cuentas todavía no está conectado. Configura las claves públicas de Supabase.",
    );
  }
  return supabase;
}
