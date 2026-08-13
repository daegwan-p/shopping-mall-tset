import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <p className="footer-logo">ODEUM</p>
          <p>서울특별시 성동구 연무장길 12</p>
          <p>사업자등록번호 123-45-67890</p>
          <p>운영시간 평일 10:00 - 18:00</p>
        </div>

        <div>
          <h4>SHOP</h4>
          <Link to="/">New</Link>
          <Link to="/">Best</Link>
          <Link to="/">Sale</Link>
        </div>

        <div>
          <h4>CUSTOMER</h4>
          <span>FAQ</span>
          <span>Q&A</span>
          <span>고객센터</span>
        </div>

        <div className="footer-news">
          <h4>NEWSLETTER</h4>
          <p>신상품과 소식을 가장 먼저 받아보세요.</p>
          <form
            className="newsletter-form"
            onSubmit={(e) => e.preventDefault()}
          >
            <input type="email" placeholder="email@example.com" />
            <button type="submit">JOIN</button>
          </form>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
