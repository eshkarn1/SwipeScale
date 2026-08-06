import type React from "react";
import type { SequenceId } from "@/lib/sequences";

/** Spec §6. */
export interface FrameSequenceProps {
  id: SequenceId;
  mode: "scrub" | "loop";
  className?: string;
  /** scrub only — scroll distance as a multiple of viewport height. Default 3. */
  scrollLength?: number;
  /** loop only — overrides manifest fps. */
  fps?: number;
  /** Called once when Pass A completes. */
  onReady?: () => void;
  /** Renders while Pass A is in flight. Receives 0–1. */
  renderLoading?: (progress: number) => React.ReactNode;
}
