import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminInventory } from "../../api/admin";

function AdminInventory() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getAdminInventory({ q: appliedQ })
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [appliedQ]);

  return (
    <div className="admin-page-inner">
      <div className="admin-page-head">
        <div>
          <h1>재고</h1>
          <p className="admin-sub">옵션(SKU)별 재고 · {items.length}건</p>
        </div>
        <Link to="/admin/products" className="admin-btn-dark">
          상품에서 수정
        </Link>
      </div>

      <form
        className="admin-filters admin-card"
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedQ(q.trim());
        }}
      >
        <label>
          검색
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SKU, 색상, 사이즈"
          />
        </label>
        <button type="submit" className="admin-btn-dark">
          검색
        </button>
      </form>

      {error ? <p className="admin-form-error">{error}</p> : null}

      <div className="admin-card table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>상품</th>
              <th>옵션 SKU</th>
              <th>색상</th>
              <th>사이즈</th>
              <th>재고</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="admin-empty-cell">
                  불러오는 중...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty-cell">
                  재고 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.productName}</strong>
                    <p className="table-sub">{item.productSku}</p>
                  </td>
                  <td>{item.sku}</td>
                  <td>{item.color}</td>
                  <td>{item.size}</td>
                  <td>
                    <span
                      className={
                        item.stock <= 5 ? "status-pill muted" : undefined
                      }
                      style={
                        item.stock <= 5
                          ? { color: "var(--point)", borderColor: "var(--point)" }
                          : undefined
                      }
                    >
                      {item.stock}
                    </span>
                  </td>
                  <td>
                    {item.productId ? (
                      <Link
                        to={`/admin/products/${item.productId}/edit`}
                        className="admin-btn-outline"
                      >
                        수정
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminInventory;
