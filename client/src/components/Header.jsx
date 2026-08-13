import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

function Header() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoggedIn, logout } = useAuth();
  const { totalCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <header className="odeum-header">
      <div className="utility-bar">
        <div className="utility-inner">
          <Link to="/">공지사항</Link>
          <Link to={user ? "/mypage/orders" : "/login"}>마이페이지</Link>
          <Link to={user ? "/mypage/orders" : "/login"}>주문조회</Link>
          <span>고객센터</span>
        </div>
      </div>

      <div className="main-nav">
        <nav className="nav-categories" aria-label="카테고리">
          <Link to="/products">NEW</Link>
          <Link to="/products?category=아우터">아우터</Link>
          <Link to="/products?category=상의">상의</Link>
          <Link to="/products?category=셔츠">셔츠</Link>
          <Link to="/products?category=니트">니트</Link>
          <Link to="/products?category=팬츠">팬츠</Link>
          <Link to="/products?category=액세서리">액세서리</Link>
          <Link to="/products">브랜드</Link>
        </nav>

        <Link to="/" className="brand-logo">
          ODEUM
        </Link>

        <div className="nav-actions">
          <button type="button" className="icon-btn" aria-label="검색">
            <SearchIcon />
          </button>

          {user ? (
            <div className="user-menu" ref={menuRef}>
              <button
                type="button"
                className="user-trigger"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                {user.name}님
              </button>

              {isAdmin && (
                <Link to="/admin" className="admin-btn">
                  관리자
                </Link>
              )}

              {menuOpen && (
                <div className="user-dropdown">
                  <p className="dropdown-name">{user.name}님</p>
                  <p className="dropdown-role">
                    {isAdmin ? "관리자 계정" : "멤버"}
                  </p>
                  <div className="dropdown-links">
                    <Link to="/mypage/profile" onClick={() => setMenuOpen(false)}>
                      정보 수정
                    </Link>
                    <Link to="/mypage/orders" onClick={() => setMenuOpen(false)}>
                      주문 내역
                    </Link>
                    <button type="button" onClick={handleLogout}>
                      로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="login-link">
              로그인
            </Link>
          )}

          <Link
            to={isLoggedIn ? "/cart" : "/login"}
            state={isLoggedIn ? undefined : { from: "/cart" }}
            className="icon-btn cart-btn"
            aria-label="장바구니"
          >
            <CartIcon />
            {isLoggedIn ? (
              <span className="cart-badge">{totalCount}</span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.2" fill="currentColor" />
      <circle cx="18" cy="20" r="1.2" fill="currentColor" />
    </svg>
  );
}

export default Header;
