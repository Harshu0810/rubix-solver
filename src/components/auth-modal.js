/**
 * Auth Modal Component
 *
 * Reusable sign-in / sign-up overlay modal with glass-morphism design.
 * Opens as a centered overlay and provides email/password authentication
 * via Supabase Auth. Enforces email verification before allowing access.
 */

import { authService } from '../utils/auth-service.js';
import { escapeHTML } from '../utils/security.js';

/**
 * Shows the auth modal overlay. Returns a promise that resolves when
 * the user successfully signs in, or rejects if they close the modal.
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
    subtitle = 'Create a verified account or sign in to download your solution.',
    initialMode = 'signin',
  } = options;

  return new Promise((resolve, reject) => {
    // Prevent duplicates
    const existing = document.getElementById('auth-modal-overlay');
    if (existing) existing.remove();

    let mode = initialMode;
    let savedEmail = '';

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

    function renderVerificationNotice(email) {
      overlay.innerHTML = `
        <div class="auth-modal-card" style="text-align: center; display: flex; flex-direction: column; gap: 16px;">
          <!-- Close Button -->
          <div style="display: flex; justify-content: flex-end; margin: -12px -12px 0 0;">
            <button id="auth-modal-close" style="background: none; border: none; color: var(--text-muted, #64748B); font-size: 1.4rem; cursor: pointer; padding: 4px 8px; border-radius: 8px;">✕</button>
          </div>

          <div style="width: 60px; height: 60px; margin: 0 auto 4px; border-radius: 18px; background: rgba(59, 130, 246, 0.15); display: flex; align-items: center; justify-content: center; font-size: 2rem;">
            ✉️
          </div>

          <h2 style="font-size: 1.5rem; font-weight: 800; color: #F8FAFC; margin: 0;">Verify Your Email</h2>
          
          <p style="color: #94A3B8; font-size: 0.95rem; margin: 0; line-height: 1.5;">
            We've sent a confirmation link to:<br/>
            <strong style="color: #60A5FA; font-size: 1.05rem; word-break: break-all;">${escapeHTML(email)}</strong>
          </p>

          <div style="background: rgba(255, 255, 255, 0.04); border: 1px dashed var(--border-subtle, rgba(255,255,255,0.1)); padding: 12px 14px; border-radius: 10px; font-size: 0.85rem; color: #94A3B8; text-align: left; line-height: 1.4;">
            👉 <strong>Next steps:</strong><br/>
            1. Open the verification email in your inbox.<br/>
            2. Click the confirmation link.<br/>
            3. Return here and sign in with your credentials.<br/>
            <span style="color: #FBBF24; font-size: 0.8rem; margin-top: 4px; display: block;">💡 Check your <strong>Spam / Junk</strong> folder if you don't see it within 2 minutes.</span>
          </div>

          <div id="resend-status-msg" style="display: none; font-size: 0.85rem; color: #34D399;"></div>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
            <button id="auth-goto-signin" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700;">
              I've Verified — Proceed to Sign In
            </button>
            <button id="auth-resend-btn" class="btn btn-secondary btn-sm" style="width: 100%; padding: 8px; font-size: 0.85rem;">
              Resend Verification Email
            </button>
          </div>
        </div>
      `;

      overlay.querySelector('#auth-modal-close').addEventListener('click', () => {
        overlay.remove();
        reject(new Error('Auth modal closed by user'));
      });

      overlay.querySelector('#auth-goto-signin').addEventListener('click', () => {
        mode = 'signin';
        savedEmail = email;
        renderForm();
      });

      overlay.querySelector('#auth-resend-btn').addEventListener('click', async () => {
        const btn = overlay.querySelector('#auth-resend-btn');
        const status = overlay.querySelector('#resend-status-msg');
        btn.disabled = true;
        btn.textContent = 'Resending…';
        const res = await authService.resendVerification(email);
        if (res.error) {
          status.textContent = res.error;
          status.style.color = '#F87171';
        } else {
          status.textContent = '✓ Verification email resent! Please check your inbox.';
          status.style.color = '#34D399';
        }
        status.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Resend Verification Email';
      });
    }

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
            background: rgba(15, 23, 42, 0.94);
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
            line-height: 1.4;
          }
          .auth-modal-toggle {
            color: #60A5FA; cursor: pointer; font-weight: 600;
            background: none; border: none; font-size: 0.9rem;
            font-family: var(--font-main, 'Outfit', sans-serif);
            padding: 0; text-decoration: underline;
            text-underline-offset: 2px;
          }
          .auth-modal-toggle:hover { color: #93C5FD; }
          .auth-google-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            width: 100%;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 12px;
            color: #FFFFFF;
            font-family: var(--font-main, 'Outfit', sans-serif);
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-sizing: border-box;
            outline: none;
          }
          .auth-google-btn:hover {
            background: rgba(255, 255, 255, 0.14);
            border-color: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
          }
          .auth-google-btn:active {
            transform: translateY(0);
          }
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
              ${escapeHTML(isSignUp ? 'Sign up to verify your account and download solutions.' : subtitle)}
            </p>
          </div>

          <!-- Google OAuth Button -->
          <button type="button" id="auth-google-btn" class="auth-google-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span>${isSignUp ? 'Sign up with Google' : 'Sign in with Google'}</span>
          </button>

          <!-- Divider -->
          <div style="display: flex; align-items: center; gap: 12px; margin: -2px 0;">
            <div style="flex: 1; height: 1px; background: rgba(255, 255, 255, 0.1);"></div>
            <span style="font-size: 0.76rem; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">or continue with email</span>
            <div style="flex: 1; height: 1px; background: rgba(255, 255, 255, 0.1);"></div>
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
              <label style="font-size: 0.82rem; font-weight: 600; color: #94A3B8;">Email Address</label>
              <input type="email" id="auth-email" required placeholder="you@example.com" autocomplete="email" value="${escapeHTML(savedEmail)}" />
            </div>

            <div style="display: flex; flex-direction: column; gap: 5px;">
              <label style="font-size: 0.82rem; font-weight: 600; color: #94A3B8;">Password</label>
              <input type="password" id="auth-password" required placeholder="••••••••" minlength="6"
                autocomplete="${isSignUp ? 'new-password' : 'current-password'}" />
            </div>

            <div id="auth-modal-error" class="auth-modal-error"></div>

            <button type="submit" id="auth-modal-submit" class="btn btn-primary" style="width: 100%; margin-top: 4px; padding: 12px; font-size: 1rem; font-weight: 700; border-radius: 12px;">
              ${isSignUp ? 'Create Account & Verify' : 'Sign In'}
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
        savedEmail = overlay.querySelector('#auth-email')?.value || savedEmail;
        renderForm();
      });

      // Google OAuth trigger
      overlay.querySelector('#auth-google-btn')?.addEventListener('click', async () => {
        const errorEl = overlay.querySelector('#auth-modal-error');
        const googleBtn = overlay.querySelector('#auth-google-btn');
        googleBtn.disabled = true;
        googleBtn.innerHTML = `<span>Connecting to Google…</span>`;
        errorEl.style.display = 'none';

        const res = await authService.signInWithGoogle();
        if (res && res.error) {
          errorEl.textContent = res.error;
          errorEl.style.display = 'block';
          googleBtn.disabled = false;
          googleBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span>${isSignUp ? 'Sign up with Google' : 'Sign in with Google'}</span>
          `;
        }
      });

      const form = overlay.querySelector('#auth-modal-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = overlay.querySelector('#auth-email').value.trim();
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
          submitBtn.textContent = mode === 'signup' ? 'Create Account & Verify' : 'Sign In';
        } else if (result.needsEmailVerification) {
          // Email confirmation is required! Show the verification notice
          renderVerificationNotice(email);
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
