export function Input({ className = "", error = false, ...props }) {
  return (
    <input
      className={`ui-input${error ? " is-error" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", error = false, ...props }) {
  return (
    <textarea
      className={`ui-textarea${error ? " is-error" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

export function Field({ label, error, children, className = "" }) {
  return (
    <label className={`ui-field${className ? ` ${className}` : ""}`}>
      {label ? <span className="ui-label">{label}</span> : null}
      {children}
      {error ? <p className="ui-field-error">{error}</p> : null}
    </label>
  );
}
