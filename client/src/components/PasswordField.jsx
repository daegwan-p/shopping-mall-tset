function PasswordField({
  label,
  name,
  value,
  onChange,
  show,
  onToggle,
  required = false,
  minLength,
}) {
  return (
    <label>
      {label}
      <div className="password-field">
        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          minLength={minLength}
          required={required}
        />
        <button type="button" className="password-toggle" onClick={onToggle}>
          {show ? "숨기기" : "보기"}
        </button>
      </div>
    </label>
  );
}

export default PasswordField;
