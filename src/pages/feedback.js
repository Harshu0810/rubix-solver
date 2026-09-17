/**
 * Feedback Page Component
 * 
 * Allows users to rate the tool, suggest improvements,
 * and report how much time it took vs their general solving time.
 * Supports both signed-in users (with profile identification) and guest users (guest_user).
 */

import { analytics } from './analytics.js';
import { authService } from '../utils/auth-service.js';
import { showAuthModal } from '../components/auth-modal.js';
import { escapeHTML } from '../utils/security.js';

export function renderFeedbackPage(container, router) {
  analytics.trackEvent('page_view', { page: 'feedback' });

  let selectedRating = 5;
  const isSignedIn = authService.isSignedIn();
  const userEmail = authService.getEmail();
  const displayName = authService.getDisplayName();

  container.innerHTML = `
    <div class="view-container animate-fade-in" style="gap: 24px; max-width: 680px;">
      <div>
        <h1 style="font-size: 2rem; font-weight: 800; letter-spacing: -0.02em;">User Feedback & Reviews</h1>
        <p style="color: var(--text-secondary); font-size: 1rem; margin-top: 4px;">
          Your feedback helps us refine the 3D solver engine and make it faster for cubers worldwide.
        </p>
      </div>

      <!-- Auth State Banner -->
      ${isSignedIn ? `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; font-size: 0.9rem;">
          <div style="display: flex; align-items: center; gap: 8px; color: #34D399;">
            <span>🟢</span>
            <span>Submitting as <strong>${escapeHTML(displayName)}</strong> (${escapeHTML(userEmail)})</span>
          </div>
          <button id="btn-auth-signout-feedback" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.8rem; text-decoration: underline;">
            Sign Out
          </button>
        </div>
      ` : `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255, 255, 255, 0.04); border: 1px dashed var(--border-subtle); border-radius: 12px; font-size: 0.88rem; color: var(--text-secondary);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>👤</span>
            <span>Submitting as <strong>guest_user</strong>.</span>
          </div>
          <button id="btn-auth-signin-feedback" style="background: none; border: none; color: #60A5FA; cursor: pointer; font-weight: 600; font-size: 0.88rem; text-decoration: underline;">
            Sign in to attach your name
          </button>
        </div>
      `}

      <div id="feedback-form-card" class="card-glass" style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Star Rating -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
            Overall Experience Rating
          </label>
          <div id="star-rating-row" style="display: flex; gap: 8px; font-size: 2.2rem; cursor: pointer; user-select: none;">
            ${[1, 2, 3, 4, 5].map(n => `
              <span class="star-item" data-val="${n}" style="color: #FACC15; transition: transform 0.15s ease;">
                ★
              </span>
            `).join('')}
          </div>
          <div id="rating-label" style="font-size: 0.85rem; color: #60A5FA; font-weight: 600;">
            5 / 5 — Outstanding!
          </div>
        </div>

        <!-- Experience Category -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label for="feedback-category" style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
            What describes your experience best?
          </label>
          <select id="feedback-category" style="background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border-subtle); color: #FFFFFF; padding: 10px 14px; border-radius: var(--radius-md); font-family: var(--font-main); font-size: 0.95rem;">
            <option value="Solved my cube successfully!" selected>🎉 Solved my cube successfully!</option>
            <option value="Super fast & easy">⚡ Super fast & easy</option>
            <option value="Helped me learn the algorithms">🧠 Helped me learn the algorithms</option>
            <option value="Suggestion for improvement">💡 Suggestion for improvement</option>
            <option value="Question or issue">🐛 Bug / Issue report</option>
          </select>
        </div>

        <!-- Time Comparison -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label for="time-taken" style="font-weight: 600; font-size: 0.9rem; color: var(--text-secondary);">
              Time taken with this tool:
            </label>
            <select id="time-taken" style="background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border-subtle); color: #FFFFFF; padding: 10px 12px; border-radius: var(--radius-md); font-family: var(--font-main); font-size: 0.9rem;">
              <option value="Under 1 minute">Under 1 minute</option>
              <option value="1 - 3 minutes" selected>1 – 3 minutes</option>
              <option value="3 - 5 minutes">3 – 5 minutes</option>
              <option value="5 - 10 minutes">5 – 10 minutes</option>
            </select>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label for="comparison-speed" style="font-weight: 600; font-size: 0.9rem; color: var(--text-secondary);">
              Vs. your usual solve speed:
            </label>
            <select id="comparison-speed" style="background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border-subtle); color: #FFFFFF; padding: 10px 12px; border-radius: var(--radius-md); font-family: var(--font-main); font-size: 0.9rem;">
              <option value="Much faster than usual" selected>Much faster than usual</option>
              <option value="Somewhat faster">Somewhat faster</option>
              <option value="First time ever solving a cube!">First time ever solving a cube!</option>
              <option value="About the same">About the same</option>
            </select>
          </div>
        </div>

        <!-- Comments Textarea -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label for="feedback-comment" style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
            Your Comments & Suggested Improvements:
          </label>
          <textarea id="feedback-comment" rows="4" placeholder="Tell us how the tool worked for you or what features you would like to see next..." style="background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border-subtle); color: #FFFFFF; padding: 12px 14px; border-radius: var(--radius-md); font-family: var(--font-main); font-size: 0.95rem; resize: vertical;"></textarea>
        </div>

        <!-- Submit Button -->
        <button id="btn-submit-feedback" class="btn btn-primary btn-lg" style="margin-top: 8px;">
          Submit Feedback
        </button>
      </div>

      <!-- Success Card (Hidden initially) -->
      <div id="feedback-success-card" class="card-glass" style="display: none; flex-direction: column; align-items: center; text-align: center; gap: 16px; padding: 36px;">
        <div style="font-size: 3rem;">🌟</div>
        <h2 style="font-size: 1.6rem; font-weight: 800; color: #34D399;">Thank You for Your Feedback!</h2>
        <p style="color: var(--text-secondary); max-width: 440px;">
          Your review has been recorded ${isSignedIn ? 'under your account' : 'as guest_user'} and will help us make the Rubik's Cube Solver even better.
        </p>
        <div style="display: flex; gap: 12px; margin-top: 8px;">
          <button id="btn-feedback-again" class="btn btn-secondary">
            Solve Another Cube
          </button>
          <button id="btn-feedback-home" class="btn btn-primary">
            Back to Home
          </button>
        </div>
      </div>
    </div>
  `;

  // Auth toggle events
  container.querySelector('#btn-auth-signin-feedback')?.addEventListener('click', async () => {
    try {
      await showAuthModal({
        title: 'Sign In to Leave Feedback',
        subtitle: 'Sign in so your name and email appear with your review in the admin console.',
        initialMode: 'signin',
      });
      renderFeedbackPage(container, router);
    } catch {
      // closed
    }
  });

  container.querySelector('#btn-auth-signout-feedback')?.addEventListener('click', async () => {
    await authService.signOut();
    renderFeedbackPage(container, router);
  });

  const starRow = container.querySelector('#star-rating-row');
  const ratingLabel = container.querySelector('#rating-label');
  const labels = [
    '',
    '1 / 5 — Poor',
    '2 / 5 — Fair',
    '3 / 5 — Good',
    '4 / 5 — Great',
    '5 / 5 — Outstanding!',
  ];

  function updateStars(val) {
    selectedRating = val;
    starRow.querySelectorAll('.star-item').forEach(s => {
      const starVal = parseInt(s.dataset.val, 10);
      s.style.color = starVal <= val ? '#FACC15' : 'rgba(255, 255, 255, 0.18)';
      s.style.transform = starVal === val ? 'scale(1.2)' : 'scale(1)';
    });
    ratingLabel.textContent = labels[val] || '';
  }

  starRow.querySelectorAll('.star-item').forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.val, 10);
      updateStars(val);
    });
  });

  const submitBtn = container.querySelector('#btn-submit-feedback');
  const formCard = container.querySelector('#feedback-form-card');
  const successCard = container.querySelector('#feedback-success-card');

  submitBtn.addEventListener('click', async () => {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    const category = container.querySelector('#feedback-category').value;
    const timeTaken = container.querySelector('#time-taken').value;
    const speedComp = container.querySelector('#comparison-speed').value;
    const userComments = container.querySelector('#feedback-comment').value;

    const fullComment = `${userComments ? userComments + '\n\n' : ''}[Time to solve: ${timeTaken} | Speed: ${speedComp}]`;

    await analytics.submitFeedback({
      rating: selectedRating,
      category,
      comment: fullComment,
    });

    formCard.style.display = 'none';
    successCard.style.display = 'flex';
  });

  container.querySelector('#btn-feedback-again')?.addEventListener('click', () => {
    router.navigate('/input');
  });

  container.querySelector('#btn-feedback-home')?.addEventListener('click', () => {
    router.navigate('/');
  });

  return () => {};
}
