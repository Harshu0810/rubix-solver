/**
 * Application Entry Point & Client-Side Router
 * 
 * Manages view transitions, navigation state, solver pre-warming,
 * and page lifecycle cleanup.
 */

import { renderLandingPage } from './pages/landing.js';
import { renderFaceInputPage } from './pages/face-input.js';
import { renderSolutionPlayerPage } from './pages/solution-player.js';
import { renderManualPage } from './pages/manual.js';
import { renderFeedbackPage } from './pages/feedback.js';
import { renderPrintSolutionPage } from './pages/print-solution.js';
import { solverManager } from './solver/solver-manager.js';
import { analytics } from './pages/analytics.js';
import { authService } from './utils/auth-service.js';
import { showAuthModal } from './components/auth-modal.js';
import { escapeHTML } from './utils/security.js';

class AppRouter {
  constructor() {
    this.routes = {
      '/': renderLandingPage,
      '/input': renderFaceInputPage,
      '/solution': renderSolutionPlayerPage,
      '/manual': renderManualPage,
      '/feedback': renderFeedbackPage,
      '/admin': async (container, router, sharedState) => {
        const mod = await import('./pages/admin.js');
        return mod.renderAdminPage(container, router, sharedState);
      },
      '/print': renderPrintSolutionPage,
    };

    this.sharedState = {
      cubeState: null,
      lastSolution: null,
    };

    this.currentCleanup = null;
    this.mainContainer = document.getElementById('view-outlet');

    this.initNavbar();
    this.setupRoutes();

    // Initialize Auth Service & Navbar listener
    authService.init().then(() => {
      this.updateAuthNavbar();
    });
    authService.onAuthChange(() => {
      this.updateAuthNavbar();
    });

    // Pre-warm solver background worker immediately
    solverManager.waitForReady().then(() => {
      console.log('✨ Solver tables ready for instant calculation.');
    });
  }

  updateAuthNavbar() {
    const navAuthItem = document.getElementById('nav-auth-item');
    if (!navAuthItem) return;

    if (authService.isSignedIn()) {
      navAuthItem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-left: 4px;">
          <span style="font-size: 0.82rem; font-weight: 700; color: #34D399; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); padding: 5px 12px; border-radius: var(--radius-full); max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(authService.getEmail() || '')}">
            👤 ${escapeHTML(authService.getDisplayName())}
          </span>
          <button id="nav-btn-signout" class="nav-btn" style="padding: 6px 10px; font-size: 0.8rem; color: var(--text-muted);" title="Sign Out">
            Sign Out
          </button>
        </div>
      `;
      navAuthItem.querySelector('#nav-btn-signout')?.addEventListener('click', async () => {
        await authService.signOut();
      });
    } else {
      navAuthItem.innerHTML = `
        <button id="nav-btn-signin" class="nav-btn" style="border: 1px solid rgba(255,255,255,0.18); padding: 6px 14px; font-size: 0.85rem; font-weight: 600; margin-left: 4px;">
          <span>Sign In</span>
        </button>
      `;
      navAuthItem.querySelector('#nav-btn-signin')?.addEventListener('click', () => {
        showAuthModal({
          title: 'Sign In / Sign Up',
          subtitle: 'Sign in to access printable solution downloads and manage your feedback.',
        }).catch(() => {});
      });
    }
  }

  initNavbar() {
    const brand = document.querySelector('.nav-brand');
    if (brand) {
      brand.addEventListener('click', () => this.navigate('/'));
    }

    document.querySelectorAll('[data-route]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const route = el.getAttribute('data-route');
        this.navigate(route);
      });
    });

    this.updateAuthNavbar();
  }

  setupRoutes() {
    window.addEventListener('popstate', () => this.handleRoute());
    // Also support hash routing for static file servers
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }

  getNormalizedPath() {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash.startsWith('/')) {
      return hash;
    }
    const path = window.location.pathname;
    return this.routes[path] ? path : '/';
  }

  navigate(path) {
    if (window.location.hash || !history.pushState) {
      window.location.hash = path;
    } else {
      window.history.pushState({}, '', path);
    }
    this.handleRoute();
  }

  handleRoute() {
    const path = this.getNormalizedPath();
    const renderFn = this.routes[path] || this.routes['/'];

    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const target = btn.getAttribute('data-route');
      if (target === path) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Cleanup previous view (dispose Three.js scene, event listeners)
    if (typeof this.currentCleanup === 'function') {
      try {
        this.currentCleanup();
      } catch (e) {
        console.warn('View cleanup error:', e);
      }
      this.currentCleanup = null;
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Render new view
    if (this.mainContainer) {
      const res = renderFn(this.mainContainer, this, this.sharedState);
      if (res && typeof res.then === 'function') {
        res.then(cleanup => {
          this.currentCleanup = cleanup;
        }).catch(err => {
          console.error('Route render error:', err);
        });
      } else {
        this.currentCleanup = res;
      }
    }
  }
}

// Initialize Application once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.appRouter = new AppRouter();
});
