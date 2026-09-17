/**
 * Rubik's Cube Solution Animator
 * 
 * Media-player style controller for step-by-step 3D solution playback.
 * Supports play/pause, step forward/back, scrub to step, speed adjustments, and completion events.
 */

export class CubeAnimator {
  constructor(cubeRenderer, options = {}) {
    this.renderer = cubeRenderer;
    this.options = {
      defaultSpeed: 1, // 1x
      onStepChange: null,
      onPlayStateChange: null,
      onComplete: null,
      ...options,
    };

    this.solution = null; // Output from solverManager.solve()
    this.currentStepIndex = 0; // 0 = initial state before move 0; 1 = after move 0; etc.
    this.isPlaying = false;
    this.speedMultiplier = this.options.defaultSpeed;
    this.playTimeout = null;
    this.isTransitioning = false;
  }

  /**
   * Set a new solution and jump to initial state
   * @param {Object} solution - From solverManager.solve()
   */
  setSolution(solution) {
    this.pause();
    this.solution = solution;
    this.currentStepIndex = 0;

    if (solution && solution.initialState) {
      this.renderer.setState(solution.initialState);
    }

    this.emitStepChange();
  }

  get totalSteps() {
    return this.solution ? this.solution.steps.length : 0;
  }

  get currentStep() {
    if (!this.solution || this.currentStepIndex <= 0) return null;
    return this.solution.steps[this.currentStepIndex - 1];
  }

  get nextStep() {
    if (!this.solution || this.currentStepIndex >= this.totalSteps) return null;
    return this.solution.steps[this.currentStepIndex];
  }

  get isAtBeginning() {
    return this.currentStepIndex === 0;
  }

  get isAtEnd() {
    return this.solution ? this.currentStepIndex >= this.totalSteps : true;
  }

  getAnimationDuration() {
    const baseMs = 380;
    if (this.speedMultiplier <= 0) return 0;
    return Math.round(baseMs / this.speedMultiplier);
  }

  getStepDelay() {
    const baseDelay = 220;
    if (this.speedMultiplier <= 0) return 0;
    return Math.round(baseDelay / this.speedMultiplier);
  }

  setSpeed(multiplier) {
    this.speedMultiplier = Number(multiplier) || 1;
  }

  async play() {
    if (this.isPlaying) return;
    if (this.isAtEnd) {
      // If already at end, restart from beginning
      await this.goToStep(0);
    }

    this.isPlaying = true;
    if (this.options.onPlayStateChange) {
      this.options.onPlayStateChange(true);
    }

    this.playNextLoop();
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.playTimeout) {
      clearTimeout(this.playTimeout);
      this.playTimeout = null;
    }
    if (this.options.onPlayStateChange) {
      this.options.onPlayStateChange(false);
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  async playNextLoop() {
    if (!this.isPlaying) return;

    if (this.isAtEnd) {
      this.pause();
      if (this.options.onComplete) {
        this.options.onComplete();
      }
      return;
    }

    const nextStepObj = this.nextStep;
    if (!nextStepObj) {
      this.pause();
      return;
    }

    await this.stepForward();

    if (this.isPlaying && !this.isAtEnd) {
      const delay = this.getStepDelay();
      this.playTimeout = setTimeout(() => {
        this.playNextLoop();
      }, delay);
    } else if (this.isAtEnd) {
      this.pause();
      if (this.options.onComplete) {
        this.options.onComplete();
      }
    }
  }

  async stepForward() {
    if (!this.solution || this.isAtEnd || this.isTransitioning) return;
    this.isTransitioning = true;

    const stepObj = this.solution.steps[this.currentStepIndex];
    const duration = this.getAnimationDuration();

    await this.renderer.animateMove(stepObj.move, duration);

    this.currentStepIndex++;
    this.isTransitioning = false;
    this.emitStepChange();
  }

  async stepBackward() {
    if (!this.solution || this.isAtBeginning || this.isTransitioning) return;
    this.pause();
    this.isTransitioning = true;

    // To go backward smoothly:
    const prevIndex = this.currentStepIndex - 1;
    const targetState = prevIndex === 0
      ? this.solution.initialState
      : this.solution.steps[prevIndex - 1].stateAfter;

    this.currentStepIndex = prevIndex;
    this.renderer.setState(targetState);

    this.isTransitioning = false;
    this.emitStepChange();
  }

  async goToStep(stepIndex) {
    if (!this.solution || this.isTransitioning) return;
    this.pause();

    const target = Math.max(0, Math.min(stepIndex, this.totalSteps));
    this.currentStepIndex = target;

    const targetState = target === 0
      ? this.solution.initialState
      : this.solution.steps[target - 1].stateAfter;

    this.renderer.setState(targetState);
    this.emitStepChange();
  }

  emitStepChange() {
    if (this.options.onStepChange) {
      this.options.onStepChange({
        stepIndex: this.currentStepIndex,
        totalSteps: this.totalSteps,
        currentStep: this.currentStep,
        nextStep: this.nextStep,
        isAtBeginning: this.isAtBeginning,
        isAtEnd: this.isAtEnd,
        progress: this.totalSteps > 0 ? this.currentStepIndex / this.totalSteps : 0,
      });
    }
  }

  destroy() {
    this.pause();
  }
}
