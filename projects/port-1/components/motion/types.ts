// PLACEHOLDER — owned by Script 2 (motion engine). Public API is contractual; implementation is not.

import type { SequenceId, SequenceManifest, SequenceMode } from "@/lib/sequences";

export interface FrameSequenceProps {
  /** manifest key in lib/sequences.ts */
  id: SequenceId;
  /** overrides the manifest default when a surface needs a different behaviour */
  mode?: SequenceMode;
  /** applied to the wrapping element */
  className?: string;
  /**
   * scrub sequences: the element whose scroll progress drives the frame index.
   * Defaults to the sequence's own nearest positioned ancestor.
   */
  scrubTargetId?: string;
  /** hint the loader to start immediately rather than on approach */
  priority?: boolean;
}

export interface FrameLoaderState {
  /** decoded frames, 1-based index at position `frame - 1`; holes are still loading */
  frames: (HTMLImageElement | null)[];
  /** 0 → 1 */
  progress: number;
  ready: boolean;
}

export interface CoverFitRect {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export type { SequenceId, SequenceManifest, SequenceMode };
