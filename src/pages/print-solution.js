/**
 * Printable Solution Sheet Component
 * 
 * Renders an offline-friendly, high-contrast, printable cheat sheet
 * with step numbers, bold notation, and plain English instructions.
 * Requires user authentication to download/print.
 */

import { authService } from '../utils/auth-service.js';
import { showAuthModal } from '../components/auth-modal.js';
import { escapeHTML } from '../utils/security.js';

export function renderPrintSolutionPage(container, router, sharedState = {}) {
  const solution = sharedState.lastSolution;

  // If no active solution, redirect or display prompt
  if (!solution || !solution.steps || solution.steps.length === 0) {
    container.innerHTML = `
      <div class="view-container animate-fade-in" style="align-items: center; justify-content: center; min-height: 60vh;">
        <div class="card-glass" style="text-align: center; padding: 32px; max-width: 440px;">
          <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 10px;">No Active Solution</h2>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">
            Please solve a cube first before generating a printable cheat sheet.
          </p>
          <button id="btn-goto-input" class="btn btn-primary">
            Go to Color Input
          </button>
        </div>
      </div>
    `;
    container.querySelector('#btn-goto-input').addEventListener('click', () => {
      router.navigate('/input');
    });
    return () => {};
  }

  // If user is not authenticated, show sign-in gate
  if (!authService.isSignedIn()) {
    container.innerHTML = `
      <div class="view-container animate-fade-in" style="align-items: center; justify-content: center; min-height: 60vh;">
        <div class="card-glass" style="text-align: center; padding: 36px; max-width: 460px; display: flex; flex-direction: column; align-items: center; gap: 16px;">
          <div style="width: 56px; height: 56px; border-radius: 16px; background: rgba(59, 130, 246, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #60A5FA;">
            🔒
          </div>
          <h2 style="font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em;">Sign In to Access Solution Sheet</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;">
            Create a free account or sign in to download, print, and save your custom Rubik's Cube solution cheat sheet.
          </p>
          <div style="display: flex; gap: 12px; width: 100%; margin-top: 8px;">
            <button id="btn-gate-signin" class="btn btn-primary" style="flex: 1;">
              Sign In / Sign Up
            </button>
            <button id="btn-gate-back" class="btn btn-secondary" style="flex: 1;">
              Back to 3D Player
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-gate-signin').addEventListener('click', async () => {
      try {
        await showAuthModal({
          title: 'Sign In to Access Document',
          subtitle: 'Sign in or sign up to unlock your printable solution guide.',
          initialMode: 'signin',
        });
        // Re-render once signed in
        renderPrintSolutionPage(container, router, sharedState);
      } catch {
        // modal closed
      }
    });

    container.querySelector('#btn-gate-back').addEventListener('click', () => {
      router.navigate('/solution');
    });

    return () => {};
  }

  const userEmail = authService.getEmail() || 'User';

  container.innerHTML = `
    <div class="view-container animate-fade-in printable-solution" style="gap: 24px; max-width: 860px;">
      <!-- Action Bar (hidden when printing) -->
      <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="btn-back-player" class="btn btn-secondary btn-sm">
            ❮ Back to 3D Player
          </button>
          <span style="font-size: 0.85rem; color: #34D399; background: rgba(16, 185, 129, 0.12); padding: 4px 10px; border-radius: 9999px; font-weight: 600;">
            👤 ${escapeHTML(userEmail)}
          </span>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="btn-download-txt" class="btn btn-secondary btn-sm" title="Download plain text algorithm">
            📄 Save Text File
          </button>
          <button id="btn-trigger-print" class="btn btn-primary btn-sm" title="Print document or Save as PDF">
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>

      <!-- Printable Document Header -->
      <div style="border-bottom: 2px solid #334155; padding-bottom: 16px;">
        <h1 style="font-size: 2rem; font-weight: 800; letter-spacing: -0.02em;">Rubik's Cube Solution Cheat Sheet</h1>
        <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-top: 8px; font-size: 0.95rem; color: var(--text-secondary);">
          <div>Total Moves: <strong style="color: #60A5FA;">${solution.totalMoves}</strong></div>
          <div>Solve Method: <strong>Kociemba Two-Phase</strong></div>
          <div>Generated For: <strong>${escapeHTML(userEmail)}</strong></div>
          <div>Date: <strong>${new Date().toLocaleDateString()}</strong></div>
        </div>
        <div style="margin-top: 12px; font-family: var(--font-mono); font-size: 1.05rem; background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-subtle); word-break: break-word;">
          <strong>Algorithm:</strong> ${escapeHTML(solution.rawSolution)}
        </div>
      </div>

      <!-- Steps Table -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px;">
        ${solution.steps.map(s => `
          <div style="display: flex; align-items: center; gap: 14px; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 12px;">
            <div style="width: 30px; height: 30px; border-radius: 50%; background: #3B82F6; color: #FFFFFF; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${s.stepNumber}
            </div>
            <div style="min-width: 48px; text-align: center; font-family: var(--font-mono); font-size: 1.4rem; font-weight: 800; color: #60A5FA;">
              ${escapeHTML(s.move)}
            </div>
            <div style="font-size: 0.85rem; line-height: 1.3; color: var(--text-primary);">
              <div style="font-weight: 700; text-transform: capitalize;">${escapeHTML(s.faceName)} (${escapeHTML(s.direction)})</div>
              <div style="color: var(--text-secondary); font-size: 0.78rem;">${escapeHTML(s.text)}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Printable Document Footer -->
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-subtle); font-size: 0.8rem; color: var(--text-muted); text-align: center;">
        Generated by RuBiX Solver Engine • Authorized Member Document • Free 3D Speedcube Tool
      </div>
    </div>
  `;

  container.querySelector('#btn-back-player')?.addEventListener('click', () => {
    router.navigate('/solution');
  });

  container.querySelector('#btn-trigger-print')?.addEventListener('click', () => {
    window.print();
  });

  container.querySelector('#btn-download-txt')?.addEventListener('click', () => {
    let content = `====================================================\n`;
    content += `RUBIX CUBE SOLUTION CHEAT SHEET\n`;
    content += `Generated For: ${userEmail}\n`;
    content += `Date: ${new Date().toLocaleString()}\n`;
    content += `Total Moves: ${solution.totalMoves}\n`;
    content += `Algorithm: ${solution.rawSolution}\n`;
    content += `====================================================\n\n`;
    content += `STEP-BY-STEP MOVES:\n`;
    solution.steps.forEach(s => {
      content += `[Step ${s.stepNumber}] ${s.move.padEnd(4)} - ${s.faceName} (${s.direction}): ${s.text}\n`;
    });
    content += `\nGenerated by RuBiX Solver Engine\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rubix-solution-${Date.now().toString(36)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  return () => {};
}
