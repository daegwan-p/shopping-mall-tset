import { useEffect, useState } from "react";
import { Button, Field, Input } from "../../components/ui";
import { getRewards, redeemCoupon } from "../../api/rewards";
import { formatPrice } from "../../utils/productDisplay";

function MyRewards() {
  const [code, setCode] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [pointBalance, setPointBalance] = useState(0);
  const [pointHistory, setPointHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getRewards();
      setCoupons(data.coupons || []);
      setPointBalance(data.pointBalance || 0);
      setPointHistory(data.pointHistory || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRedeem = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await redeemCoupon(code.trim());
      setCode("");
      setMessage("쿠폰이 등록되었습니다.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h1>쿠폰·적립금</h1>
      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="muted-note">{message}</p> : null}
      {loading ? <p className="products-empty">불러오는 중...</p> : null}

      {!loading ? (
        <div className="rewards-layout">
          <div className="coupon-list">
            {coupons.length === 0 ? (
              <p className="products-empty">보유 쿠폰이 없습니다.</p>
            ) : (
              coupons.map((coupon) => (
                <article key={coupon._id} className="coupon-card">
                  <div>
                    <h3>{coupon.title}</h3>
                    <p>
                      {coupon.minOrderAmount > 0
                        ? `${formatPrice(coupon.minOrderAmount)} 이상`
                        : "최소 금액 없음"}
                      {coupon.category ? ` · ${coupon.category}` : " · 전 브랜드"}
                    </p>
                    <p className={coupon.urgent ? "urgent-text" : "muted-note"}>
                      {coupon.expiresAt
                        ? `${new Date(coupon.expiresAt).toLocaleDateString("ko-KR")}까지${
                            coupon.daysLeft != null
                              ? ` (${coupon.daysLeft}일 남음)`
                              : ""
                          }`
                        : "기간 제한 없음"}
                    </p>
                  </div>
                  <strong>{coupon.displayValue}</strong>
                </article>
              ))
            )}
          </div>
          <aside>
            <div className="points-box">
              <p>보유 적립금</p>
              <strong>{formatPrice(pointBalance)}</strong>
              <p className="muted-note">리뷰 작성 시 2,000원 적립</p>
            </div>
            <div className="checkout-card">
              <h3>적립금 내역</h3>
              {pointHistory.length === 0 ? (
                <p className="muted-note">내역이 없습니다.</p>
              ) : (
                <ul className="points-history">
                  {pointHistory.map((item) => (
                    <li key={item._id}>
                      <span>{item.label}</span>
                      <strong className={item.amount < 0 ? "urgent-text" : ""}>
                        {item.amount > 0 ? "+" : ""}
                        {formatPrice(Math.abs(item.amount))}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="checkout-card">
              <Field label="쿠폰 코드 등록">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="쿠폰 코드"
                />
              </Field>
              <Button block disabled={saving || !code.trim()} onClick={handleRedeem}>
                {saving ? "등록 중..." : "등록"}
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

export default MyRewards;
