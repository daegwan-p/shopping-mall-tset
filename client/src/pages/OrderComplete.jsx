import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, Stepper } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { getOrder } from "../api/orders";
import { formatPrice } from "../utils/productDisplay";

function isOrderOwner(order, user) {
  if (!order || !user) return false;
  const ownerId = order.user?._id || order.user;
  return String(ownerId) === String(user._id || user.id);
}

function OrderComplete() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const stateOrder = location.state?.order;
    if (stateOrder && isOrderOwner(stateOrder, user)) {
      setOrder(stateOrder);
      setLoading(false);
      return undefined;
    }

    if (!id) {
      setLoading(false);
      return undefined;
    }

    getOrder(id)
      .then((data) => {
        if (cancelled) return;
        if (!isOrderOwner(data.order, user)) {
          navigate(user?.role === "admin" ? "/admin/orders" : "/", {
            replace: true,
          });
          return;
        }
        setOrder(data.order);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, user, location.state, navigate]);

  if (error) {
    return (
      <main className="checkout-flow">
        <div className="checkout-flow-inner">
          <p className="auth-error">{error}</p>
          <Link to="/">
            <Button>홈으로</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (loading || !order) {
    return (
      <main className="checkout-flow">
        <div className="checkout-flow-inner">
          <p className="products-empty">주문 정보를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  const addr = order.shippingAddress || {};
  const productAmount =
    Number(order.totalAmount || 0) - Number(order.shippingFee || 0);

  return (
    <main className="checkout-flow">
      <div className="checkout-flow-inner">
        <Stepper active="complete" />

        <section className="complete-hero">
          <div className="complete-check" aria-hidden="true">
            ✓
          </div>
          <h1>주문이 접수되었습니다</h1>
          <p>
            주문번호 {order.orderNumber}
            <br />
            확인 메일을 보내드렸습니다. 일반 배송은 평일 기준 2–3일 내 수령
            가능합니다.
          </p>
          <div className="complete-actions">
            <Link to={`/mypage/orders/${order._id}`}>
              <Button>주문 상세 보기</Button>
            </Link>
            <Link to="/products">
              <Button variant="secondary">계속 쇼핑하기</Button>
            </Link>
          </div>
        </section>

        <div className="complete-layout">
          <section className="checkout-card">
            <h2>주문 상품</h2>
            <ul className="checkout-items">
              {(order.items || []).map((item, index) => (
                <li key={`${item.productName}-${index}`}>
                  <div
                    className="cart-thumb"
                    style={
                      item.image
                        ? { backgroundImage: `url(${item.image})` }
                        : undefined
                    }
                  />
                  <div>
                    <p className="cart-brand">{item.brandName}</p>
                    <p className="cart-name">{item.productName}</p>
                    <p className="cart-option">
                      {item.color} / {item.size} · {item.quantity}개
                    </p>
                  </div>
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </li>
              ))}
            </ul>
            <div className="complete-split">
              <div>
                <h3>배송지</h3>
                <p>
                  {addr.recipient}
                  <br />
                  {addr.phone}
                  <br />
                  {addr.address} {addr.detailAddress}
                  <br />
                  {addr.memo}
                </p>
              </div>
              <div>
                <h3>결제 정보</h3>
                <p>
                  {order.paymentMethod || "-"}
                  <br />
                  결제 금액 {formatPrice(order.totalAmount)}
                </p>
              </div>
            </div>
          </section>

          <aside className="cart-summary">
            <h2>결제 내역</h2>
            <dl className="summary-dl">
              <div>
                <dt>상품 금액</dt>
                <dd>{formatPrice(productAmount)}</dd>
              </div>
              <div>
                <dt>배송비</dt>
                <dd>
                  {order.shippingFee === 0 || order.shippingFee == null
                    ? "무료"
                    : formatPrice(order.shippingFee)}
                </dd>
              </div>
            </dl>
            <div className="summary-total">
              <span>결제 금액</span>
              <strong>{formatPrice(order.totalAmount)}</strong>
            </div>
            <div className="checkout-card" style={{ marginTop: 18 }}>
              <h3>배송 안내</h3>
              <p className="muted-note">
                송장번호는 SMS로 안내되며 마이페이지에서도 확인할 수 있습니다.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default OrderComplete;
