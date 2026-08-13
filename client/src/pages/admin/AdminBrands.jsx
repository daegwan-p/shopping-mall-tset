import { useEffect, useState } from "react";
import { createBrand, deleteBrand, getBrands } from "../../api/catalog";

function AdminBrands() {
  const [brands, setBrands] = useState([]);
  const [name, setName] = useState("");
  const [commissionRate, setCommissionRate] = useState("22");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadBrands = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getBrands();
      setBrands(data.brands || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await createBrand({
        name: name.trim(),
        commissionRate: Number(commissionRate) || 0,
      });
      setName("");
      setCommissionRate("22");
      setMessage("브랜드가 등록되었습니다.");
      await loadBrands();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("이 브랜드를 삭제할까요?")) return;
    try {
      await deleteBrand(id);
      await loadBrands();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page-inner">
      <div className="admin-page-head">
        <div>
          <h1>브랜드</h1>
          <p className="admin-sub">등록 브랜드 {brands.length}개</p>
        </div>
      </div>

      <form className="admin-card admin-brand-form" onSubmit={handleCreate}>
        <h2>브랜드 등록</h2>
        <div className="admin-filters" style={{ marginBottom: 0, padding: 0, border: "none" }}>
          <label>
            브랜드명
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: HAEN"
              required
            />
          </label>
          <label>
            기본 수수료 (%)
            <input
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="22"
            />
          </label>
          <button type="submit" className="admin-btn-dark" disabled={saving}>
            {saving ? "등록 중..." : "등록"}
          </button>
        </div>
        {error && <p className="admin-form-error">{error}</p>}
        {message && <p className="admin-form-success">{message}</p>}
      </form>

      <div className="admin-card table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>브랜드명</th>
              <th>수수료</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="admin-empty-cell">
                  불러오는 중...
                </td>
              </tr>
            ) : brands.length === 0 ? (
              <tr>
                <td colSpan={4} className="admin-empty-cell">
                  등록된 브랜드가 없습니다.
                </td>
              </tr>
            ) : (
              brands.map((brand) => (
                <tr key={brand._id}>
                  <td>{brand.name}</td>
                  <td>{brand.commissionRate}%</td>
                  <td>{brand.isActive ? "활성" : "비활성"}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn-outline"
                      onClick={() => handleDelete(brand._id)}
                    >
                      삭제
                    </button>
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

export default AdminBrands;
