const Order = require("../models/Order");
const { removeVariantsFromCart } = require("./cartController");
const { markOrderPaid } = require("./orderController");
const { getPortoneV2Payment } = require("../utils/portone");

function isPaidCurrency(currency) {
  if (!currency) return true;
  const value = String(currency).toUpperCase();
  return value === "KRW" || value === "CURRENCY_KRW";
}

function extractPaidTotal(payment) {
  if (payment?.amount == null) return NaN;
  if (typeof payment.amount === "number") return Number(payment.amount);
  if (typeof payment.amount?.total === "number") {
    return Number(payment.amount.total);
  }
  return NaN;
}

const confirmPayment = async (req, res, next) => {
  try {
    const { orderId, paymentId, impUid, merchantUid } = req.body;
    const resolvedPaymentId = String(paymentId || impUid || "").trim();

    if (!orderId || !resolvedPaymentId) {
      return res.status(400).json({
        success: false,
        message: "orderId와 paymentId는 필수입니다.",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "주문을 찾을 수 없습니다.",
      });
    }

    if (order.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "접근 권한이 없습니다.",
      });
    }

    if (order.status === "paid") {
      return res.status(200).json({ success: true, order });
    }

    if (order.status !== "pending_payment") {
      return res.status(400).json({
        success: false,
        message: "결제할 수 있는 주문 상태가 아닙니다.",
      });
    }

    // 0원 주문: PG 없이 승인
    if (Number(order.totalAmount) === 0) {
      order.pgProvider = "free";
      order.pgImpUid = resolvedPaymentId || `FREE-${order.orderNumber}`;
      await markOrderPaid(order, { actor: "Customer", paidAmount: 0 });
      await removeVariantsFromCart(
        req.user._id,
        order.items.map((item) => item.variant)
      );
      return res.status(200).json({ success: true, order });
    }

    const expectedPaymentId = String(
      order.pgMerchantUid || order.orderNumber || ""
    ).trim();

    if (!expectedPaymentId || resolvedPaymentId !== expectedPaymentId) {
      return res.status(400).json({
        success: false,
        message: "결제 번호가 주문 정보와 일치하지 않습니다.",
      });
    }

    if (merchantUid && String(merchantUid).trim() !== expectedPaymentId) {
      return res.status(400).json({
        success: false,
        message: "merchantUid가 주문 정보와 일치하지 않습니다.",
      });
    }

    const alreadyUsed = await Order.findOne({
      _id: { $ne: order._id },
      $or: [
        { pgImpUid: resolvedPaymentId },
        { pgMerchantUid: resolvedPaymentId, status: "paid" },
      ],
    }).select("_id orderNumber status");

    if (alreadyUsed) {
      return res.status(409).json({
        success: false,
        message: "이미 다른 주문에 사용된 결제입니다.",
      });
    }

    const payment = await getPortoneV2Payment(resolvedPaymentId);

    if (payment.status !== "PAID") {
      return res.status(400).json({
        success: false,
        message: `결제가 완료되지 않았습니다. (status: ${payment.status})`,
      });
    }

    if (payment.id && String(payment.id) !== expectedPaymentId) {
      return res.status(400).json({
        success: false,
        message: "포트원 결제 ID가 주문 번호와 일치하지 않습니다.",
      });
    }

    if (!isPaidCurrency(payment.currency)) {
      return res.status(400).json({
        success: false,
        message: "결제 통화가 올바르지 않습니다.",
      });
    }

    const paidTotal = extractPaidTotal(payment);
    if (!Number.isFinite(paidTotal) || paidTotal !== Number(order.totalAmount)) {
      return res.status(400).json({
        success: false,
        message: "결제 금액이 주문 금액과 일치하지 않습니다.",
      });
    }

    order.pgProvider = "portone_v2";
    order.pgImpUid = resolvedPaymentId;
    order.pgMerchantUid = expectedPaymentId;

    await markOrderPaid(order, {
      actor: "PortOne",
      paidAmount: paidTotal,
    });

    await removeVariantsFromCart(
      req.user._id,
      order.items.map((item) => item.variant)
    );

    res.status(200).json({ success: true, order });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "이미 처리된 결제입니다.",
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  confirmPayment,
};
