import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui";
import { cancelOrder, getOrder } from "../../api/orders";
import { formatPrice } from "../../utils/productDisplay";

const CANCELLABLE = new Set([
  "pending_deposit",
  "paid",
  "preparing",
]);

function MyOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    getOrder(id)
      .then((data) => {
        if (data.order?.status === "cancelled") {
          navigate("/mypage/orders", { replace: true });
          return;
        }
        setOrder(data.order);
      })
      .catch((err) => setError(err.message));
  }, [id, navigate]);

  const handleCancel = async () => {
    if (
      !window.confirm(
        "주문 취소를 요청할까요? 관리자가 확인한 뒤에 주문 내역에서 사라집니다."
      )
    ) {
      return;
    }
    setCancelling(true);
    setError("");
    setMessage("");
    try {
      const data = await cancelOrder(id);
      setOrder(data.order);
      setMessage(
        data.message ||
          "취소가 요청되었습니다. 관리자 확인 후 처리됩니다."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (error && !order) return <p className="auth-error">{error}</p>;
  if (!order) return <p className="products-empty">불러오는 중...</p>;

  const addr = order.shippingAddress || {};
  const canCancel = CANCELLABLE.has(order.status);
  const isCancelRequested = order.status === "cancel_requested";

  return (
    <section>
      <p className="plp-breadcrumb">
        <Link to="/mypage/orders">주문 내역</Link> / 상세
      </p>
      <h1>주문 {order.orderNumber}</h1>
      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="admin-form-success">{message}</p> : null}
      {isCancelRequested ? (
        <p className="muted-note">취소 요청이 접수되었습니다. 관리자 확인 후 처리됩니다.</p>
      ) : null}
      <div className="checkout-card" style={{ marginTop: 18 }}>
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
      </div>
      <div className="complete-split" style={{ marginTop: 18 }}>
        <div className="checkout-card">
          <h3>배송지</h3>
          <p>
            {addr.recipient}
            <br />
            {addr.phone}
            <br />
            {addr.address} {addr.detailAddress}
          </p>
        </div>
        <div className="checkout-card">
          <h3>결제</h3>
          <p>
            {order.paymentMethod || "-"}
            <br />
            {formatPrice(order.totalAmount)}
          </p>
        </div>
      </div>
      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        <Link to="/mypage/orders">
          <Button variant="secondary">목록으로</Button>
        </Link>
        {canCancel ? (
          <Button
            variant="secondary"
            disabled={cancelling}
            onClick={handleCancel}
          >
            {cancelling ? "요청 중..." : "주문 취소 요청"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export default MyOrderDetail;
