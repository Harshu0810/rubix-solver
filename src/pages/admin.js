/**
 * Admin Dashboard Page Component
 *
 * Real server-side authentication via Supabase Auth.
 * No hardcoded credentials or client-side password hashes exist in source code or production bundles.
 * Access to backend telemetry is enforced by PostgreSQL Row Level Security (RLS).
 *
 * Features:
 * - Supabase Auth login gate with error handling and session persistence
 * - Telemetry KPIs: Visits, Solves, Speed, Success Rate, Average Rating, Registered Users
 * - Differentiated Feedback list: Verified Registered Users (with email/name) vs. "guest_user"
 * - Registered Users directory table
 * - Solves Audit Log with user attribution
 * - Live filter by star rating
 * - JSON Telemetry export
 * - Single-item feedback deletion
 * - Offline dev mode notice if Supabase is unconfigured
 */

import { analytics } from './analytics.js';
import { escapeHTML } from '../utils/security.js';
import { getSupabase, isSupabaseConfigured } from '../utils/supabase-client.js';
import { authService } from '../utils/auth-service.js';

export async function renderAdminPage(container, router) {
  analytics.trackEvent('page_view', { page: 'admin' });

  const supabase = getSupabase();
  let selectedStarFilter = 0; // 0 = all

  async function checkAdminAuth() {
    if (!supabase) {
      // Offline fallback: check sessionStorage offline flag
      return sessionStorage.getItem('rubix_offline_admin') === 'true';
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) return false;

    // Being signed in only proves you're a registered user, not the admin —
    // anyone can create a regular account. Check the actual is_admin flag on
    // this user's own profile row (readable under RLS since it's their own).
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', data.session.user.id)
      .single();
    if (error) return false;
    return !!profile?.is_admin;
  }

  async function render() {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) {
      renderLogin();
    } else {
      await renderDashboard();
    }
  }

  // ─── Login Screen ───
  function renderLogin(errorText) {
    const isConfigured = isSupabaseConfigured();

    container.innerHTML = `
      <div class="view-container animate-fade-in" style="align-items: center; justify-content: center; min-height: 70vh;">
        <div class="card-glass" style="width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 20px; padding: 32px;">
          <div style="text-align: center;">
            <div style="width: 52px; height: 52px; margin: 0 auto 12px; border-radius: 14px; background: rgba(59, 130, 246, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: #60A5FA;">
              🔒
            </div>
            <h1 style="font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em;">Admin Console</h1>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
              Authorized administrator portal for telemetry, solve metrics, and user feedback.
            </p>
          </div>

          ${!isConfigured ? `
            <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); padding: 12px 14px; border-radius: 10px; font-size: 0.85rem; color: #FBBF24; line-height: 1.4;">
              ⚠️ <strong>Supabase Not Configured Yet:</strong><br/>
              Create a free project at <a href="https://supabase.com" target="_blank" style="color: #60A5FA;">supabase.com</a>, add keys to <code>.env</code>, and run <code>supabase/schema.sql</code>.<br/><br/>
              <button id="btn-preview-offline" class="btn btn-secondary btn-sm" style="width: 100%; border-color: rgba(245, 158, 11, 0.4); color: #FBBF24;">
                Preview Offline Demo Console
              </button>
            </div>
          ` : ''}

          <form id="admin-login-form" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">Admin Email</label>
              <input type="email" id="admin-user" required autocomplete="username" placeholder="admin@example.com" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); color: #FFFFFF; padding: 10px 14px; border-radius: var(--radius-md); font-family: var(--font-main); font-size: 0.95rem;">
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px;">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">Password</label>
              <input type="password" id="admin-pass" required autocomplete="current-password" placeholder="••••••••" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); color: #FFFFFF; padding: 10px 14px; border-radius: var(--radius-md); font-family: var(--font-main); font-size: 0.95rem;">
            </div>

            <div id="login-error-msg" style="display: ${errorText ? 'block' : 'none'}; color: #F87171; font-size: 0.85rem; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); padding: 8px 12px; border-radius: 8px;">
              ${errorText ? escapeHTML(errorText) : ''}
            </div>

            <button type="submit" id="admin-login-submit" class="btn btn-primary" style="margin-top: 6px; width: 100%;" ${!isConfigured ? 'disabled' : ''}>
              Authenticate & Access
            </button>
          </form>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px dashed var(--border-subtle); padding: 10px 14px; border-radius: 10px; font-size: 0.8rem; color: var(--text-muted); text-align: center;">
            🛡️ <strong>Zero Hardcoded Credentials:</strong><br/>
            Authentication is verified directly via Supabase Auth with Postgres Row Level Security.
          </div>
        </div>
      </div>
    `;

    const form = container.querySelector('#admin-login-form');
    const userInp = container.querySelector('#admin-user');
    const passInp = container.querySelector('#admin-pass');
    const submitBtn = container.querySelector('#admin-login-submit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!supabase) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying…';

      const { error } = await supabase.auth.signInWithPassword({
        email: userInp.value.trim(),
        password: passInp.value,
      });

      if (error) {
        renderLogin(error.message || 'Invalid email or password.');
        return;
      }

      // Credentials were valid, but that only proves this is a registered
      // account — not that it's the admin's. Check that explicitly before
      // granting access, and don't leave a non-admin account signed in here.
      const isAdmin = await checkAdminAuth();
      if (!isAdmin) {
        await supabase.auth.signOut();
        renderLogin('This account does not have admin access.');
        return;
      }

      await render();
    });

    container.querySelector('#btn-preview-offline')?.addEventListener('click', async () => {
      sessionStorage.setItem('rubix_offline_admin', 'true');
      await render();
    });
  }

  // ─── Dashboard Screen ───
  async function renderDashboard() {
    container.innerHTML = `
      <div class="view-container animate-fade-in" style="align-items: center; justify-content: center; min-height: 40vh;">
        <div style="color: var(--text-muted);">Loading live metrics…</div>
      </div>
    `;

    let metrics;
    try {
      metrics = await analytics.getDashboardMetrics();
    } catch (e) {
      container.innerHTML = `
        <div class="view-container animate-fade-in" style="align-items:center; text-align:center; padding: 60px 0; gap: 12px;">
          <p style="color: #F87171;">Couldn't load metrics: ${escapeHTML(e.message || 'unknown error')}</p>
          <button id="btn-retry-admin" class="btn btn-secondary">Retry</button>
        </div>
      `;
      container.querySelector('#btn-retry-admin')?.addEventListener('click', () => renderDashboard());
      return;
    }

    const filteredFeedback = selectedStarFilter === 0
      ? metrics.feedbacks
      : metrics.feedbacks.filter(f => f.rating === selectedStarFilter);

    container.innerHTML = `
      <div class="view-container animate-fade-in" style="gap: 28px;">
        <!-- Header & Action Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 18px;">
          <div>
            <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: ${metrics.isLiveBackend ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; border-radius: 9999px; font-size: 0.8rem; color: ${metrics.isLiveBackend ? '#34D399' : '#FBBF24'}; font-weight: 700; margin-bottom: 6px;">
              ● ${metrics.isLiveBackend ? 'Supabase Live Connected' : 'Offline / Local Dev Mode'}
            </div>
            <h1 style="font-size: 1.9rem; font-weight: 800; letter-spacing: -0.02em;">Admin Analytics & Feedback Hub</h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem;">
              Monitoring user solve speed, registered accounts, and user vs guest feedback.
            </p>
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button id="btn-export-json" class="btn btn-secondary btn-sm" title="Download telemetry as JSON">
              📥 Export JSON
            </button>
            <button id="btn-refresh" class="btn btn-secondary btn-sm" title="Reload latest metrics">
              🔄 Refresh
            </button>
            <button id="btn-admin-logout" class="btn btn-secondary btn-sm">
              🚪 Logout
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
          <div class="card-glass" style="display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Total User Sessions</div>
            <div style="font-size: 2.2rem; font-weight: 800; color: #60A5FA;">${metrics.totalVisits}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Unique device visits</div>
          </div>

          <div class="card-glass" style="display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Cubes Solved</div>
            <div style="font-size: 2.2rem; font-weight: 800; color: #A78BFA;">${metrics.totalSolves}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${metrics.solveSuccessRate}% success rate</div>
          </div>

          <div class="card-glass" style="display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Avg. Solve Duration</div>
            <div style="font-size: 2.2rem; font-weight: 800; color: #34D399;">${metrics.avgComputeTime} ms</div>
            <div style="font-size: 0.8rem; color: #10B981;">Sub-second execution</div>
          </div>

          <div class="card-glass" style="display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Average Rating</div>
            <div style="font-size: 2.2rem; font-weight: 800; color: #F472B6;">${metrics.avgRating} ★</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">From ${metrics.feedbackCount} reviews</div>
          </div>

          <div class="card-glass" style="display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Registered Members</div>
            <div style="font-size: 2.2rem; font-weight: 800; color: #F59E0B;">${metrics.registeredUsersCount}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Signed up users</div>
          </div>
        </div>

        <!-- Feedback Reviews Feed with User vs Guest Differentiation -->
        <div class="card-glass" style="display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800;">
                User Feedback & Reviews (${filteredFeedback.length})
              </h2>
              <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
                Differentiating verified registered cubers from anonymous guests.
              </div>
            </div>

            <!-- Star Rating Filter Tabs -->
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">Filter:</span>
              ${[0, 5, 4, 3, 2, 1].map(stars => `
                <button class="btn btn-sm star-filter-btn ${selectedStarFilter === stars ? 'btn-primary' : 'btn-secondary'}" data-stars="${stars}" style="padding: 4px 8px; font-size: 0.78rem;">
                  ${stars === 0 ? 'All' : `${stars} ★`}
                </button>
              `).join('')}
            </div>
          </div>

          <div id="feedback-list" style="display: flex; flex-direction: column; gap: 12px;">
            ${filteredFeedback.length === 0 ? `
              <div style="padding: 32px; text-align: center; color: var(--text-muted);">
                No feedback matches the selected criteria.
              </div>
            ` : filteredFeedback.map(f => `
              <div style="display: flex; flex-direction: column; gap: 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); padding: 16px; border-radius: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span style="color: #FACC15; font-size: 1.1rem; letter-spacing: 2px;">
                      ${'★'.repeat(Math.max(1, Math.min(5, f.rating)))}${'☆'.repeat(5 - Math.max(1, Math.min(5, f.rating)))}
                    </span>
                    
                    <span style="font-size: 0.82rem; font-weight: 700; color: #60A5FA; background: rgba(59,130,246,0.15); padding: 2px 8px; border-radius: 6px;">
                      ${escapeHTML(f.category)}
                    </span>

                    ${!f.isGuest && f.userEmail ? `
                      <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; font-weight: 700; color: #34D399; background: rgba(16, 185, 129, 0.15); padding: 2px 8px; border-radius: 6px;" title="Registered Member">
                        ✓ ${escapeHTML(f.userName || 'Member')} (${escapeHTML(f.userEmail)})
                      </span>
                    ` : `
                      <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; font-weight: 600; color: #94A3B8; background: rgba(148, 163, 184, 0.12); padding: 2px 8px; border-radius: 6px;" title="Anonymous Guest">
                        👤 guest_user
                      </span>
                    `}
                  </div>

                  <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 0.8rem; color: var(--text-muted);">
                      ${new Date(f.timestamp).toLocaleDateString()} ${new Date(f.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <button class="btn-delete-fb btn btn-sm" data-id="${escapeHTML(f.id)}" style="color: #F87171; background: transparent; padding: 2px 6px; font-size: 0.8rem;" title="Delete this feedback">
                      ✕
                    </button>
                  </div>
                </div>

                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; white-space: pre-line; margin: 0;">
                  ${escapeHTML(f.comment) || 'No written text provided.'}
                </p>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Registered Users Directory -->
        <div class="card-glass" style="display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <h2 style="font-size: 1.25rem; font-weight: 800;">Registered Members Directory</h2>
            <span style="font-size: 0.85rem; color: var(--text-muted);">
              Total: ${metrics.registeredUsers.length} accounts
            </span>
          </div>

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-subtle); color: var(--text-muted);">
                  <th style="padding: 10px 12px;">Name</th>
                  <th style="padding: 10px 12px;">Email</th>
                  <th style="padding: 10px 12px;">Member Since</th>
                  <th style="padding: 10px 12px;">User ID</th>
                </tr>
              </thead>
              <tbody>
                ${metrics.registeredUsers.length === 0 ? `
                  <tr>
                    <td colspan="4" style="padding: 16px; text-align: center; color: var(--text-muted);">
                      No registered members yet. Users will appear here once they sign up to download solutions.
                    </td>
                  </tr>
                ` : metrics.registeredUsers.map(u => `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 10px 12px; font-weight: 700; color: #F8FAFC;">
                      ${escapeHTML(u.displayName)}
                    </td>
                    <td style="padding: 10px 12px; color: #60A5FA;">
                      ${escapeHTML(u.email)}
                    </td>
                    <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 0.85rem;">
                      ${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent'}
                    </td>
                    <td style="padding: 10px 12px; font-family: var(--font-mono); color: var(--text-muted); font-size: 0.8rem;">
                      ${escapeHTML(u.id?.substring(0, 8))}…
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Solves Log -->
        <div class="card-glass" style="display: flex; flex-direction: column; gap: 14px;">
          <h2 style="font-size: 1.25rem; font-weight: 800;">Recent Solutions Calculated</h2>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-subtle); color: var(--text-muted);">
                  <th style="padding: 10px 12px;">Time</th>
                  <th style="padding: 10px 12px;">User / Session</th>
                  <th style="padding: 10px 12px;">Moves</th>
                  <th style="padding: 10px 12px;">Compute Time</th>
                  <th style="padding: 10px 12px;">Algorithm Snippet</th>
                </tr>
              </thead>
              <tbody>
                ${metrics.solves.length === 0 ? `
                  <tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">No solves recorded yet.</td></tr>
                ` : metrics.solves.map(s => `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 0.85rem;">
                      ${new Date(s.timestamp).toLocaleTimeString()}
                    </td>
                    <td style="padding: 10px 12px; font-size: 0.85rem;">
                      ${s.userEmail ? `<span style="color: #34D399; font-weight: 600;">${escapeHTML(s.userEmail)}</span>` : `<span style="color: var(--text-muted);">guest_user</span>`}
                    </td>
                    <td style="padding: 10px 12px; font-weight: 700; color: #60A5FA;">
                      ${escapeHTML(s.moveCount)}
                    </td>
                    <td style="padding: 10px 12px; color: #34D399; font-family: var(--font-mono); font-size: 0.85rem;">
                      ${escapeHTML(s.solveTimeMs)}ms
                    </td>
                    <td style="padding: 10px 12px; font-family: var(--font-mono); color: var(--text-muted); font-size: 0.85rem; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${escapeHTML(s.rawSolution) || '-'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    // Event listeners
    container.querySelector('#btn-admin-logout')?.addEventListener('click', async () => {
      sessionStorage.removeItem('rubix_offline_admin');
      if (supabase) {
        await supabase.auth.signOut();
      }
      await render();
    });

    container.querySelector('#btn-refresh')?.addEventListener('click', async () => {
      await renderDashboard();
    });

    container.querySelector('#btn-export-json')?.addEventListener('click', async () => {
      const data = await analytics.getDashboardMetrics();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rubix-telemetry-${new Date().toISOString().substring(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    container.querySelectorAll('.star-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedStarFilter = parseInt(btn.dataset.stars, 10);
        renderDashboard();
      });
    });

    container.querySelectorAll('.btn-delete-fb').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm('Delete this feedback entry?')) {
          await analytics.deleteFeedback(id);
          await renderDashboard();
        }
      });
    });
  }

  await render();

  return () => {};
}
