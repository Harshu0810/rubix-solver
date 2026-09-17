/**
 * Supabase Client Singleton
 *
 * The "anon" key below is meant to be public — unlike a password, it's safe
 * to ship in the client bundle. It only identifies which Supabase project
 * to talk to; it grants no access by itself. Real access control lives in
 * the Row Level Security policies (see supabase/schema.sql), which run
 * inside Postgres and can't be edited or bypassed from the browser.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client = null;
let _configured = true;

// Check if Supabase is actually configured (env vars are set to real values)
if (
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_URL === 'https://your-project-ref.supabase.co' ||
  SUPABASE_ANON_KEY === 'your-anon-public-key'
) {
  _configured = false;
  console.warn(
    '⚠️ Supabase is not configured. The app will work in offline/demo mode. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable backend features.'
  );
}

/**
 * Returns the Supabase client instance, or null if not configured.
 * Callers should always check for null and fall back gracefully.
 */
export function getSupabase() {
  if (!_configured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Persist the user's/admin's session in localStorage so a page
        // refresh doesn't log them out. This is safe: what's stored is a
        // signed JWT verified server-side on every request.
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

/**
 * Returns true if the Supabase environment variables are configured.
 */
export function isSupabaseConfigured() {
  return _configured;
}
