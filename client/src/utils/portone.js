import * as PortOne from "@portone/browser-sdk/v2";

const PAY_METHOD_MAP = {
  card: "CARD",
  CARD: "CARD",
};

/**
 * 포트원 V2 결제창 호출
 * - 콘솔 채널이 inicis_v2 이면 V1(IMP.request_pay / pg)을 쓰면 안 됩니다.
 */
export async function requestPortonePay({
  merchantUid,
  amount,
  name,
  buyerName,
  buyerTel,
  buyerEmail,
  payMethod = "card",
}) {
  const storeId = String(import.meta.env.VITE_PORTONE_STORE_ID || "").trim();
  const channelKey = String(
    import.meta.env.VITE_PORTONE_CHANNEL_KEY || ""
  ).trim();

  if (!storeId) {
    throw new Error(
      "VITE_PORTONE_STORE_ID가 없습니다. 포트원 콘솔 → 결제연동 → 식별코드·API Keys에서 Store ID(store-...)를 client/.env에 넣어 주세요."
    );
  }

  if (!channelKey) {
    throw new Error(
      "VITE_PORTONE_CHANNEL_KEY가 없습니다. 포트원 콘솔 채널 관리의 channel-key를 client/.env에 넣어 주세요."
    );
  }

  const mapped = PAY_METHOD_MAP[payMethod] || PAY_METHOD_MAP.card;
  const paymentId = String(merchantUid);
  const response = await PortOne.requestPayment({
    storeId,
    channelKey,
    paymentId,
    orderName: name || "ODEUM 주문",
    totalAmount: Number(amount),
    currency: "CURRENCY_KRW",
    payMethod: mapped,
    customer: {
      fullName: buyerName || undefined,
      phoneNumber: buyerTel || undefined,
      email: buyerEmail || undefined,
    },
  });

  if (!response) {
    throw new Error("결제 응답이 없습니다. 다시 시도해 주세요.");
  }

  if (response.code !== undefined) {
    throw new Error(response.message || "결제가 취소되었거나 실패했습니다.");
  }

  return {
    paymentId: response.paymentId || paymentId,
  };
}
