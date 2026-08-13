import { useEffect, useState } from "react";
import { getAdminSettlement } from "../../api/admin";
import { formatPrice } from "../../utils/productDisplay";

function AdminSettlement() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminSettlement()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-page-inner">
      <div className="admin-page-head">
        <div>
          <h1>정산</h1>
          <p className="admin-sub">
            결제완료 이후 주문 기준 · 수수료{" "}
            {Math.round((data?.commissionRate || 0.22) * 100)}% 가정
          </p>
        </div>
      </div>

      {error ? <p className="admin-form-error">{error}</p> : null}
      {loading ? <p className="admin-sub">불러오는 중...</p> : null}

      {data ? (
        <>
          <div className="admin-kpi-grid">
            <article className="admin-card">
              <p className="admin-card-label">총 매출</p>
              <p className="admin-card-value">
                {formatPrice(data.totals?.sales || 0)}
              </p>
            </article>
            <article className="admin-card">
              <p className="admin-card-label">수수료</p>
              <p className="admin-card-value">
                {formatPrice(data.totals?.commission || 0)}
              </p>
            </article>
            <article className="admin-card">
              <p className="admin-card-label">정산 예정</p>
              <p className="admin-card-value">
                {formatPrice(data.totals?.settlement || 0)}
              </p>
            </article>
          </div>

          <div className="admin-card table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>브랜드</th>
                  <th>주문 수</th>
                  <th>수량</th>
                  <th>매출</th>
                  <th>수수료</th>
                  <th>정산금</th>
                </tr>
              </thead>
              <tbody>
                {(data.rows || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-empty-cell">
                      정산할 매출이 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row) => (
                    <tr key={row.brand}>
                      <td>{row.brand}</td>
                      <td>{row.orderCount}</td>
                      <td>{row.qty}</td>
                      <td>{formatPrice(row.sales)}</td>
                      <td>{formatPrice(row.commission)}</td>
                      <td>
                        <strong>{formatPrice(row.settlement)}</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default AdminSettlement;
