import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Header from "../Header";
import "./admin.css";

const navItems = [
  { to: "/admin", label: "대시보드", end: true },
  { to: "/admin/orders", label: "주문 관리" },
  { to: "/admin/products", label: "상품 관리" },
  { to: "/admin/brands", label: "브랜드" },
  { to: "/admin/inventory", label: "재고" },
  { to: "/admin/coupons", label: "쿠폰·프로모션" },
  { to: "/admin/settlement", label: "정산" },
  { to: "/admin/settings", label: "설정" },
];

function AdminLayout() {
  const { user, isAdmin } = useAuth();

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-app">
      <Header />
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <span className="admin-brand-name">ODEUM</span>
            <span className="admin-brand-tag">ADMIN</span>
          </div>

          <nav className="admin-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `admin-nav-item${isActive ? " is-active" : ""}`
                }
              >
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="admin-sidebar-foot">
            <p>{user.name} · 운영자</p>
            <Link to="/" className="admin-store-link">
              쇼핑몰로 돌아가기
            </Link>
          </div>
        </aside>

        <div className="admin-main">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
