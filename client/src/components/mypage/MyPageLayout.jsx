import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet } from "react-router-dom";
import { getMe } from "../../api/auth";
import { getOrders } from "../../api/orders";
import { getRewards } from "../../api/rewards";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";
import { formatPrice } from "../../utils/productDisplay";

const menu = [
  { to: "/mypage/orders", label: "주문 내역" },
  { to: "/mypage/shipping", label: "배송 조회" },
  { to: "/mypage/wishlist", label: "찜한 상품" },
  { to: "/mypage/rewards", label: "쿠폰·적립금" },
  { to: "/mypage/reviews", label: "리뷰 관리" },
  { to: "/mypage/profile", label: "회원 정보" },
];

const ACTIVE_ORDER_STATUSES = new Set([
  "pending_deposit",
  "paid",
  "preparing",
  "shipping",
  "cancel_requested",
]);

function MyPageLayout() {
  const { user, isLoggedIn, updateUser } = useAuth();
  const { count: wishCount } = useWishlist();
  const [couponCount, setCouponCount] = useState(0);
  const [pointBalance, setPointBalance] = useState(user?.pointBalance || 0);
  const [activeOrderCount, setActiveOrderCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) return;

    getMe()
      .then((data) => {
        if (data.user) updateUser(data.user);
      })
      .catch(() => {});

    getRewards()
      .then((data) => {
        setCouponCount(data.couponCount || 0);
        setPointBalance(data.pointBalance || 0);
      })
      .catch(() => {});

    getOrders({ page: 1, limit: 50 })
      .then((data) => {
        const count = (data.orders || []).filter((order) =>
          ACTIVE_ORDER_STATUSES.has(order.status)
        ).length;
        setActiveOrderCount(count);
      })
      .catch(() => setActiveOrderCount(0));
  }, [isLoggedIn, updateUser]);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: "/mypage/orders" }} />;
  }

  const initial = (user?.name || "?").slice(0, 1);
  const membership = user?.membership;

  return (
    <main className="mypage">
      <section className="mypage-summary">
        <div className="mypage-summary-inner">
          <div className="mypage-user">
            <div className="mypage-avatar">{initial}</div>
            <div>
              <strong>{user.name} 님</strong>
              <p>
                {membership?.grade || "MEMBER"}
                {membership?.nextGrade
                  ? ` · 다음 등급까지 ${Number(
                      membership.remainToNext || 0
                    ).toLocaleString("ko-KR")}원`
                  : " · 최고 등급"}
              </p>
            </div>
          </div>
          <div className="mypage-stats">
            <div>
              <strong>{activeOrderCount}</strong>
              <span>진행 중 주문</span>
            </div>
            <div>
              <strong>{wishCount}</strong>
              <span>찜한 상품</span>
            </div>
            <div>
              <strong>{couponCount}</strong>
              <span>쿠폰</span>
            </div>
            <div>
              <strong>{formatPrice(pointBalance)}</strong>
              <span>적립금</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mypage-body">
        <aside className="mypage-nav">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `mypage-nav-item${isActive ? " is-active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </aside>
        <div className="mypage-content">
          <Outlet />
        </div>
      </div>
    </main>
  );
}

export default MyPageLayout;
