export const ORDER_STATUS_LABEL = {
  pending_payment: "결제대기",
  pending_deposit: "입금대기",
  paid: "결제완료",
  preparing: "배송준비",
  shipping: "배송중",
  delivered: "배송완료",
  cancel_requested: "취소요청",
  cancelled: "취소완료",
};

export const ORDER_TIMELINE = ["paid", "preparing", "shipping", "delivered"];

export function orderStatusLabel(status) {
  return ORDER_STATUS_LABEL[status] || status;
}

export function orderTimelineIndex(status) {
  if (
    status === "pending_payment" ||
    status === "pending_deposit" ||
    status === "cancelled" ||
    status === "cancel_requested"
  ) {
    return -1;
  }
  return ORDER_TIMELINE.indexOf(status);
}
