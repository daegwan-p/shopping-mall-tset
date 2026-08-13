import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminStats } from "../../api/admin";
import { orderStatusLabel } from "../../utils/orderStatus";
import { formatPrice } from "../../utils/productDisplay";

function AdminDashboard() {
  const [range, setRange] = useState("today");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAdminStats()
      .then((data) => setStats(data.stats))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const maxWeek = Math.max(
    1,
    ...(stats?.weekSeries || []).map((d) => d.amount)
  );

  const kpis = [
    {
      label: "오늘 매출",
      value: formatPrice(stats?.todayRevenue || 0),
      delta: `결제완료 ${stats?.todayOrderCount || 0}건`,
    },
    {
      label: "오늘 주문",
      value: `${stats?.todayOrderCount || 0}건`,
      delta: "결제 완료 기준",
    },
    {
      label: "처리 대기",
      value: `${(stats?.pendingPaymentCount || 0) + (stats?.pendingDepositCount || 0)}건`,
      delta: `입금대기 ${stats?.pendingDepositCount || 0} · 취소요청 ${stats?.cancelRequestedCount || 0}`,
    },
    {
      label: "재고 부족",
      value: `${stats?.lowStockCount || 0}개`,
      delta: "옵션 재고 5 이하",
    },
  ];

  return (
    <div className="admin-page-inner">
      <div className="admin-page-head">
        <div>
          <h1>대시보드</h1>
          <p className="admin-sub">운영 현황을 한눈에 확인합니다.</p>
        </div>
        <div className="admin-range">
          <button
            type="button"
            className={range === "today" ? "is-active" : ""}
            onClick={() => setRange("today")}
          >
            오늘
          </button>
          <button
            type="button"
            className={range === "7d" ? "is-active" : ""}
            onClick={() => setRange("7d")}
          >
            7일
          </button>
        </div>
      </div>

      {error ? <p className="admin-form-error">{error}</p> : null}
      {loading ? <p className="admin-sub">불러오는 중...</p> : null}

      <div className="admin-kpi-grid">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="admin-card">
            <p className="admin-card-label">{kpi.label}</p>
            <p className="admin-card-value">{kpi.value}</p>
            <p className="admin-card-delta">{kpi.delta}</p>
          </article>
        ))}
      </div>

      <div className="admin-split">
        <article className="admin-card">
          <div className="admin-card-head">
            <h2>최근 7일 매출</h2>
          </div>
          <div className="admin-bars">
            {(stats?.weekSeries || []).map((day) => (
              <div key={day.date} className="admin-bar-col">
                <div
                  className={`admin-bar${day.amount ? "" : " is-empty"}`}
                  style={{
                    height: `${Math.max(8, (day.amount / maxWeek) * 120)}px`,
                  }}
                  title={formatPrice(day.amount)}
                />
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <h2>최근 주문</h2>
            <Link to="/admin/orders">전체 보기</Link>
          </div>
          {(stats?.recentOrders || []).length === 0 ? (
            <div className="admin-empty-block">최근 주문이 없습니다.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>주문</th>
                  <th>고객</th>
                  <th>상태</th>
                  <th>금액</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <Link to={`/admin/orders/${order._id}`}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>{order.customerName}</td>
                    <td>{orderStatusLabel(order.status)}</td>
                    <td>{formatPrice(order.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </div>

      <div className="admin-split admin-split-bottom">
        <article className="admin-card">
          <div className="admin-card-head">
            <h2>재고 부족</h2>
            <Link to="/admin/inventory">재고 관리</Link>
          </div>
          {(stats?.lowStock || []).length === 0 ? (
            <div className="admin-empty-block">재고 부족 상품이 없습니다.</div>
          ) : (
            <ul className="admin-todo">
              {stats.lowStock.map((item) => (
                <li key={item.id}>
                  <strong>{item.productName}</strong>
                  <span>
                    {item.color}/{item.size} · 재고 {item.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <div className="admin-side-stack">
          <article className="admin-card">
            <div className="admin-card-head">
              <h2>바로가기</h2>
            </div>
            <ul className="admin-todo">
              <li>
                <Link to="/admin/orders?tab=cancel_requested">취소요청 처리</Link>
              </li>
              <li>
                <Link to="/admin/orders?tab=paid">결제완료 → 배송준비</Link>
              </li>
              <li>
                <Link to="/admin/settlement">브랜드 정산</Link>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
