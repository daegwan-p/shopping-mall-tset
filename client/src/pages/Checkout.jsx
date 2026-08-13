import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Radio,
  Stepper,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { FREE_SHIPPING_THRESHOLD, useCart } from "../context/CartContext";
import { createOrder, confirmPayment, cancelOrder } from "../api/orders";
import { getRewards } from "../api/rewards";
import { formatPrice } from "../utils/productDisplay";
import { requestPortonePay } from "../utils/portone";

const memoOptions = [
  "문 앞에 두세요",
  "경비실에 맡겨주세요",
  "부재 시 전화",
  "직접 입력",
];

function calcLocalCouponDiscount(coupon, itemsTotal) {
  if (!coupon || itemsTotal <= 0) return 0;
  if (Number(coupon.minOrderAmount || 0) > itemsTotal) return 0;
  if (coupon.type === "percent") {
    return Math.min(
      itemsTotal,
      Math.round((itemsTotal * Number(coupon.value)) / 100)
    );
  }
  return Math.min(itemsTotal, Number(coupon.value) || 0);
}

function Checkout() {
  const navigate = useNavigate();
  const { user, isLoggedIn, updateUser } = useAuth();
  const { selectedItems, productAmount, refreshCart } = useCart();
  const goingToComplete = useRef(false);

  const shippingMethod = "standard";

  const [addressMode, setAddressMode] = useState("default");
  const [recipient, setRecipient] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [memo, setMemo] = useState(memoOptions[0]);
  const [customMemo, setCustomMemo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [agreePay, setAgreePay] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [pointBalance, setPointBalance] = useState(user?.pointBalance || 0);
  const [selectedCouponId, setSelectedCouponId] = useState(
    () => sessionStorage.getItem("odeum_checkout_coupon_id") || ""
  );
  const [pointsInput, setPointsInput] = useState("");

  useEffect(() => {
    if (!isLoggedIn) return;
    getRewards()
      .then((data) => {
        setCoupons(data.coupons || []);
        setPointBalance(data.pointBalance || 0);
      })
      .catch(() => {});
  }, [isLoggedIn]);

  useEffect(() => {
    if (!user) return;
    setRecipient((prev) => prev || user.name || "");
    const defaults = (user.addresses || []).filter(Boolean);
    const preferred =
      defaults.find((a) => a.isDefault) || defaults[0] || null;
    if (preferred) {
      setRecipient(preferred.recipient || user.name || "");
      setPhone(preferred.phone || user.phone || "");
      setZipCode(preferred.zipCode || "");
      setAddress(preferred.address || "");
      setDetailAddress(preferred.detailAddress || "");
    } else if (user.phone) {
      setPhone((prev) => prev || user.phone);
    }
  }, [user]);

  useEffect(() => {
    if (selectedCouponId) {
      sessionStorage.setItem("odeum_checkout_coupon_id", selectedCouponId);
    } else {
      sessionStorage.removeItem("odeum_checkout_coupon_id");
    }
  }, [selectedCouponId]);

  const shippingFee = useMemo(() => {
    if (productAmount >= FREE_SHIPPING_THRESHOLD) return 0;
    return productAmount > 0 ? 3000 : 0;
  }, [productAmount]);

  const selectedCoupon = useMemo(
    () => coupons.find((c) => c._id === selectedCouponId) || null,
    [coupons, selectedCouponId]
  );

  const couponDiscount = useMemo(
    () => calcLocalCouponDiscount(selectedCoupon, productAmount),
    [selectedCoupon, productAmount]
  );

  const maxPoints = useMemo(() => {
    const payable = Math.max(0, productAmount - couponDiscount + shippingFee);
    return Math.min(pointBalance, payable);
  }, [productAmount, couponDiscount, shippingFee, pointBalance]);

  const pointsUsed = useMemo(() => {
    const want = Math.max(0, Math.floor(Number(pointsInput) || 0));
    return Math.min(want, maxPoints);
  }, [pointsInput, maxPoints]);

  const payAmount = Math.max(
    0,
    productAmount - couponDiscount - pointsUsed + shippingFee
  );
  const addressReady =
    recipient.trim() &&
    phone.trim() &&
    zipCode.trim() &&
    address.trim();
  const canPay =
    agreePay &&
    agreePrivacy &&
    selectedItems.length > 0 &&
    !saving &&
    Boolean(addressReady);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: "/checkout" }} />;
  }

  if (selectedItems.length === 0 && !goingToComplete.current && !saving) {
    return <Navigate to="/cart" replace />;
  }

  const goToOrderComplete = async (order) => {
    goingToComplete.current = true;
    if (pointsUsed > 0 && user) {
      updateUser({
        ...user,
        pointBalance: Math.max(0, pointBalance - pointsUsed),
      });
    }
    navigate(`/order-complete/${order._id}`, { state: { order } });
    await refreshCart();
  };

  const handleSubmit = async () => {
    if (!canPay) return;
    if (!addressReady) {
      setError("받는 분, 연락처, 우편번호, 주소를 입력해 주세요.");
      return;
    }
    if (selectedCoupon && Number(selectedCoupon.minOrderAmount || 0) > productAmount) {
      setError(
        `이 쿠폰은 ${formatPrice(selectedCoupon.minOrderAmount)} 이상 주문에 사용할 수 있습니다.`
      );
      return;
    }
    setSaving(true);
    setError("");
    let createdOrder = null;
    let paymentWindowFinished = false;
    try {
      const deliveryMemo =
        memo === "직접 입력" ? customMemo.trim() : memo;
      const isDeposit = paymentMethod === "deposit";

      const data = await createOrder({
        customerName: recipient.trim() || user.name,
        customerPhone: phone.trim(),
        paymentMethod,
        shippingMethod,
        shippingFee,
        userCouponId: selectedCouponId || undefined,
        pointsUsed,
        items: selectedItems.map((item) => ({
          product: item.productId,
          variant: item.variantId || undefined,
          brandName: item.brandName || "ODEUM",
          productName: item.productName,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        })),
        shippingAddress: {
          recipient: recipient.trim() || user.name,
          phone: phone.trim(),
          zipCode: zipCode.trim(),
          address: address.trim(),
          detailAddress: detailAddress.trim(),
          memo: deliveryMemo,
        },
      });

      createdOrder = data.order;

      if (isDeposit) {
        await goToOrderComplete(createdOrder);
        return;
      }

      // 0원(쿠폰/포인트 전액): PG 생략
      if (Number(createdOrder.totalAmount) === 0) {
        const confirmed = await confirmPayment({
          orderId: createdOrder._id,
          paymentId: `FREE-${createdOrder.orderNumber}`,
          merchantUid: createdOrder.pgMerchantUid || createdOrder.orderNumber,
        });
        await goToOrderComplete(confirmed.order);
        return;
      }

      const payResult = await requestPortonePay({
        merchantUid: createdOrder.pgMerchantUid || createdOrder.orderNumber,
        amount: createdOrder.totalAmount,
        name: `ODEUM ${createdOrder.orderNumber}`,
        buyerName: recipient.trim() || user.name,
        buyerTel: phone.trim(),
        buyerEmail: user.email || "",
        payMethod: "card",
      });
      paymentWindowFinished = true;

      const confirmed = await confirmPayment({
        orderId: createdOrder._id,
        paymentId: payResult.paymentId,
        merchantUid: createdOrder.pgMerchantUid || createdOrder.orderNumber,
      });

      await goToOrderComplete(confirmed.order);
    } catch (err) {
      goingToComplete.current = false;

      if (createdOrder?._id) {
        if (!paymentWindowFinished) {
          try {
            await cancelOrder(createdOrder._id);
          } catch {
            // ignore
          }
        }
        navigate("/order-failed", {
          replace: true,
          state: {
            message: err.message,
            orderNumber: createdOrder.orderNumber,
            keptPending: paymentWindowFinished,
          },
        });
        return;
      }

      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="checkout-flow">
      <div className="checkout-flow-inner">
        <div className="checkout-secure-head">
          <Link to="/" className="brand-logo">
            ODEUM
          </Link>
          <span>Secure Payment · SSL Protection</span>
        </div>
        <Stepper active="checkout" />

        <div className="checkout-layout">
          <section className="checkout-main">
            <div className="checkout-card">
              <div className="checkout-card-head">
                <h2>배송지</h2>
                <Button variant="text" type="button">
                  배송지 목록
                </Button>
              </div>
              <div className="chip-tabs">
                <button
                  type="button"
                  className={addressMode === "default" ? "is-active" : ""}
                  onClick={() => setAddressMode("default")}
                >
                  기본 배송지
                </button>
                <button
                  type="button"
                  className={addressMode === "new" ? "is-active" : ""}
                  onClick={() => setAddressMode("new")}
                >
                  신규 입력
                </button>
              </div>
              <div className="form-grid-2">
                <Field label="이름">
                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </Field>
                <Field label="연락처">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-0000-0000"
                  />
                </Field>
              </div>
              <div className="zip-row">
                <Field label="우편번호">
                  <Input
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                  />
                </Field>
                <Button variant="secondary" type="button">
                  주소 검색
                </Button>
              </div>
              <Field label="주소">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>
              <Field label="상세 주소">
                <Input
                  value={detailAddress}
                  onChange={(e) => setDetailAddress(e.target.value)}
                />
              </Field>
              <p className="ui-label">배송 메모</p>
              <div className="chip-tabs wrap">
                {memoOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={memo === item ? "is-active" : ""}
                    onClick={() => setMemo(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {memo === "직접 입력" ? (
                <Field label="직접 입력">
                  <Input
                    value={customMemo}
                    onChange={(e) => setCustomMemo(e.target.value)}
                  />
                </Field>
              ) : null}
            </div>

            <div className="checkout-card">
              <h2>배송 방법</h2>
              <div className="ship-options">
                <label className="ship-option">
                  <Radio
                    name="shippingMethod"
                    checked
                    onChange={() => {}}
                    label="일반 배송 · 2–3일 · 10만원 이상 무료"
                  />
                  <strong>
                    {productAmount >= FREE_SHIPPING_THRESHOLD
                      ? "무료"
                      : "3,000원"}
                  </strong>
                </label>
              </div>
            </div>

            <div className="checkout-card">
              <h2>결제 수단</h2>
              <div className="chip-tabs">
                {[
                  ["card", "카드"],
                  ["deposit", "무통장"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={paymentMethod === value ? "is-active" : ""}
                    onClick={() => setPaymentMethod(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="muted-note">
                카드사 선택 후 3/6개월 무이자 할부가 가능할 수 있습니다.
              </p>
            </div>

            <div className="checkout-card">
              <h2>주문 상품 {selectedItems.length}건</h2>
              <ul className="checkout-items">
                {selectedItems.map((item) => (
                  <li key={item.key}>
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

            <div className="checkout-card">
              <h2>쿠폰 · 적립금</h2>
              <Field label="보유 쿠폰">
                <select
                  className="ui-select"
                  value={selectedCouponId}
                  onChange={(e) => setSelectedCouponId(e.target.value)}
                >
                  <option value="">쿠폰 선택 안 함</option>
                  {coupons.map((coupon) => (
                    <option
                      key={coupon._id}
                      value={coupon._id}
                      disabled={
                        Number(coupon.minOrderAmount || 0) > productAmount
                      }
                    >
                      {coupon.title} ({coupon.displayValue}
                      {coupon.type === "percent" ? "" : "원"})
                      {Number(coupon.minOrderAmount || 0) > productAmount
                        ? " · 최소금액 미달"
                        : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {coupons.length === 0 ? (
                <p className="muted-note">사용 가능한 쿠폰이 없습니다.</p>
              ) : null}
              <Field label={`적립금 사용 (보유 ${formatPrice(pointBalance)})`}>
                <div className="zip-row">
                  <Input
                    type="number"
                    min="0"
                    max={maxPoints}
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    placeholder="0"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setPointsInput(String(maxPoints))}
                  >
                    전액
                  </Button>
                </div>
              </Field>
              <p className="muted-note">
                최대 {formatPrice(maxPoints)}까지 사용 가능합니다.
              </p>
            </div>
          </section>

          <aside className="cart-summary">
            <h2>결제 금액</h2>
            <dl className="summary-dl">
              <div>
                <dt>상품 금액</dt>
                <dd>{formatPrice(productAmount)}</dd>
              </div>
              <div>
                <dt>쿠폰 할인</dt>
                <dd>-{formatPrice(couponDiscount)}</dd>
              </div>
              <div>
                <dt>적립금</dt>
                <dd>-{formatPrice(pointsUsed)}</dd>
              </div>
              <div>
                <dt>배송비</dt>
                <dd>{shippingFee === 0 ? "무료" : formatPrice(shippingFee)}</dd>
              </div>
            </dl>
            <div className="summary-total">
              <span>최종 결제</span>
              <strong>{formatPrice(payAmount)}</strong>
            </div>
            <div className="agree-list">
              <Checkbox
                label="주문 내용을 확인했으며 결제에 동의합니다 (필수)"
                checked={agreePay}
                onChange={(e) => setAgreePay(e.target.checked)}
              />
              <Checkbox
                label="개인정보 제3자 제공에 동의합니다 (필수)"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
              />
            </div>
            {error ? <p className="auth-error">{error}</p> : null}
            <Button block disabled={!canPay} onClick={handleSubmit}>
              {saving ? "처리 중..." : `${formatPrice(payAmount)} 결제하기`}
            </Button>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default Checkout;
