/**
 * Authentication Service
 *
 * Wraps Supabase Auth to provide a clean API for:
 * - User sign-up / sign-in / sign-out
 * - Session state tracking
 * - Admin role detection
 *
 * Admin status is read from `profiles.is_admin` (checked server-side by
 * Postgres Row Level Security — see supabase/schema.sql), NOT from
 * comparing the signed-in email against a public env var. An email string
 * baked into the client bundle can only ever be a UI convenience; it can't
 * be the actual access control, since anyone can read it out of the bundle
 * and it says nothing about which *account* Postgres will actually trust.
 *
 * Falls back to a no-op offline mode when Supabase isn't configured.
 */

import { getSupabase, isSupabaseConfigured } from './supabase-client.js';

class AuthService {
  constructor() {
    /** @type {import('@supabase/supabase-js').User | null} */
    this._user = null;
    this._isAdmin = false;
    this._listeners = new Set();
    this._initialized = false;
  }

  /**
   * Initialize the auth service. Call once at app start.
   * Reads the persisted session and sets up the auth state listener.
   */
  async init() {
    if (this._initialized) return;
    this._initialized = true;

    const supabase = getSupabase();
    if (!supabase) return;

    // Read persisted session
    const { data } = await supabase.auth.getSession();
    this._user = data.session?.user ?? null;
    await this._refreshAdminFlag();

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      this._user = session?.user ?? null;
      await this._refreshAdminFlag();
      this._notifyListeners();
    });
  }

  /** @private Re-reads this user's own profile row to cache is_admin. */
  async _refreshAdminFlag() {
    this._isAdmin = false;
    if (!this._user) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', this._user.id)
      .single();
    this._isAdmin = !!data?.is_admin;
  }

  /**
   * Sign up a new user with email and password.
   * @param {string} email
   * @param {string} password
   * @param {string} [displayName]
   * @returns {Promise<{user: object|null, error: string|null}>}
   */
  async signUp(email, password, displayName) {
    const supabase = getSupabase();
    if (!supabase) return { user: null, error: 'Supabase is not configured.' };

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });

    if (error) return { user: null, error: error.message };
    this._user = data.user;
    await this._refreshAdminFlag();
    this._notifyListeners();
    return { user: data.user, error: null };
  }

  /**
   * Sign in an existing user with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user: object|null, error: string|null}>}
   */
  async signIn(email, password) {
    const supabase = getSupabase();
    if (!supabase) return { user: null, error: 'Supabase is not configured.' };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) return { user: null, error: error.message };
    this._user = data.user;
    await this._refreshAdminFlag();
    this._notifyListeners();
    return { user: data.user, error: null };
  }

  /**
   * Sign out the current user.
   */
  async signOut() {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    this._user = null;
    this._isAdmin = false;
    this._notifyListeners();
  }

  /**
   * Returns the current authenticated user, or null.
   * @returns {import('@supabase/supabase-js').User | null}
   */
  getUser() {
    return this._user;
  }

  /**
   * Returns true if a user is currently signed in.
   */
  isSignedIn() {
    return !!this._user;
  }

  /**
   * Returns true if the current signed-in user's profile has is_admin set.
   * This mirrors (but does not replace) the Postgres RLS check of the same
   * name — this cached copy is only for deciding what the UI shows; the
   * database enforces the real rule independently on every query.
   */
  isAdmin() {
    return this._isAdmin;
  }

  /**
   * Get a display-friendly name for the current user.
   */
  getDisplayName() {
    if (!this._user) return 'Guest';
    return (
      this._user.user_metadata?.display_name ||
      this._user.email?.split('@')[0] ||
      'User'
    );
  }

  /**
   * Get the current user's email.
   */
  getEmail() {
    return this._user?.email || null;
  }

  /**
   * Get the current user's ID (UUID).
   */
  getUserId() {
    return this._user?.id || null;
  }

  /**
   * Register a callback for auth state changes.
   * @param {(user: object|null) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  onAuthChange(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /** @private */
  _notifyListeners() {
    for (const fn of this._listeners) {
      try {
        fn(this._user);
      } catch (e) {
        console.warn('Auth listener error:', e);
      }
    }
  }
}

export const authService = new AuthService();
export default authService;
