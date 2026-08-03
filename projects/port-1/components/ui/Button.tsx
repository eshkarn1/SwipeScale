type Variant = "solid" | "outline";

interface ButtonProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  /** renders an <a> when present, a <button> otherwise */
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

/**
 * Body face, never the display face (spec §4). 2px radius — the only
 * non-zero radius in the build. Min height 44px for tap targets.
 */
export default function Button({
  children,
  variant = "outline",
  className = "",
  href,
  type = "button",
  disabled = false,
}: ButtonProps) {
  const classes = `btn ${variant === "solid" ? "btn-solid" : "btn-outline"} ${className}`;

  if (href !== undefined) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
