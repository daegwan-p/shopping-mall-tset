import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui";
import { getOrders } from "../../api/orders";
import { orderStatusLabel } from "../../utils/orderStatus";
import { formatPrice } from "../../utils/productDisplay";

function MyShipping() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getOrders({ page: 1, limit: 50 })
      .then((data) => {
        const list = (data.orders || []).filter(
          (order) =>
            order.trackingNumber ||
            order.status === "shipping" ||
            order.status === "delivered" ||
            order.status === "preparing" ||
            order.status === "paid"
        );
        setOrders(list);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <h1>배송 조회</h1>
      <p className="muted-note" style={{ marginBottom: 18 }}>
        결제 완료 이후 주문과 송장 정보를 확인합니다.
      </p>

      {error ? <p className="auth-error">{error}</p> : null}
      {loading ? <p className="products-empty">불러오는 중...</p> : null}
      {!loading && orders.length === 0 ? (
        <p className="products-empty">조회할 배송 주문이 없습니다.</p>
      ) : null}

      <div className="order-card-list">
        {orders.map((order) => {
          const first = order.items?.[0];
          return (
            <article key={order._id} className="order-card">
              <div className="order-card-head">
                <div>
                  <strong>{order.orderNumber}</strong>
                  <span> · {orderStatusLabel(order.status)}</span>
                </div>
                <Link to={`/mypage/orders/${order._id}`}>주문 상세</Link>
              </div>
              <div className="order-card-body">
                <div
                  className="cart-thumb"
                  style={
                    first?.image
                      ? { backgroundImage: `url(${first.image})` }
                      : undefined
                  }
                />
                <div className="order-card-info">
                  <p className="cart-brand">{first?.brandName}</p>
                  <p className="cart-name">{first?.productName}</p>
                  <p className="cart-option">
                    {formatPrice(order.totalAmount)}
                    {order.courier ? ` · ${order.courier}` : ""}
                    {order.trackingNumber
                      ? ` · ${order.trackingNumber}`
                      : " · 송장 대기"}
                  </p>
                </div>
                <div className="order-card-actions">
                  {order.trackingNumber ? (
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(order.trackingNumber);
                      }}
                    >
                      송장 복사
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" type="button" disabled>
                      준비 중
                    </Button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default MyShipping;
