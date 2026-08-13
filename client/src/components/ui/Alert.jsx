export function Alert({ tone = "info", children, action, className = "" }) {
  return (
    <div className={`ui-alert ui-alert-${tone}${className ? ` ${className}` : ""}`}>
      <div>{children}</div>
      {action || null}
    </div>
  );
}

export function EmptyState({ message, action, className = "" }) {
  return (
    <div className={`ui-empty${className ? ` ${className}` : ""}`}>
      <p>{message}</p>
      {action || null}
    </div>
  );
}
