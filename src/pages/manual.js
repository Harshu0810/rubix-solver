/**
 * Beginner Manual / How to Solve a Rubik's Cube
 * 
 * Comprehensive, step-by-step Layer-by-Layer beginner guide
 * with notation cheat sheet, diagrams, and algorithms.
 */

import { analytics } from './analytics.js';

export function renderManualPage(container, router) {
  analytics.trackEvent('page_view', { page: 'manual' });

  container.innerHTML = `
    <div class="view-container animate-fade-in" style="gap: 32px; max-width: 960px;">
      <!-- Title -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(59, 130, 246, 0.1); border-radius: 9999px; font-size: 0.85rem; color: #60A5FA; font-weight: 600; margin-bottom: 8px;">
            📖 The Ultimate Beginner Guide
          </div>
          <h1 style="font-size: 2.2rem; font-weight: 800; letter-spacing: -0.02em;">How to Solve a Rubik's Cube</h1>
          <p style="color: var(--text-secondary); font-size: 1.05rem;">
            Learn the standard Layer-by-Layer (LBL) method. With just 5 simple algorithms, anyone can solve a 3×3 cube!
          </p>
        </div>

        <button id="manual-solve-cta" class="btn btn-primary">
          ⚡ Use Automatic Solver
        </button>
      </div>

      <!-- Quick Navigation Index -->
      <div class="card-glass" style="display: flex; flex-wrap: wrap; gap: 10px; padding: 16px;">
        <span style="font-weight: 700; color: var(--text-secondary); align-self: center; margin-right: 8px;">Jump to:</span>
        <a href="#notation" class="btn btn-secondary btn-sm">1. Move Notation</a>
        <a href="#anatomy" class="btn btn-secondary btn-sm">2. Cube Anatomy</a>
        <a href="#step1" class="btn btn-secondary btn-sm">3. White Cross</a>
        <a href="#step2" class="btn btn-secondary btn-sm">4. First Layer Corners</a>
        <a href="#step3" class="btn btn-secondary btn-sm">5. Second Layer</a>
        <a href="#step4" class="btn btn-secondary btn-sm">6. Yellow Cross</a>
        <a href="#step5" class="btn btn-secondary btn-sm">7. Position Corners</a>
        <a href="#step6" class="btn btn-secondary btn-sm">8. Orient Corners</a>
      </div>

      <!-- Section: Move Notation -->
      <section id="notation" class="card-glass" style="display: flex; flex-direction: column; gap: 16px;">
        <h2 style="font-size: 1.4rem; font-weight: 800; color: #60A5FA;">1. Standard Move Notation</h2>
        <p style="color: var(--text-secondary); line-height: 1.6;">
          Each letter stands for one of the 6 faces. When a letter appears by itself, turn that face <strong>90° clockwise</strong>. An apostrophe (<strong>'</strong>) means <strong>counter-clockwise</strong> (called "prime"). A <strong>2</strong> means turn that face <strong>180°</strong>.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px;">
          <div style="background: rgba(255,255,255,0.04); padding: 14px; border-radius: 12px; text-align: center; border: 1px solid var(--border-subtle);">
            <div style="font-size: 1.6rem; font-weight: 800; color: #FFFFFF; font-family: var(--font-mono);">R</div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Right face CW</div>
          </div>
          <div style="background: rgba(255,255,255,0.04); padding: 14px; border-radius: 12px; text-align: center; border: 1px solid var(--border-subtle);">
            <div style="font-size: 1.6rem; font-weight: 800; color: #60A5FA; font-family: var(--font-mono);">R'</div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Right face CCW</div>
          </div>
          <div style="background: rgba(255,255,255,0.04); padding: 14px; border-radius: 12px; text-align: center; border: 1px solid var(--border-subtle);">
            <div style="font-size: 1.6rem; font-weight: 800; color: #FFFFFF; font-family: var(--font-mono);">U</div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Up (Top) face CW</div>
          </div>
          <div style="background: rgba(255,255,255,0.04); padding: 14px; border-radius: 12px; text-align: center; border: 1px solid var(--border-subtle);">
            <div style="font-size: 1.6rem; font-weight: 800; color: #60A5FA; font-family: var(--font-mono);">U'</div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Up face CCW</div>
          </div>
          <div style="background: rgba(255,255,255,0.04); padding: 14px; border-radius: 12px; text-align: center; border: 1px solid var(--border-subtle);">
            <div style="font-size: 1.6rem; font-weight: 800; color: #FFFFFF; font-family: var(--font-mono);">F</div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Front face CW</div>
          </div>
          <div style="background: rgba(255,255,255,0.04); padding: 14px; border-radius: 12px; text-align: center; border: 1px solid var(--border-subtle);">
            <div style="font-size: 1.6rem; font-weight: 800; color: #60A5FA; font-family: var(--font-mono);">F'</div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Front face CCW</div>
          </div>
        </div>
      </section>

      <!-- Section: Anatomy -->
      <section id="anatomy" class="card-glass" style="display: flex; flex-direction: column; gap: 16px;">
        <h2 style="font-size: 1.4rem; font-weight: 800; color: #10B981;">2. Anatomy of the Cube</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
          <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 14px; border: 1px solid var(--border-subtle);">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #FACC15; margin-bottom: 6px;">Centers (6 pieces)</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">
              Have only 1 color. They are fixed to the core and never move relative to each other. White is always opposite Yellow, Green opposite Blue, and Red opposite Orange.
            </p>
          </div>
          <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 14px; border: 1px solid var(--border-subtle);">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #38BDF8; margin-bottom: 6px;">Edges (12 pieces)</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">
              Have 2 colors. They sit between the corners. An edge can never be in a corner position, and a corner can never be an edge.
            </p>
          </div>
          <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 14px; border: 1px solid var(--border-subtle);">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #F472B6; margin-bottom: 6px;">Corners (8 pieces)</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">
              Have 3 colors. They sit at the 8 vertices of the cube.
            </p>
          </div>
        </div>
      </section>

      <!-- Step 1: White Cross -->
      <section id="step1" class="card-glass" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="background: #3B82F6; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">1</span>
          <h2 style="font-size: 1.3rem; font-weight: 800;">Step 1: The White Cross (Daisy Method)</h2>
        </div>
        <p style="color: var(--text-secondary); line-height: 1.6;">
          Hold the cube with the <strong>Yellow center on top</strong>. Bring the 4 white edge pieces around the yellow center to form a "Daisy". Then, match each white edge's side color with its corresponding center and do an <strong>F2</strong> (half turn) to rotate it down into the White face.
        </p>
        <div style="padding: 12px 16px; background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3B82F6; border-radius: 0 8px 8px 0; font-size: 0.9rem; color: #93C5FD;">
          🎯 <strong>Goal:</strong> A White cross on bottom with side colors matching the Red, Blue, Orange, and Green centers.
        </div>
      </section>

      <!-- Step 2: First Layer Corners -->
      <section id="step2" class="card-glass" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="background: #3B82F6; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">2</span>
          <h2 style="font-size: 1.3rem; font-weight: 800;">Step 2: First Layer Corners</h2>
        </div>
        <p style="color: var(--text-secondary); line-height: 1.6;">
          Keep White on bottom. Locate a corner piece with White on the top layer. Position it directly above its target slot between its matching centers. Repeat the iconic <strong>Right Sexy Move</strong> until the corner drops into place:
        </p>
        <div style="display: flex; align-items: center; gap: 14px; background: rgba(0,0,0,0.3); padding: 14px 20px; border-radius: 12px; border: 1px solid var(--border-subtle); width: fit-content;">
          <span style="font-weight: 700; color: #F59E0B;">Algorithm:</span>
          <span style="font-family: var(--font-mono); font-size: 1.3rem; font-weight: 800; color: #60A5FA; letter-spacing: 0.05em;">R U R' U'</span>
        </div>
      </section>

      <!-- Step 3: Second Layer Edges -->
      <section id="step3" class="card-glass" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="background: #3B82F6; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">3</span>
          <h2 style="font-size: 1.3rem; font-weight: 800;">Step 3: Second Layer Edges (F2L)</h2>
        </div>
        <p style="color: var(--text-secondary); line-height: 1.6;">
          Find an edge in the top layer that has <em>no Yellow</em>. Align its front color with the matching center.
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; border: 1px solid var(--border-subtle);">
            <div style="font-weight: 700; color: #34D399; margin-bottom: 6px;">To insert edge to the RIGHT:</div>
            <div style="font-family: var(--font-mono); font-weight: 800; font-size: 1.15rem; color: #60A5FA;">U R U' R' U' F' U F</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; border: 1px solid var(--border-subtle);">
            <div style="font-weight: 700; color: #F472B6; margin-bottom: 6px;">To insert edge to the LEFT:</div>
            <div style="font-family: var(--font-mono); font-weight: 800; font-size: 1.15rem; color: #60A5FA;">U' L' U L U F U' F'</div>
          </div>
        </div>
      </section>

      <!-- Step 4: Yellow Cross -->
      <section id="step4" class="card-glass" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="background: #3B82F6; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">4</span>
          <h2 style="font-size: 1.3rem; font-weight: 800;">Step 4: Top Yellow Cross</h2>
        </div>
        <p style="color: var(--text-secondary); line-height: 1.6;">
          You will have either a Dot, an 'L' shape (position at top-left), or a horizontal Line. Perform:
        </p>
        <div style="display: flex; align-items: center; gap: 14px; background: rgba(0,0,0,0.3); padding: 14px 20px; border-radius: 12px; border: 1px solid var(--border-subtle); width: fit-content;">
          <span style="font-weight: 700; color: #F59E0B;">Algorithm:</span>
          <span style="font-family: var(--font-mono); font-size: 1.3rem; font-weight: 800; color: #60A5FA; letter-spacing: 0.05em;">F R U R' U' F'</span>
        </div>
      </section>

      <!-- Step 5: Position Corners -->
      <section id="step5" class="card-glass" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="background: #3B82F6; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">5</span>
          <h2 style="font-size: 1.3rem; font-weight: 800;">Step 5: Position Yellow Corners (Niklas)</h2>
        </div>
        <p style="color: var(--text-secondary); line-height: 1.6;">
          Find a corner that is in the correct location (even if twisted). Hold it at the front-right. Cycle the other 3 corners:
        </p>
        <div style="display: flex; align-items: center; gap: 14px; background: rgba(0,0,0,0.3); padding: 14px 20px; border-radius: 12px; border: 1px solid var(--border-subtle); width: fit-content;">
          <span style="font-weight: 700; color: #F59E0B;">Algorithm:</span>
          <span style="font-family: var(--font-mono); font-size: 1.3rem; font-weight: 800; color: #60A5FA; letter-spacing: 0.05em;">U R U' L' U R' U' L</span>
        </div>
      </section>

      <!-- Step 6: Orient Corners -->
      <section id="step6" class="card-glass" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="background: #10B981; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">6</span>
          <h2 style="font-size: 1.3rem; font-weight: 800;">Step 6: Orient Yellow Corners (Final Step!)</h2>
        </div>
        <p style="color: var(--text-secondary); line-height: 1.6;">
          Hold the cube with an unoriented corner at <strong>Front-Right</strong>. Perform <strong>R' D' R D</strong> (2 or 4 times) until Yellow faces up. Then turn <strong>only the top face (U)</strong> to bring the next unsolved corner to the Front-Right and repeat!
        </p>
        <div style="display: flex; align-items: center; gap: 14px; background: rgba(0,0,0,0.3); padding: 14px 20px; border-radius: 12px; border: 1px solid var(--border-subtle); width: fit-content;">
          <span style="font-weight: 700; color: #F59E0B;">Algorithm:</span>
          <span style="font-family: var(--font-mono); font-size: 1.3rem; font-weight: 800; color: #10B981; letter-spacing: 0.05em;">R' D' R D</span>
        </div>
        <div style="padding: 12px 16px; background: rgba(239, 68, 68, 0.1); border-left: 4px solid #EF4444; border-radius: 0 8px 8px 0; font-size: 0.85rem; color: #FCA5A5;">
          ⚠️ <strong>Crucial rule:</strong> Don't forget the final <strong>D</strong> turn in the sequence, and do NOT rotate the whole cube — only rotate the top <strong>U</strong> layer!
        </div>
      </section>
    </div>
  `;

  container.querySelector('#manual-solve-cta').addEventListener('click', () => {
    router.navigate('/input');
  });

  return () => {};
}
