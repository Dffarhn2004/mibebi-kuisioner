import { createClient } from "@supabase/supabase-js";

function cleanEnvValue(value) {
  if (!value) return "";
  let cleaned = String(value).trim();
  if (
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('"') && cleaned.endsWith('"'))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (cleaned.endsWith(";")) {
    cleaned = cleaned.slice(0, -1).trim();
  }
  return cleaned;
}

export function createServiceClient() {
  const supabaseUrl = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anonKey = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const key = serviceKey || anonKey;

  if (!supabaseUrl || !key) {
    throw new Error(
      "Supabase env belum lengkap. Set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
