interface EyebrowProps {
  children: React.ReactNode;
  /** amber is reserved for timecode, frame counters, and the case line (spec §6.3) */
  tone?: "bone" | "amber";
  className?: string;
  as?: "p" | "span" | "div";
}

export default function Eyebrow({
  children,
  tone = "bone",
  className = "",
  as: Tag = "p",
}: EyebrowProps) {
  const colour = tone === "amber" ? "text-amber" : "text-bone";
  return <Tag className={`mono ${colour} ${className}`}>{children}</Tag>;
}
