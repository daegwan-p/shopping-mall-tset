/**
 * PortOne V2 payment helpers (server-side).
 */

async function getPortoneHeaders() {
  const apiSecret = process.env.PORTONE_API_SECRET;
  if (!apiSecret) {
    const error = new Error(
      "서버에 PORTONE_API_SECRET이 없습니다. 포트원 콘솔(V2 API Secret) 값을 server/.env에 넣어 주세요."
    );
    error.statusCode = 500;
    throw error;
  }
  return { Authorization: `PortOne ${apiSecret}` };
}

async function getPortoneV2Payment(paymentId) {
  const headers = await getPortoneHeaders();
  const response = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
    { headers }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "포트원 결제 조회에 실패했습니다.");
    error.statusCode = response.status >= 400 ? response.status : 502;
    throw error;
  }
  return data;
}

/**
 * Cancel/refund a PortOne V2 payment. No-op if paymentId empty.
 * Returns { skipped, cancelled, data } 
 */
async function cancelPortoneV2Payment(paymentId, reason = "주문 취소") {
  const id = String(paymentId || "").trim();
  if (!id) return { skipped: true, cancelled: false };

  const headers = await getPortoneHeaders();
  headers["Content-Type"] = "application/json";

  const response = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: String(reason).slice(0, 200) }),
    }
  );
  const data = await response.json().catch(() => ({}));

  // Already cancelled is OK
  if (!response.ok) {
    const msg = String(data.message || "");
    if (/already|취소|cancel/i.test(msg) && response.status < 500) {
      return { skipped: false, cancelled: true, already: true, data };
    }
    const error = new Error(msg || "포트원 결제 취소에 실패했습니다.");
    error.statusCode = response.status >= 400 ? response.status : 502;
    throw error;
  }

  return { skipped: false, cancelled: true, data };
}

module.exports = {
  getPortoneV2Payment,
  cancelPortoneV2Payment,
};
