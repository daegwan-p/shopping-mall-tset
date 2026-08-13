import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  cancelOrder,
  cleanupTestOrders,
  deleteOrder,
  getOrders,
  updateOrder,
} from "../../api/orders";
import Pagination from "../../components/Pagination";
import { ORDER_STATUS_LABEL, orderStatusLabel } from "../../utils/orderStatus";

const statusTabs = [
  { label: "전체", value: "" },
  { label: "결제대기", value: "pending_payment" },
  { label: "입금대기", value: "pending_deposit" },
  { label: "결제완료", value: "paid" },
  { label: "배송준비", value: "preparing" },
  { label: "배송중", value: "shipping" },
  { label: "배송완료", value: "delivered" },
  { label: "취소요청", value: "cancel_requested" },
  { label: "취소완료", value: "cancelled" },
];

const PAGE_SIZE = 10;

function nextActions(status) {
  switch (status) {
    case "pending_deposit":
      return [{ type: "status", status: "paid", label: "입금확인" }];
    case "paid":
      return [{ type: "status", status: "preparing", label: "배송준비" }];
    case "preparing":
      return [{ type: "ship", label: "송장·배송중" }];
    case "shipping":
      return [{ type: "status", status: "delivered", label: "배송완료" }];
    case "cancel_requested":
      return [{ type: "cancel", label: "취소확정" }];
    case "cancelled":
    case "pending_payment":
      return [{ type: "delete", label: "삭제" }];
    default:
      return [];
  }
}

function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") || "");
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [busyId, setBusyId] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [applied, setApplied] = useState({
    orderNumber: "",
    customerName: "",
    customerPhone: "",
  });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: PAGE_SIZE, manage: 1 };
      if (tab) params.status = tab;
      if (applied.orderNumber) params.orderNumber = applied.orderNumber;
      if (applied.customerName) params.customerName = applied.customerName;
      if (applied.customerPhone) params.customerPhone = applied.customerPhone;

      const data = await getOrders(params);
      setOrders(data.orders || []);
      setPagination(
        data.pagination || {
          page: 1,
          limit: PAGE_SIZE,
          total: data.orders?.length || 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, tab, applied]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied({
      orderNumber: orderNumber.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
    });
  };

  const handleTab = (value) => {
    setTab(value);
    setPage(1);
    if (value) setSearchParams({ tab: value });
    else setSearchParams({});
  };

  const runAction = async (order, action) => {
    setBusyId(order._id);
    setError("");
    setMessage("");
    try {
      if (action.type === "status") {
        await updateOrder(order._id, { status: action.status });
        setMessage(`${order.orderNumber} → ${ORDER_STATUS_LABEL[action.status]}`);
      } else if (action.type === "ship") {
        const courier = window.prompt("택배사", order.courier || "CJ대한통운");
        if (courier == null) return;
        const trackingNumber = window.prompt(
          "송장번호",
          order.trackingNumber || ""
        );
        if (!trackingNumber?.trim()) {
          setError("송장번호가 필요합니다.");
          return;
        }
        await updateOrder(order._id, {
          status: "shipping",
          courier: courier.trim(),
          trackingNumber: trackingNumber.trim(),
        });
        setMessage(`${order.orderNumber} 배송중 처리됨`);
      } else if (action.type === "cancel") {
        if (!window.confirm(`${order.orderNumber} 취소를 확정할까요?`)) return;
        await cancelOrder(order._id);
        setMessage(`${order.orderNumber} 취소 확정`);
      } else if (action.type === "delete") {
        if (!window.confirm(`${order.orderNumber}을(를) 삭제할까요?`)) return;
        await deleteOrder(order._id);
        setMessage(`${order.orderNumber} 삭제됨`);
      }
      await loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  };

  const handleCleanup = async () => {
    if (
      !window.confirm(
        "취소완료·결제대기(미결제) 테스트 주문을 모두 삭제할까요?"
      )
    ) {
      return;
    }
    setCleaning(true);
    setError("");
    setMessage("");
    try {
      const data = await cleanupTestOrders([
        "cancelled",
        "pending_payment",
      ]);
      setMessage(data.message || `${data.deletedCount || 0}건 삭제`);
      setPage(1);
      await loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="admin-page-inner">
      <div className="admin-page-head">
        <div>
          <h1>주문 관리</h1>
          <p className="admin-sub">
            전체(활성) {pagination.total}건 · {pagination.page}/
            {pagination.totalPages} 페이지
            {!tab ? " · 취소완료·결제대기는 탭에서 확인" : ""}
          </p>
        </div>
        <div className="admin-head-actions">
          <button
            type="button"
            className="admin-btn-outline"
            disabled={cleaning}
            onClick={handleCleanup}
          >
            {cleaning ? "정리 중..." : "테스트 주문 정리"}
          </button>
        </div>
      </div>

      <form className="admin-filters admin-card" onSubmit={handleSearch}>
        <label>
          주문번호
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="OD-00000"
          />
        </label>
        <label>
          이름
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="주문자명"
          />
        </label>
        <label>
          연락처
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="010-0000-0000"
          />
        </label>
        <button type="submit" className="admin-btn-dark">
          검색
        </button>
      </form>

      <div className="admin-tabs">
        {statusTabs.map((item) => (
          <button
            key={item.label}
            type="button"
            className={tab === item.value ? "is-active" : ""}
            onClick={() => handleTab(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {message ? <p className="admin-form-success">{message}</p> : null}
      {error ? <p className="admin-form-error">{error}</p> : null}

      <div className="admin-card table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>주문번호</th>
              <th>상품 / 주문자</th>
              <th>브랜드</th>
              <th>수량</th>
              <th>금액</th>
              <th>결제</th>
              <th>상태</th>
              <th>처리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="admin-empty-cell">
                  불러오는 중...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-empty-cell">
                  {tab
                    ? `${ORDER_STATUS_LABEL[tab] || tab} 상태의 주문이 없습니다.`
                    : "표시할 활성 주문이 없습니다."}
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const firstItem = order.items?.[0];
                const qty = (order.items || []).reduce(
                  (sum, item) => sum + Number(item.quantity || 0),
                  0
                );
                const more =
                  (order.items?.length || 0) > 1
                    ? ` 외 ${order.items.length - 1}건`
                    : "";
                const actions = nextActions(order.status);
                const canCancel =
                  order.status !== "cancelled" &&
                  order.status !== "delivered";

                return (
                  <tr key={order._id}>
                    <td>{order.orderNumber}</td>
                    <td>
                      <strong>
                        {firstItem?.productName || "-"}
                        {more}
                      </strong>
                      <p className="table-sub">{order.customerName}</p>
                    </td>
                    <td>{firstItem?.brandName || "-"}</td>
                    <td>{qty}</td>
                    <td>
                      {Number(order.totalAmount || 0).toLocaleString("ko-KR")}원
                    </td>
                    <td>{order.paymentMethod || "-"}</td>
                    <td>
                      <Link
                        to={`/admin/orders/${order._id}`}
                        className="status-pill muted"
                        style={{ textDecoration: "none" }}
                      >
                        {orderStatusLabel(order.status)}
                      </Link>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <Link
                          to={`/admin/orders/${order._id}`}
                          className="admin-btn-outline"
                        >
                          상세
                        </Link>
                        {actions.map((action) => (
                          <button
                            key={action.label}
                            type="button"
                            className="admin-btn-outline"
                            disabled={busyId === order._id}
                            onClick={() => runAction(order, action)}
                          >
                            {busyId === order._id ? "..." : action.label}
                          </button>
                        ))}
                        {canCancel &&
                        !actions.some((a) => a.type === "cancel") ? (
                          <button
                            type="button"
                            className="admin-btn-outline"
                            disabled={busyId === order._id}
                            onClick={() =>
                              runAction(order, {
                                type: "cancel",
                                label: "주문 취소",
                              })
                            }
                          >
                            주문 취소
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <Pagination
          className="admin-pagination"
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={setPage}
        />
      </div>
    </div>
  );
}

export default AdminOrders;
