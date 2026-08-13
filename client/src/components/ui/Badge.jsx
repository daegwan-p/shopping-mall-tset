export function Chip({
  children,
  selected = false,
  onRemove,
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      className={`ui-chip${selected ? " is-selected" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    >
      <span>{children}</span>
      {onRemove ? (
        <span
          className="ui-chip-remove"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }
          }}
        >
          ×
        </span>
      ) : null}
    </button>
  );
}

export function Badge({ children, tone = "neutral", className = "" }) {
  const toneClass =
    tone === "sale"
      ? "ui-badge-sale"
      : tone === "soldout"
        ? "ui-badge-soldout"
        : tone === "danger"
          ? "ui-badge-danger"
          : "";

  return (
    <span className={`ui-badge ${toneClass}${className ? ` ${className}` : ""}`}>
      {children}
    </span>
  );
}
