/**
 * Auth Modal Component
 *
 * Reusable sign-in / sign-up overlay modal with glass-morphism design.
 * Opens as a centered overlay and provides email/password authentication
 * via Supabase Auth. Used by the print/download flow to gate downloads
 * behind authentication.
 */

import { authService } from '../utils/auth-service.js';
import { escapeHTML } from '../utils/security.js';

/**
 * Shows the auth modal overlay. Returns a promise that resolves when
 * the user successfully signs in/up, or rejects if they close the modal.
 *
 * @param {object} [options]
 * @param {string} [options.title] - Modal title
 * @param {string} [options.subtitle] - Modal subtitle
 * @param {'signin'|'signup'} [options.initialMode] - Initial form mode
 * @returns {Promise<import('@supabase/supabase-js').User>}
 */
export function showAuthModal(options = {}) {
  const {
    title = 'Sign In to Continue',
    subtitle = 'Create a free account or sign in to download your solution.',
    initialMode = 'signin',
  } = options;

  return new Promise((resolve, reject) => {
    // Prevent duplicates
    const existing = document.getElementById('auth-modal-overlay');
    if (existing) existing.remove();

    let mode = initialMode;

    const overlay = document.createElement('div');
    overlay.id = 'auth-modal-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10000;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      animation: authModalFadeIn 0.25s ease;
      padding: 16px;
    `;

    function renderForm() {
      const isSignUp = mode === 'signup';

      overlay.innerHTML = `
        <style>
          @keyframes authModalFadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes authModalSlideUp {
            from { transform: translateY(20px); opacity: 0; }
            to   { transform: translateY(0); opacity: 1; }
          }
          .auth-modal-card {
            width: 100%; max-width: 440px;
            background: rgba(15, 23, 42, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            padding: 32px;
            display: flex; flex-direction: column; gap: 20px;
            animation: authModalSlideUp 0.3s ease;
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
          }
          .auth-modal-card input {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #FFFFFF;
            padding: 11px 14px;
            border-radius: 10px;
            font-family: var(--font-main, 'Outfit', sans-serif);
            font-size: 0.95rem;
            width: 100%;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.2s;
          }
          .auth-modal-card input:focus {
            border-color: rgba(96, 165, 250, 0.5);
          }
          .auth-modal-card input::placeholder {
            color: rgba(255, 255, 255, 0.3);
          }
          .auth-modal-error {
            display: none; color: #F87171; font-size: 0.85rem;
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.3);
            padding: 8px 12px; border-radius: 8px;
          }
          .auth-modal-toggle {
            color: #60A5FA; cursor: pointer; font-weight: 600;
            background: none; border: none; font-size: 0.9rem;
            font-family: var(--font-main, 'Outfit', sans-serif);
            padding: 0; text-decoration: underline;
            text-underline-offset: 2px;
          }
          .auth-modal-toggle:hover { color: #93C5FD; }
        </style>

        <div class="auth-modal-card">
          <!-- Close Button -->
          <div style="display: flex; justify-content: flex-end; margin: -12px -12px 0 0;">
            <button id="auth-modal-close" style="background: none; border: none; color: var(--text-muted, #64748B); font-size: 1.4rem; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: background 0.2s;"
              onmouseover="this.style.background='rgba(255,255,255,0.06)'"
              onmouseout="this.style.background='none'">✕</button>
          </div>

          <!-- Header -->
          <div style="text-align: center;">
            <div style="width: 52px; height: 52px; margin: 0 auto 14px; border-radius: 14px; background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2)); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
              ${isSignUp ? '🚀' : '🔐'}
            </div>
            <h2 style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; color: #F8FAFC; margin: 0;">
              ${escapeHTML(isSignUp ? 'Create Your Account' : title)}
            </h2>
            <p style="color: #94A3B8; font-size: 0.9rem; margin-top: 6px;">
              ${escapeHTML(isSignUp ? 'Sign up to download solutions and track your history.' : subtitle)}
            </p>
          </div>

          <!-- Form -->
          <form id="auth-modal-form" style="display: flex; flex-direction: column; gap: 14px;">
            ${isSignUp ? `
              <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-size: 0.82rem; font-weight: 600; color: #94A3B8;">Display Name</label>
                <input type="text" id="auth-display-name" placeholder="Your name" autocomplete="name" />
              </div>
            ` : ''}

            <div style="display: flex; flex-direction: column; gap: 5px;">
              <label style="font-size: 0.82rem; font-weight: 600; color: #94A3B8;">Email</label>
              <input type="email" id="auth-email" required placeholder="you@example.com" autocomplete="email" />
            </div>

            <div style="display: flex; flex-direction: column; gap: 5px;">
              <label style="font-size: 0.82rem; font-weight: 600; color: #94A3B8;">Password</label>
              <input type="password" id="auth-password" required placeholder="••••••••" minlength="6"
                autocomplete="${isSignUp ? 'new-password' : 'current-password'}" />
            </div>

            <div id="auth-modal-error" class="auth-modal-error"></div>

            <button type="submit" id="auth-modal-submit" class="btn btn-primary" style="width: 100%; margin-top: 4px; padding: 12px; font-size: 1rem; font-weight: 700; border-radius: 12px;">
              ${isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <!-- Toggle -->
          <div style="text-align: center; font-size: 0.9rem; color: #94A3B8;">
            ${isSignUp
              ? 'Already have an account? <button class="auth-modal-toggle" id="auth-toggle">Sign In</button>'
              : 'No account yet? <button class="auth-modal-toggle" id="auth-toggle">Create one</button>'
            }
          </div>
        </div>
      `;

      // Wire up events
      overlay.querySelector('#auth-modal-close').addEventListener('click', () => {
        overlay.remove();
        reject(new Error('Auth modal closed by user'));
      });

      overlay.querySelector('#auth-toggle').addEventListener('click', () => {
        mode = mode === 'signin' ? 'signup' : 'signin';
        renderForm();
      });

      const form = overlay.querySelector('#auth-modal-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = overlay.querySelector('#auth-email').value;
        const password = overlay.querySelector('#auth-password').value;
        const displayName = overlay.querySelector('#auth-display-name')?.value || '';
        const errorEl = overlay.querySelector('#auth-modal-error');
        const submitBtn = overlay.querySelector('#auth-modal-submit');

        submitBtn.disabled = true;
        submitBtn.textContent = mode === 'signup' ? 'Creating…' : 'Signing in…';
        errorEl.style.display = 'none';

        let result;
        if (mode === 'signup') {
          result = await authService.signUp(email, password, displayName);
        } else {
          result = await authService.signIn(email, password);
        }

        if (result.error) {
          errorEl.textContent = result.error;
          errorEl.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = mode === 'signup' ? 'Create Account' : 'Sign In';
        } else {
          overlay.remove();
          resolve(result.user);
        }
      });
    }

    // Close on backdrop click (not on the card itself)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        reject(new Error('Auth modal closed by user'));
      }
    });

    // Close on Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        reject(new Error('Auth modal closed by user'));
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    renderForm();
    document.body.appendChild(overlay);

    // Auto-focus email field
    setTimeout(() => {
      overlay.querySelector('#auth-email')?.focus();
    }, 100);
  });
}
