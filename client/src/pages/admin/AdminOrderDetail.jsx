import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Field, Input, Textarea } from "../../components/ui";
import { cancelOrder, getOrder, updateOrder } from "../../api/orders";
import { orderStatusLabel } from "../../utils/orderStatus";
import { formatPrice } from "../../utils/productDisplay";

const statusButtons = [
  { value: "pending_payment", label: "결제대기" },
  { value: "pending_deposit", label: "입금대기" },
  { value: "paid", label: "결제완료" },
  { value: "preparing", label: "배송준비" },
  { value: "shipping", label: "배송중" },
  { value: "delivered", label: "배송완료" },
  { value: "cancel_requested", label: "취소요청" },
  { value: "cancelled", label: "취소완료" },
];

function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [courier, setCourier] = useState("CJ대한통운");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [adminMemo, setAdminMemo] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    getOrder(id)
      .then((data) => {
        setOrder(data.order);
        setCourier(data.order.courier || "CJ대한통운");
        setTrackingNumber(data.order.trackingNumber || "");
        setAdminMemo(data.order.adminMemo || "");
        setStatus(data.order.status);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const settlements = useMemo(() => {
    if (!order) return [];
    const map = {};
    (order.items || []).forEach((item) => {
      const brand = item.brandName || "ODEUM";
      const amount = Number(item.price) * Number(item.quantity || 1);
      if (!map[brand]) map[brand] = 0;
      map[brand] += amount;
    });
    return Object.entries(map).map(([brand, amount]) => ({
      brand,
      amount,
      settlement: Math.round(amount * 0.78),
    }));
  }, [order]);

  const canCancel =
    order && order.status !== "cancelled" && order.status !== "delivered";

  const handleCancel = async () => {
    if (
      !window.confirm(
        "이 주문을 취소 확정할까요? 고객 주문 내역에서 사라집니다."
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
      setStatus(data.order.status);
      setMessage("주문이 취소되었습니다.");
      navigate("/admin/orders");
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await updateOrder(id, {
        status,
        courier,
        trackingNumber,
        adminMemo,
      });
      setOrder(data.order);
      setMessage("변경사항이 저장되었습니다.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const registerTracking = async () => {
    if (!trackingNumber.trim()) {
      setError("송장번호를 입력해 주세요.");
      return;
    }
    setStatus("shipping");
    setSaving(true);
    try {
      const data = await updateOrder(id, {
        status: "shipping",
        courier,
        trackingNumber,
      });
      setOrder(data.order);
      setMessage("송장이 등록되었습니다.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (error && !order) return <p className="admin-form-error">{error}</p>;
  if (!order) return <p className="admin-sub">불러오는 중...</p>;

  const addr = order.shippingAddress || {};

  return (
    <div className="admin-page-inner">
      <div className="admin-page-head">
        <div>
          <p className="admin-breadcrumb">
            <Link to="/admin/orders">주문 관리</Link> / 상세
          </p>
          <h1>
            {order.orderNumber}{" "}
            <span className="status-pill ok">
              {orderStatusLabel(order.status)}
            </span>
          </h1>
        </div>
        <div className="admin-head-actions">
          {canCancel ? (
            <Button
              variant="secondary"
              type="button"
              disabled={cancelling}
              onClick={handleCancel}
            >
              {cancelling ? "취소 중..." : "주문 취소"}
            </Button>
          ) : null}
          <Button variant="secondary" type="button">
            주문서 인쇄
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "변경사항 저장"}
          </Button>
        </div>
      </div>

      {message ? <p className="admin-form-success">{message}</p> : null}
      {error ? <p className="admin-form-error">{error}</p> : null}

      <div className="admin-order-layout">
        <div className="admin-order-main">
          <section className="admin-card">
            <h2>주문 상품 {(order.items || []).length}건</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>상품</th>
                  <th>브랜드</th>
                  <th>수량</th>
                  <th>금액</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, index) => (
                  <tr key={`${item.productName}-${index}`}>
                    <td>
                      <div className="product-cell">
                        <div
                          className="product-list-thumb"
                          style={
                            item.image
                              ? { backgroundImage: `url(${item.image})` }
                              : undefined
                          }
                        />
                        <div>
                          <strong>{item.productName}</strong>
                          <p className="table-sub">
                            {item.color} / {item.size}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>{item.brandName}</td>
                    <td>{item.quantity}</td>
                    <td>{formatPrice(item.price * item.quantity)}</td>
                    <td>
                      <button
                        type="button"
                        className="ui-btn ui-btn-text"
                        style={{ color: "var(--point)" }}
                      >
                        부분 취소
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="admin-card">
            <h2>배송 처리</h2>
            <div className="zip-row">
              <Field label="택배사">
                <Input
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                />
              </Field>
              <Field label="송장번호">
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </Field>
              <Button onClick={registerTracking}>등록</Button>
            </div>
            <div className="chip-tabs wrap" style={{ marginTop: 14 }}>
              {statusButtons.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={status === item.value ? "is-active" : ""}
                  onClick={() => setStatus(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="admin-card">
            <h2>처리 이력</h2>
            <ul className="admin-history">
              {(order.history || []).length === 0 ? (
                <li>이력이 없습니다.</li>
              ) : (
                [...(order.history || [])]
                  .reverse()
                  .map((item, index) => (
                    <li key={`${item.at}-${index}`}>
                      <span>
                        {new Date(item.at).toLocaleString("ko-KR")}
                      </span>
                      <strong>{item.action}</strong>
                      <em>{item.actor}</em>
                    </li>
                  ))
              )}
            </ul>
          </section>

          <section className="admin-card">
            <h2>관리자 메모</h2>
            <Textarea
              value={adminMemo}
              onChange={(e) => setAdminMemo(e.target.value)}
              placeholder="고객에게 보이지 않는 내부 메모"
            />
          </section>
        </div>

        <aside className="admin-order-side">
          <section className="admin-card">
            <h2>주문자</h2>
            <p>{order.customerName}</p>
            <p className="table-sub">{order.customerPhone || "-"}</p>
          </section>
          <section className="admin-card">
            <h2>배송지</h2>
            <p>{addr.recipient}</p>
            <p className="table-sub">{addr.phone}</p>
            <p>
              {addr.address} {addr.detailAddress}
            </p>
            <p className="table-sub">{addr.memo}</p>
          </section>
          <section className="admin-card">
            <h2>결제</h2>
            <dl className="summary-dl">
              <div>
                <dt>상품 금액</dt>
                <dd>
                  {formatPrice(order.totalAmount - (order.shippingFee || 0))}
                </dd>
              </div>
              <div>
                <dt>배송비</dt>
                <dd>
                  {!order.shippingFee ? "무료" : formatPrice(order.shippingFee)}
                </dd>
              </div>
            </dl>
            <div className="summary-total">
              <span>결제 금액</span>
              <strong>{formatPrice(order.totalAmount)}</strong>
            </div>
            <p className="table-sub">{order.paymentMethod || "-"}</p>
          </section>
          <section className="admin-card settlement-card">
            <h2>브랜드 정산</h2>
            {settlements.map((item) => (
              <div key={item.brand} className="settlement-row">
                <span>{item.brand}</span>
                <strong>{formatPrice(item.settlement)}</strong>
              </div>
            ))}
            <p className="table-sub">수수료 22% 가정</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default AdminOrderDetail;
