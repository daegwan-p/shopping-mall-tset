function AdminSettings() {
  return (
    <div className="admin-page-inner">
      <div className="admin-page-head">
        <div>
          <h1>설정</h1>
          <p className="admin-sub">운영에 필요한 연동·환경 안내</p>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <h2>결제 (PortOne V2)</h2>
        <ul className="admin-todo">
          <li>
            클라이언트: <code>VITE_PORTONE_STORE_ID</code>,{" "}
            <code>VITE_PORTONE_CHANNEL_KEY</code>
          </li>
          <li>
            서버: <code>PORTONE_API_SECRET</code> (V2 API Secret)
          </li>
          <li>채널 PG: inicis_v2 (KG이니시스)</li>
        </ul>
      </div>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <h2>배송</h2>
        <ul className="admin-todo">
          <li>기본 배송비 3,000원 · 10만원 이상 무료</li>
          <li>주문 관리에서 송장 등록 시 배송중으로 전환</li>
        </ul>
      </div>

      <div className="admin-card">
        <h2>테스트 데이터</h2>
        <ul className="admin-todo">
          <li>
            주문 관리 → <strong>테스트 주문 정리</strong>로 취소·미결제 초안 삭제
          </li>
          <li>전체 탭에는 취소완료가 기본 숨김됩니다</li>
        </ul>
      </div>
    </div>
  );
}

export default AdminSettings;
