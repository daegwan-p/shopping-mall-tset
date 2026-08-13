export function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  const classes = [
    "ui-btn",
    `ui-btn-${variant}`,
    size === "sm" ? "ui-btn-sm" : "",
    block ? "ui-btn-block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
