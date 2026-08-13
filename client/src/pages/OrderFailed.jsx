import { Link, useLocation } from "react-router-dom";
import { Button, Stepper } from "../components/ui";

function OrderFailed() {
  const location = useLocation();
  const message =
    location.state?.message ||
    "결제 또는 주문 처리 중 문제가 발생했습니다.";
  const orderNumber = location.state?.orderNumber || "";
  const keptPending = Boolean(location.state?.keptPending);

  return (
    <main className="checkout-flow">
      <div className="checkout-flow-inner">
        <Stepper active="complete" />

        <section className="complete-hero order-failed-hero">
          <div className="complete-check order-failed-mark" aria-hidden="true">
            !
          </div>
          <h1>주문에 실패했습니다</h1>
          <p>
            {message}
            {orderNumber ? (
              <>
                <br />
                {keptPending
                  ? `주문번호 ${orderNumber} 결제는 확인 중이거나 미완료 상태입니다. 고객센터 또는 관리자에게 문의해 주세요.`
                  : `관련 주문번호 ${orderNumber}은(는) 취소 처리되어 주문 내역에 표시되지 않습니다.`}
              </>
            ) : null}
          </p>
          <div className="complete-actions">
            <Link to="/cart">
              <Button>장바구니로 돌아가기</Button>
            </Link>
            <Link to="/checkout">
              <Button variant="secondary">다시 결제하기</Button>
            </Link>
            <Link to="/products">
              <Button variant="text">상품 보러가기</Button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default OrderFailed;
