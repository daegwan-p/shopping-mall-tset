import { useEffect, useState } from "react";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  getAdminCoupons,
  updateAdminCoupon,
} from "../../api/rewards";
import { formatPrice } from "../../utils/productDisplay";

const emptyForm = {
  code: "",
  title: "",
  description: "",
  type: "amount",
  value: "",
  minOrderAmount: "0",
  category: "",
  expiresAt: "",
  perUserLimit: "1",
  usageLimit: "",
  isActive: true,
};

function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminCoupons();
      setCoupons(data.coupons || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await createAdminCoupon({
        ...form,
        value: Number(form.value),
        minOrderAmount: Number(form.minOrderAmount) || 0,
        perUserLimit: Number(form.perUserLimit) || 1,
        usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
        expiresAt: form.expiresAt || undefined,
      });
      setForm(emptyForm);
      setMessage("쿠폰이 등록되었습니다.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon) => {
    try {
      await updateAdminCoupon(coupon._id, { isActive: !coupon.isActive });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`쿠폰 ${coupon.code}을(를) 삭제할까요?`)) return;
    try {
      await deleteAdminCoupon(coupon._id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page-inner">
      <div className="admin-page-head">
        <div>
          <h1>쿠폰·프로모션</h1>
          <p className="admin-sub">등록 쿠폰 {coupons.length}개</p>
        </div>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="muted-note">{message}</p> : null}

      <form className="admin-card" onSubmit={handleCreate}>
        <h2>쿠폰 등록</h2>
        <div className="admin-filters" style={{ marginBottom: 0, padding: 0, border: "none" }}>
          <label>
            코드
            <input
              value={form.code}
              onChange={(e) => onChange("code", e.target.value)}
              placeholder="SAVE10"
              required
            />
          </label>
          <label>
            제목
            <input
              value={form.title}
              onChange={(e) => onChange("title", e.target.value)}
              required
            />
          </label>
          <label>
            타입
            <select
              value={form.type}
              onChange={(e) => onChange("type", e.target.value)}
            >
              <option value="amount">정액(원)</option>
              <option value="percent">정률(%)</option>
            </select>
          </label>
          <label>
            값
            <input
              type="number"
              min="0"
              value={form.value}
              onChange={(e) => onChange("value", e.target.value)}
              required
            />
          </label>
          <label>
            최소 주문금액
            <input
              type="number"
              min="0"
              value={form.minOrderAmount}
              onChange={(e) => onChange("minOrderAmount", e.target.value)}
            />
          </label>
          <label>
            만료일
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => onChange("expiresAt", e.target.value)}
            />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="submit" className="admin-btn" disabled={saving}>
            {saving ? "등록 중..." : "쿠폰 등록"}
          </button>
        </div>
      </form>

      <div className="admin-card" style={{ marginTop: 16 }}>
        <h2>쿠폰 목록</h2>
        {loading ? <p>불러오는 중...</p> : null}
        {!loading && coupons.length === 0 ? <p>등록된 쿠폰이 없습니다.</p> : null}
        {!loading && coupons.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>코드</th>
                <th>제목</th>
                <th>할인</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon._id}>
                  <td>
                    {coupon.code}
                    {coupon.isSignupReward ? (
                      <span className="table-sub"> 가입쿠폰</span>
                    ) : null}
                  </td>
                  <td>{coupon.title}</td>
                  <td>
                    {coupon.type === "percent"
                      ? `${coupon.value}%`
                      : formatPrice(coupon.value)}
                  </td>
                  <td>{coupon.isActive ? "활성" : "비활성"}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn-outline"
                      onClick={() => toggleActive(coupon)}
                    >
                      {coupon.isActive ? "비활성" : "활성"}
                    </button>{" "}
                    {!coupon.isSignupReward ? (
                      <button
                        type="button"
                        className="admin-btn-outline"
                        onClick={() => handleDelete(coupon)}
                      >
                        삭제
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}

export default AdminCoupons;
