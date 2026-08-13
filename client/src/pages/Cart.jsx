import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Stepper,
} from "../components/ui";
import {
  FREE_SHIPPING_THRESHOLD,
  useCart,
} from "../context/CartContext";
import { getProducts } from "../api/catalog";
import { getRewards, redeemCoupon } from "../api/rewards";
import { formatPrice, getMainImage, salePrice } from "../utils/productDisplay";

const CART_COUPON_KEY = "odeum_checkout_coupon_id";

function calcCouponDiscount(coupon, itemsTotal) {
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

function Cart() {
  const {
    items,
    selectedCount,
    productAmount,
    updateQuantity,
    toggleSelected,
    setAllSelected,
    removeItem,
    removeSelected,
  } = useCart();

  const [coupon, setCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponSaving, setCouponSaving] = useState(false);
  const [related, setRelated] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [selectedCouponId, setSelectedCouponId] = useState(
    () => sessionStorage.getItem(CART_COUPON_KEY) || ""
  );

  const allSelected =
    items.length > 0 && items.every((item) => item.selected);
  const selectedLen = items.filter((item) => item.selected).length;
  const remainForFree = Math.max(0, FREE_SHIPPING_THRESHOLD - productAmount);
  const shippingLabel =
    remainForFree === 0 && productAmount > 0 ? "무료" : "3,000원";
  const shippingFee =
    productAmount > 0 && remainForFree === 0 ? 0 : productAmount > 0 ? 3000 : 0;

  const selectedCoupon = useMemo(
    () => coupons.find((c) => c._id === selectedCouponId) || null,
    [coupons, selectedCouponId]
  );
  const couponDiscount = useMemo(
    () => calcCouponDiscount(selectedCoupon, productAmount),
    [selectedCoupon, productAmount]
  );
  const payAmount = Math.max(0, productAmount - couponDiscount + shippingFee);

  useEffect(() => {
    getProducts({ page: 1, limit: 4 })
      .then((data) => setRelated(data.products || []))
      .catch(() => setRelated([]));

    getRewards()
      .then((data) => setCoupons(data.coupons || []))
      .catch(() => setCoupons([]));
  }, []);

  useEffect(() => {
    if (selectedCouponId) {
      sessionStorage.setItem(CART_COUPON_KEY, selectedCouponId);
    } else {
      sessionStorage.removeItem(CART_COUPON_KEY);
    }
  }, [selectedCouponId]);

  const handleCoupon = async () => {
    if (!coupon.trim()) {
      setCouponMessage("쿠폰 코드를 입력해 주세요.");
      return;
    }
    setCouponSaving(true);
    setCouponMessage("");
    try {
      const data = await redeemCoupon(coupon.trim());
      setCoupon("");
      setCouponMessage("쿠폰이 등록되었습니다. 아래에서 선택해 주세요.");
      const rewards = await getRewards();
      setCoupons(rewards.coupons || []);
      if (data.coupon?._id) {
        setSelectedCouponId(data.coupon._id);
      }
    } catch (err) {
      setCouponMessage(err.message);
    } finally {
      setCouponSaving(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="checkout-flow">
        <div className="checkout-flow-inner">
          <Stepper active="cart" />
          <EmptyState
            message="장바구니가 비어 있습니다."
            action={
              <Link to="/products">
                <Button>상품 보러가기</Button>
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-flow">
      <div className="checkout-flow-inner">
        <Stepper active="cart" />

        {remainForFree > 0 && productAmount > 0 ? (
          <Alert tone="info" className="cart-alert">
            무료배송까지 {formatPrice(remainForFree)} 남았습니다. (10만원 이상)
          </Alert>
        ) : null}

        <div className="cart-layout">
          <section className="cart-list-panel">
            <div className="cart-list-head">
              <Checkbox
                label={`전체 선택 ( ${selectedLen} / ${items.length} )`}
                checked={allSelected}
                onChange={(e) => setAllSelected(e.target.checked)}
              />
              <Button variant="text" onClick={removeSelected}>
                선택 삭제
              </Button>
            </div>

            <ul className="cart-items">
              {items.map((item) => (
                <li key={item.key} className="cart-item">
                  <Checkbox
                    label=""
                    checked={item.selected}
                    onChange={() => toggleSelected(item.key)}
                    aria-label={`${item.productName} 선택`}
                  />
                  <Link
                    to={`/products/${item.productId}`}
                    className="cart-thumb"
                    style={
                      item.image
                        ? { backgroundImage: `url(${item.image})` }
                        : undefined
                    }
                  />
                  <div className="cart-item-body">
                    <button
                      type="button"
                      className="cart-item-remove"
                      onClick={() => removeItem(item.key)}
                      aria-label="삭제"
                    >
                      ×
                    </button>
                    <p className="cart-brand">{item.brandName || "ODEUM"}</p>
                    <p className="cart-name">{item.productName}</p>
                    <p className="cart-option">
                      {item.color} / {item.size}
                    </p>
                    {item.stock > 0 && item.stock <= 3 ? (
                      <p className="cart-stock-warn">
                        재고 {item.stock}개 남음
                      </p>
                    ) : null}
                    <div className="cart-item-foot">
                      <div className="cart-qty">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.key, item.quantity - 1)
                          }
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.key, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                      <strong>{formatPrice(item.price * item.quantity)}</strong>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <aside className="cart-summary">
            <h2>주문 요약</h2>
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
                <dt>배송비</dt>
                <dd>{shippingLabel}</dd>
              </div>
            </dl>
            <div className="summary-total">
              <span>결제 예정</span>
              <strong>{formatPrice(payAmount)}</strong>
            </div>

            <Field label="보유 쿠폰 적용 (미리보기)">
              <select
                className="ui-select"
                value={selectedCouponId}
                onChange={(e) => setSelectedCouponId(e.target.value)}
              >
                <option value="">쿠폰 선택 안 함</option>
                {coupons.map((item) => (
                  <option
                    key={item._id}
                    value={item._id}
                    disabled={Number(item.minOrderAmount || 0) > productAmount}
                  >
                    {item.title} ({item.displayValue}
                    {item.type === "percent" ? "" : "원"})
                  </option>
                ))}
              </select>
            </Field>
            <p className="muted-note">
              선택한 쿠폰은 결제 단계로 이어집니다.
            </p>

            <div className="coupon-row">
              <Field label="쿠폰 코드 등록">
                <Input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="쿠폰 코드"
                />
              </Field>
              <Button
                variant="primary"
                disabled={couponSaving}
                onClick={handleCoupon}
              >
                {couponSaving ? "등록 중..." : "등록"}
              </Button>
            </div>
            {couponMessage ? (
              <p className="coupon-msg">{couponMessage}</p>
            ) : null}

            <Link
              to={selectedCount > 0 ? "/checkout" : "#"}
              className={selectedCount > 0 ? "" : "is-disabled-link"}
              onClick={(e) => {
                if (selectedCount <= 0) e.preventDefault();
              }}
            >
              <Button block disabled={selectedCount <= 0}>
                주문하기 ({selectedCount}개)
              </Button>
            </Link>
            <Link to="/products" className="summary-continue">
              계속 쇼핑하기
            </Link>
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="cart-related">
            <h2>이 상품은 어떠세요</h2>
            <div className="cart-related-grid">
              {related.map((product) => {
                const thumb = getMainImage(product);
                return (
                  <Link
                    key={product._id}
                    to={`/products/${product._id}`}
                    className="cart-related-card"
                  >
                    <div
                      className="cart-related-thumb"
                      style={
                        thumb
                          ? { backgroundImage: `url(${thumb})` }
                          : undefined
                      }
                    />
                    <p>{product.brand?.name || "ODEUM"}</p>
                    <h3>{product.name}</h3>
                    <strong>{formatPrice(salePrice(product))}</strong>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default Cart;
