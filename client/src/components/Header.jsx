import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const NAV_LINKS = [
  { to: "/products", label: "NEW" },
  { to: "/products?category=아우터", label: "아우터" },
  { to: "/products?category=상의", label: "상의" },
  { to: "/products?category=셔츠", label: "셔츠" },
  { to: "/products?category=니트", label: "니트" },
  { to: "/products?category=팬츠", label: "팬츠" },
  { to: "/products?category=액세서리", label: "액세서리" },
  { to: "/products", label: "브랜드" },
];

function Header() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoggedIn, logout } = useAuth();
  const { totalCount } = useCart();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("mobile-nav-open", mobileNavOpen);
    return () => document.body.classList.remove("mobile-nav-open");
  }, [mobileNavOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const closeMobileNav = () => setMobileNavOpen(false);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    closeMobileNav();
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
        <button
          type="button"
          className="mobile-menu-btn icon-btn"
          aria-label={mobileNavOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((prev) => !prev)}
        >
          {mobileNavOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <nav className="nav-categories" aria-label="카테고리">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={`${to}-${label}`} to={to}>
              {label}
            </Link>
          ))}
        </nav>

        <Link to="/" className="brand-logo" onClick={closeMobileNav}>
          ODEUM
        </Link>

        <div className="nav-actions">
          <button type="button" className="icon-btn desktop-only" aria-label="검색">
            <SearchIcon />
          </button>

          {user ? (
            <div className="user-menu desktop-only" ref={userMenuRef}>
              <button
                type="button"
                className="user-trigger"
                onClick={() => setUserMenuOpen((prev) => !prev)}
              >
                {user.name}님
              </button>

              {isAdmin && (
                <Link to="/admin" className="admin-btn">
                  관리자
                </Link>
              )}

              {userMenuOpen && (
                <div className="user-dropdown">
                  <p className="dropdown-name">{user.name}님</p>
                  <p className="dropdown-role">
                    {isAdmin ? "관리자 계정" : "멤버"}
                  </p>
                  <div className="dropdown-links">
                    <Link to="/mypage/profile" onClick={() => setUserMenuOpen(false)}>
                      정보 수정
                    </Link>
                    <Link to="/mypage/orders" onClick={() => setUserMenuOpen(false)}>
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
            <Link to="/login" className="login-link desktop-only">
              로그인
            </Link>
          )}

          <Link
            to={isLoggedIn ? "/cart" : "/login"}
            state={isLoggedIn ? undefined : { from: "/cart" }}
            className="icon-btn cart-btn"
            aria-label="장바구니"
            onClick={closeMobileNav}
          >
            <CartIcon />
            {isLoggedIn ? (
              <span className="cart-badge">{totalCount}</span>
            ) : null}
          </Link>
        </div>
      </div>

      <div
        className={`mobile-nav-overlay${mobileNavOpen ? " is-open" : ""}`}
        aria-hidden={!mobileNavOpen}
        onClick={closeMobileNav}
      />

      <nav
        className={`mobile-nav-drawer${mobileNavOpen ? " is-open" : ""}`}
        aria-label="모바일 메뉴"
        aria-hidden={!mobileNavOpen}
      >
        <div className="mobile-nav-head">
          <p className="mobile-nav-title">MENU</p>
          <button
            type="button"
            className="icon-btn"
            aria-label="메뉴 닫기"
            onClick={closeMobileNav}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mobile-nav-links">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={`mobile-${to}-${label}`} to={to} onClick={closeMobileNav}>
              {label}
            </Link>
          ))}
        </div>

        <div className="mobile-nav-divider" />

        <div className="mobile-nav-util">
          <Link to="/" onClick={closeMobileNav}>
            공지사항
          </Link>
          <Link
            to={user ? "/mypage/orders" : "/login"}
            onClick={closeMobileNav}
          >
            마이페이지
          </Link>
          <Link
            to={user ? "/mypage/orders" : "/login"}
            onClick={closeMobileNav}
          >
            주문조회
          </Link>
        </div>

        <div className="mobile-nav-account">
          {user ? (
            <>
              <p className="mobile-nav-user">{user.name}님</p>
              <Link to="/mypage/profile" onClick={closeMobileNav}>
                정보 수정
              </Link>
              <Link to="/mypage/orders" onClick={closeMobileNav}>
                주문 내역
              </Link>
              {isAdmin && (
                <Link to="/admin" onClick={closeMobileNav}>
                  관리자
                </Link>
              )}
              <button type="button" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <Link to="/login" className="mobile-nav-login" onClick={closeMobileNav}>
              로그인 / 회원가입
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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
