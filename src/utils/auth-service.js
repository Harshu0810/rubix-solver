/**
 * Authentication Service
 *
 * Wraps Supabase Auth to provide a clean API for:
 * - User sign-up / sign-in / sign-out
 * - Real email validation and verification enforcement
 * - Session state tracking
 * - Admin role detection
 *
 * Admin status is read from `profiles.is_admin` (checked server-side by
 * Postgres Row Level Security — see supabase/schema.sql), NOT from
 * comparing the signed-in email against a public env var.
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
   * Validate email syntax. Requires standard name@domain.tld format.
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email.trim());
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
   * Enforces email syntax and returns needsEmailVerification if email confirmation is required.
   * @param {string} email
   * @param {string} password
   * @param {string} [displayName]
   * @returns {Promise<{user: object|null, error: string|null, needsEmailVerification?: boolean}>}
   */
  async signUp(email, password, displayName) {
    const supabase = getSupabase();
    if (!supabase) return { user: null, error: 'Supabase is not configured.' };

    const cleanEmail = (email || '').trim();
    if (!this.isValidEmail(cleanEmail)) {
      return { user: null, error: 'Please enter a valid, real email address (e.g. name@example.com).' };
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          display_name: displayName || cleanEmail.split('@')[0],
        },
      },
    });

    if (error) return { user: null, error: error.message };

    // If email confirmation is enabled in Supabase, data.session will be null
    // until the user clicks the confirmation link in their email inbox.
    const isConfirmed = !!(data.session || data.user?.confirmed_at || data.user?.email_confirmed_at);
    if (!isConfirmed) {
      this._user = null;
      this._isAdmin = false;
      this._notifyListeners();
      return { user: data.user, error: null, needsEmailVerification: true };
    }

    this._user = data.user;
    await this._refreshAdminFlag();
    this._notifyListeners();
    return { user: data.user, error: null, needsEmailVerification: false };
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

    const cleanEmail = (email || '').trim();
    if (!this.isValidEmail(cleanEmail)) {
      return { user: null, error: 'Please enter a valid email address.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      if (error.message && error.message.toLowerCase().includes('not confirmed')) {
        return {
          user: null,
          error: 'Your email has not been verified yet. Please check your inbox (and spam folder) for the confirmation link sent by Supabase.',
        };
      }
      return { user: null, error: error.message };
    }

    this._user = data.user;
    await this._refreshAdminFlag();
    this._notifyListeners();
    return { user: data.user, error: null };
  }

  /**
   * Sign in or sign up with Google OAuth.
   * Redirects user to Google OAuth consent screen.
   * @param {string} [redirectTo]
   * @returns {Promise<{error: string|null}>}
   */
  async signInWithGoogle(redirectTo) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase is not configured.' };

    const targetUrl = redirectTo || (window.location.origin + window.location.pathname);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: targetUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) return { error: error.message };
    return { error: null };
  }

  /**
   * Resend a verification email to a registered user.
   */
  async resendVerification(email) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase is not configured.' };
    const cleanEmail = (email || '').trim();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
    });
    return { error: error ? error.message : null };
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
