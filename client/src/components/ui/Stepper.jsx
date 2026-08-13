const DEFAULT_STEPS = [
  { id: "cart", label: "01 장바구니" },
  { id: "checkout", label: "02 주문/결제" },
  { id: "complete", label: "03 완료" },
];

export function Stepper({ active = "cart", steps = DEFAULT_STEPS }) {
  return (
    <div className="ui-stepper" aria-label="주문 단계">
      {steps.map((step, index) => (
        <div key={step.id} style={{ display: "contents" }}>
          {index > 0 ? <span className="ui-step-line" aria-hidden="true" /> : null}
          <span className={`ui-step${active === step.id ? " is-active" : ""}`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
