import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (client) return client;
  const url =
    import.meta.env.PUBLIC_SUPABASE_URL ||
    "https://siutrwucljacdkkqyxnp.supabase.co";
  const key =
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpdXRyd3VjbGphY2Rra3F5eG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzEzNjgsImV4cCI6MjA5MDIwNzM2OH0.JwXLwVIzUgPZXLVzr5_51CYjuAMzHWnhPwZiII-2LIo";
  if (!url || !key) {
    console.error(
      "ScarTech: defina PUBLIC_SUPABASE_URL e PUBLIC_SUPABASE_ANON_KEY (ex.: .env)"
    );
  }
  client = createClient(url, key);
  return client;
}
