/**
 * Scene state — the bridge between scroll and the 3D scene.
 *
 * Deliberately a module-level mutable object rather than React state or a
 * store with subscriptions. ScrollTrigger writes to it up to 60 times a
 * second; routing that through setState would re-render the React tree on
 * every frame of every scroll, which is exactly the stutter this site cannot
 * afford. The canvas reads these values inside useFrame, where a plain object
 * read costs nothing.
 *
 * Rule: components may READ this anywhere, but only the choreography module
 * WRITES to it. One writer keeps it debuggable.
 */

export type SceneBeat =
  | 'arrival'
  | 'proof'
  | 'offerings'
  | 'process'
  | 'graph'
  | 'agents'
  | 'evidence'
  | 'close';

export interface SceneState {
  /** 0–1 through the entire page scroll. */
  progress: number;
  /** Normalised scroll velocity, roughly −1..1. Drives deformation. */
  velocity: number;
  /** Which storyboard beat is currently active. */
  beat: SceneBeat;
  /** 0–1 progress within the current beat. */
  beatProgress: number;
  /** How far the three offering forms have separated, 0 = merged, 1 = apart. */
  separation: number;
  /** How deep the camera is inside the team graph, 0–1. */
  graphDepth: number;
  /** Set once by the provider so scene code can branch without re-querying. */
  reducedMotion: boolean;
}

export const sceneState: SceneState = {
  progress: 0,
  velocity: 0,
  beat: 'arrival',
  beatProgress: 0,
  separation: 0,
  graphDepth: 0,
  reducedMotion: false,
};

/** Reset between route changes so a new page never inherits a stale camera. */
export function resetSceneState() {
  sceneState.progress = 0;
  sceneState.velocity = 0;
  sceneState.beat = 'arrival';
  sceneState.beatProgress = 0;
  sceneState.separation = 0;
  sceneState.graphDepth = 0;
}
