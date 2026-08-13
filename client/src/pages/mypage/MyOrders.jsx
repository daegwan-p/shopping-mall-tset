import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button } from "../../components/ui";
import { cancelOrder, getOrders } from "../../api/orders";
import {
  ORDER_STATUS_LABEL,
  ORDER_TIMELINE,
  orderStatusLabel,
  orderTimelineIndex,
} from "../../utils/orderStatus";
import { formatPrice } from "../../utils/productDisplay";

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("6m");
  const [cancellingId, setCancellingId] = useState("");

  const loadOrders = () => {
    setLoading(true);
    setError("");
    getOrders({ page: 1, limit: 50, range })
      .then((data) => setOrders(data.orders || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, [range]);

  const handleRange = (value) => {
    setRange(value);
  };

  const handleCancel = async (orderId) => {
    if (
      !window.confirm(
        "주문 취소를 요청할까요? 관리자가 확인한 뒤에 주문 내역에서 사라집니다."
      )
    ) {
      return;
    }
    setCancellingId(orderId);
    setError("");
    try {
      const data = await cancelOrder(orderId);
      setOrders((prev) =>
        prev.map((order) => (order._id === orderId ? data.order : order))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId("");
    }
  };

  return (
    <section>
      <div className="mypage-content-head">
        <h1>주문 내역</h1>
        <div className="chip-tabs">
          {[
            ["3m", "3개월"],
            ["6m", "6개월"],
            ["1y", "1년"],
            ["all", "전체"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={range === value ? "is-active" : ""}
              onClick={() => handleRange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}
      {loading ? <p className="products-empty">불러오는 중...</p> : null}
      {!loading && orders.length === 0 ? (
        <p className="products-empty">주문 내역이 없습니다.</p>
      ) : null}

      <div className="order-card-list">
        {orders.map((order) => {
          const first = order.items?.[0];
          const activeIdx = orderTimelineIndex(order.status);
          const isCancelRequested = order.status === "cancel_requested";

          return (
            <article key={order._id} className="order-card">
              <div className="order-card-head">
                <div>
                  <strong>
                    {new Date(order.createdAt).toLocaleDateString("ko-KR")}
                  </strong>
                  <span> · {order.orderNumber}</span>
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
                    {first?.color} / {first?.size} · {first?.quantity}개 ·{" "}
                    {formatPrice(order.totalAmount)}
                  </p>
                  {isCancelRequested ? (
                    <Badge tone="danger">
                      {orderStatusLabel(order.status)}
                    </Badge>
                  ) : null}
                </div>
                <div className="order-card-actions">
                  {order.status === "delivered" ? (
                    <>
                      <Link to="/mypage/reviews">
                        <Button size="sm">리뷰 쓰기</Button>
                      </Link>
                      <Button size="sm" variant="secondary">
                        교환/반품
                      </Button>
                    </>
                  ) : isCancelRequested ? (
                    <Button size="sm" variant="secondary" disabled>
                      취소 검토 중
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" type="button">
                        배송 조회
                      </Button>
                      {["pending_deposit", "paid", "preparing"].includes(
                        String(order.status || "")
                      ) ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          type="button"
                          disabled={cancellingId === order._id}
                          onClick={() => handleCancel(order._id)}
                        >
                          {cancellingId === order._id
                            ? "요청 중..."
                            : "주문 취소"}
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              {!isCancelRequested ? (
                <div className="order-timeline">
                  {ORDER_TIMELINE.map((step, index) => (
                    <div
                      key={step}
                      className={`order-timeline-step${
                        index <= activeIdx ? " is-done" : ""
                      }`}
                    >
                      <span className="dot" />
                      <span>{ORDER_STATUS_LABEL[step]}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default MyOrders;
