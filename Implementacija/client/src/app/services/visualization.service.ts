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

  constructor(private renderer: GridRendererService) {}

  /**
   * Prepare algorithm for step-by-step visualization.
   */
  prepare(grid: Grid, start: Position, goal: Position, options: AlgorithmOptions): void {
    this.stop();
    this.renderer.resetVisualization();

    // Pre-compute all steps (so we can scrub through them)
    this.algorithm = createAlgorithm(grid, start, goal, options);
    this.allStepEvents = [];

    while (!this.algorithm.isDone()) {
      const events = this.algorithm.step();
      if (events.length > 0) {
        this.allStepEvents.push(events);
      }
    }

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
  // SIMULATE LIVE — agent moves, user changes map, rerun from agent position
  // ============================================================

  private simulateLiveTimer: ReturnType<typeof setTimeout> | null = null;
  private simulateLivePath: Position[] = [];
  private simulateLiveAgentIndex = 0;
  private simulateLiveOptions: AlgorithmOptions | null = null;
  readonly simulateLiveActive$ = new BehaviorSubject<boolean>(false);
  readonly agentPosition$ = new BehaviorSubject<Position | null>(null);

  /**
   * Start Simulate Live mode: agent starts moving along the found path.
   */
  startSimulateLive(grid: Grid, start: Position, goal: Position, options: AlgorithmOptions): void {
    this.stop();
    this.stopSimulateLive();
    this.renderer.resetVisualization();

    const { result } = runAlgorithm(grid, start, goal, options);
    if (!result.path) {
      this.metrics$.next(result);
      this.renderer.applyEvents([{ type: EventType.NO_PATH }]);
      return;
    }

    this.simulateLivePath = result.path;
    this.simulateLiveAgentIndex = 0;
    this.simulateLiveOptions = options;
    this.metrics$.next(result);
    this.simulateLiveActive$.next(true);

    // Show initial path
    this.renderer.applyEvents([{
      type: EventType.FOUND_PATH,
      path: result.path,
      totalCost: result.cost,
    }]);

    this.moveAgent();
  }

  /**
   * Called when user changes the map during Simulate Live — rerun from agent position.
   */
  simulateLiveReplan(grid: Grid, goal: Position): void {
    if (!this.simulateLiveActive$.value || !this.simulateLiveOptions) return;

    const agentPos = this.simulateLivePath[this.simulateLiveAgentIndex];
    if (!agentPos) return;

    // Pause agent movement
    if (this.simulateLiveTimer) {
      clearTimeout(this.simulateLiveTimer);
      this.simulateLiveTimer = null;
    }

    // Re-run algorithm from agent's current position
    const { result } = runAlgorithm(grid, agentPos, goal, this.simulateLiveOptions);

    this.renderer.resetVisualization();

    if (result.path) {
      this.simulateLivePath = result.path;
      this.simulateLiveAgentIndex = 0;
      this.metrics$.next(result);

      this.renderer.applyEvents([{
        type: EventType.FOUND_PATH,
        path: result.path,
        totalCost: result.cost,
      }]);

      this.moveAgent();
    } else {
      this.metrics$.next(result);
      this.renderer.applyEvents([{ type: EventType.NO_PATH }]);
    }
  }

  stopSimulateLive(): void {
    if (this.simulateLiveTimer) {
      clearTimeout(this.simulateLiveTimer);
      this.simulateLiveTimer = null;
    }
    this.simulateLiveActive$.next(false);
    this.agentPosition$.next(null);
    this.simulateLivePath = [];
    this.simulateLiveAgentIndex = 0;
  }

  private moveAgent(): void {
    if (this.simulateLiveAgentIndex >= this.simulateLivePath.length) {
      this.simulateLiveActive$.next(false);
      return;
    }

    const pos = this.simulateLivePath[this.simulateLiveAgentIndex];
    this.agentPosition$.next(pos);
    this.simulateLiveAgentIndex++;

    this.simulateLiveTimer = setTimeout(() => {
      this.moveAgent();
    }, this.speed$.value * 3); // Slower than visualization
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
