export function Checkbox({ label, className = "", ...props }) {
  return (
    <label className={`ui-check${className ? ` ${className}` : ""}`}>
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Radio({ label, className = "", ...props }) {
  return (
    <label className={`ui-radio${className ? ` ${className}` : ""}`}>
      <input type="radio" {...props} />
      <span>{label}</span>
    </label>
  );
}
