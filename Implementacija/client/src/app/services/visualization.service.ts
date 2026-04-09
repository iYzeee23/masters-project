import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  Grid, Position, AlgorithmOptions, AlgorithmEvent,
  AlgorithmResult, VisualizationState, EventType,
} from '@shared/types';
import { createAlgorithm, runAlgorithm, PathfindingAlgorithm } from '../algorithms';
import { GridRendererService } from './grid-renderer.service';

@Injectable({ providedIn: 'root' })
export class VisualizationService {
  private algorithm: PathfindingAlgorithm | null = null;
  private animationTimer: ReturnType<typeof setTimeout> | null = null;
  private allStepEvents: AlgorithmEvent[][] = [];
  private currentStepIndex = 0;

  readonly state$ = new BehaviorSubject<VisualizationState>(VisualizationState.IDLE);
  readonly speed$ = new BehaviorSubject<number>(50); // ms per step
  readonly metrics$ = new BehaviorSubject<AlgorithmResult | null>(null);
  readonly stepIndex$ = new BehaviorSubject<number>(0);
  readonly totalSteps$ = new BehaviorSubject<number>(0);
  readonly executionTimeMs$ = new BehaviorSubject<number>(0);

  constructor(private renderer: GridRendererService) {}

  /**
   * Prepare algorithm for step-by-step visualization.
   */
  prepare(grid: Grid, start: Position, goal: Position, options: AlgorithmOptions): void {
    this.stop();
    this.renderer.resetVisualization();

    // Pre-compute all steps (so we can scrub through them)
    const startTime = performance.now();
    this.algorithm = createAlgorithm(grid, start, goal, options);
    this.allStepEvents = [];

    while (!this.algorithm.isDone()) {
      const events = this.algorithm.step();
      if (events.length > 0) {
        this.allStepEvents.push(events);
      }
    }
    const endTime = performance.now();
    this.executionTimeMs$.next(endTime - startTime);

    this.currentStepIndex = 0;
    this.totalSteps$.next(this.allStepEvents.length);
    this.stepIndex$.next(0);
    this.metrics$.next(this.algorithm.getResult());
    this.state$.next(VisualizationState.PAUSED);
  }

  /**
   * Start or resume animation playback.
   */
  play(): void {
    if (this.state$.value === VisualizationState.FINISHED) return;
    if (this.allStepEvents.length === 0) return;

    this.state$.next(VisualizationState.RUNNING);
    this.scheduleNextStep();
  }

  /**
   * Pause the animation.
   */
  pause(): void {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
    this.state$.next(VisualizationState.PAUSED);
  }

  /**
   * Execute a single step forward.
   */
  stepForward(): void {
    if (this.state$.value === VisualizationState.FINISHED) return;
    if (this.currentStepIndex >= this.allStepEvents.length) {
      this.state$.next(VisualizationState.FINISHED);
      return;
    }

    const events = this.allStepEvents[this.currentStepIndex];
    this.renderer.applyEvents(events);
    this.currentStepIndex++;
    this.stepIndex$.next(this.currentStepIndex);

    if (this.currentStepIndex >= this.allStepEvents.length) {
      this.state$.next(VisualizationState.FINISHED);
    }
  }

  /**
   * Jump to a specific step index.
   */
  jumpToStep(targetStep: number): void {
    this.pause();
    this.renderer.resetVisualization();
    this.currentStepIndex = 0;

    const end = Math.min(targetStep, this.allStepEvents.length);
    for (let i = 0; i < end; i++) {
      this.renderer.applyEventsBatch(this.allStepEvents[i]);
    }
    this.renderer.render();

    this.currentStepIndex = end;
    this.stepIndex$.next(this.currentStepIndex);

    if (this.currentStepIndex >= this.allStepEvents.length) {
      this.state$.next(VisualizationState.FINISHED);
    } else {
      this.state$.next(VisualizationState.PAUSED);
    }
  }

  /**
   * Skip to the end — show final result.
   */
  skipToEnd(): void {
    this.pause();
    this.jumpToStep(this.allStepEvents.length);
  }

  /**
   * Reset everything.
   */
  reset(): void {
    this.stop();
    this.renderer.resetVisualization();
    this.currentStepIndex = 0;
    this.stepIndex$.next(0);
    this.state$.next(VisualizationState.IDLE);
    this.metrics$.next(null);
    this.executionTimeMs$.next(0);
  }

  /**
   * Stop and clean up.
   */
  stop(): void {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
    this.algorithm = null;
    this.allStepEvents = [];
  }

  /**
   * Set playback speed.
   */
  setSpeed(ms: number): void {
    this.speed$.next(ms);
  }

  /**
   * Analyze the pre-computed trace and extract key moments programmatically.
   * Returns step indices + context for each key moment (for AI to explain).
   */
  extractKeyMoments(): { stepIndex: number; context: string }[] {
    if (this.allStepEvents.length === 0) return [];

    const total = this.allStepEvents.length;
    const moments: { stepIndex: number; context: string }[] = [];
    let openSize = 0;
    let closedSize = 0;
    let maxOpenSize = 0;
    let maxOpenStep = 0;
    let pathFoundStep = total;

    // Single pass: track open/closed sizes, find peaks
    const openHistory: number[] = [];
    const closedHistory: number[] = [];

    for (let i = 0; i < total; i++) {
      for (const ev of this.allStepEvents[i]) {
        if (ev.type === EventType.OPEN_ADD) openSize++;
        if (ev.type === EventType.CLOSE_ADD) { closedSize++; openSize = Math.max(0, openSize - 1); }
        if (ev.type === EventType.FOUND_PATH || ev.type === EventType.NO_PATH) pathFoundStep = i;
      }
      openHistory.push(openSize);
      closedHistory.push(closedSize);
      if (openSize > maxOpenSize) { maxOpenSize = openSize; maxOpenStep = i; }
    }

    // Key moment 1: Early exploration (~10% of steps)
    const earlyStep = Math.min(Math.floor(total * 0.1), total - 1);
    moments.push({
      stepIndex: earlyStep,
      context: `Early exploration: ${closedHistory[earlyStep]} nodes closed, ${openHistory[earlyStep]} in frontier.`,
    });

    // Key moment 2: Peak frontier (most nodes waiting to be explored)
    if (maxOpenStep !== earlyStep) {
      moments.push({
        stepIndex: maxOpenStep,
        context: `Frontier peaked at ${maxOpenSize} nodes. ${closedHistory[maxOpenStep]} nodes already explored.`,
      });
    }

    // Key moment 3: Mid-point (~50%)
    const midStep = Math.floor(total * 0.5);
    if (midStep !== maxOpenStep && midStep !== earlyStep) {
      moments.push({
        stepIndex: midStep,
        context: `Halfway through: ${closedHistory[midStep]} nodes closed, ${openHistory[midStep]} in frontier. ${Math.round((closedHistory[midStep] / (closedHistory[total - 1] || 1)) * 100)}% of total exploration done.`,
      });
    }

    // Key moment 4: Late exploration (~80%)
    const lateStep = Math.floor(total * 0.8);
    if (lateStep !== midStep && lateStep !== maxOpenStep && lateStep < pathFoundStep) {
      moments.push({
        stepIndex: lateStep,
        context: `Late stage: ${closedHistory[lateStep]} nodes closed, frontier down to ${openHistory[lateStep]} nodes.`,
      });
    }

    // Key moment 5: Path found (or no path)
    const finalEvents = this.allStepEvents[pathFoundStep] || [];
    const found = finalEvents.some(e => e.type === EventType.FOUND_PATH);
    moments.push({
      stepIndex: pathFoundStep,
      context: found
        ? `Path found after exploring ${closedHistory[pathFoundStep] || closedSize} nodes.`
        : `No path exists. All ${closedSize} reachable nodes explored.`,
    });

    return moments.sort((a, b) => a.stepIndex - b.stepIndex);
  }

  /**
   * Run algorithm instantly (no animation) and return result.
   */
  runInstant(grid: Grid, start: Position, goal: Position, options: AlgorithmOptions) {
    return runAlgorithm(grid, start, goal, options);
  }

  /**
   * Post-edit Re-solve: re-run algorithm after map change, show only final path.
   */
  postEditResolve(grid: Grid, start: Position, goal: Position, options: AlgorithmOptions): void {
    this.stop();
    this.renderer.resetVisualization();

    const { result, trace } = runAlgorithm(grid, start, goal, options);
    this.metrics$.next(result);

    // Show only the final path (no animation)
    const pathEvent = trace.find(e => e.type === EventType.FOUND_PATH || e.type === EventType.NO_PATH);
    if (pathEvent) {
      this.renderer.applyEvents([pathEvent]);
    }

    this.state$.next(VisualizationState.FINISHED);
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  private scheduleNextStep(): void {
    if (this.state$.value !== VisualizationState.RUNNING) return;

    this.animationTimer = setTimeout(() => {
      this.stepForward();

      if (this.state$.value === VisualizationState.RUNNING) {
        this.scheduleNextStep();
      }
    }, this.speed$.value);
  }
}
