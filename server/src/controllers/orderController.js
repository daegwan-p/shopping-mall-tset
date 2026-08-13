const Order = require("../models/Order");
const { removeVariantsFromCart } = require("./cartController");
const { parsePagination, buildPagination } = require("../utils/pagination");
const {
  decrementStock,
  restoreStock,
} = require("../utils/stock");
const {
  DUPLICATE_WINDOW_MS,
  itemsFingerprint,
  calcShippingFee,
  buildVerifiedOrderItems,
} = require("../utils/orderItems");
const {
  resolveCheckoutCoupon,
  markCouponUsed,
  restoreCouponForOrder,
} = require("../utils/coupons");
const { creditPoints, resolvePointsToUse } = require("../utils/points");
const User = require("../models/User");
const { cancelPortoneV2Payment } = require("../utils/portone");

const createOrderNumber = () => {
  const stamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 90 + 10);
  return `OD-${stamp}${random}`;
};

const statusLabel = {
  pending_payment: "결제대기",
  pending_deposit: "입금대기",
  paid: "결제완료",
  preparing: "배송준비",
  shipping: "배송중",
  delivered: "배송완료",
  cancel_requested: "취소요청",
  cancelled: "취소완료",
};

async function restoreOrderStock(order) {
  if (!order.stockDeducted || order.stockRestored) return false;
  await restoreStock(order.items);
  order.stockRestored = true;
  return true;
}

async function restoreOrderRewards(order) {
  let restoredCoupon = false;
  let restoredPoints = 0;

  if (order.userCoupon) {
    restoredCoupon = await restoreCouponForOrder(order);
    if (restoredCoupon) {
      order.userCoupon = undefined;
      order.history.push({
        at: new Date(),
        action: "쿠폰 복구",
        actor: "System",
      });
    }
  }

  const points = Number(order.pointsUsed || 0);
  if (points > 0 && order.user) {
    await creditPoints(order.user, points, {
      type: "order_use",
      note: `주문 취소 적립금 복구 ${order.orderNumber}`,
      refOrder: order._id,
    });
    restoredPoints = points;
    order.pointsUsed = 0;
    order.history.push({
      at: new Date(),
      action: `적립금 복구 (${points.toLocaleString("ko-KR")}원)`,
      actor: "System",
    });
  }

  return { restoredCoupon, restoredPoints };
}

async function markOrderPaid(order, { actor = "System", paidAmount } = {}) {
  if (order.status === "paid" && order.stockDeducted) {
    return order;
  }

  if (!order.stockDeducted) {
    await decrementStock(order.items);
    order.stockDeducted = true;
    order.stockRestored = false;
  }

  order.status = "paid";
  order.paidAt = order.paidAt || new Date();
  if (paidAmount != null) {
    order.paidAmount = Number(paidAmount);
  } else if (order.paidAmount == null) {
    order.paidAmount = order.totalAmount;
  }

  order.history.push({
    at: new Date(),
    action: "결제 승인",
    actor,
  });

  await order.save();
  return order;
}

const getOrders = async (req, res, next) => {
  try {
    const filter = {};
    const isAdmin = req.user.role === "admin";
    // 관리자 전체 조회는 manage=1 일 때만 (마이페이지는 본인 주문만)
    const isAdminManage = isAdmin && String(req.query.manage) === "1";

    if (!isAdminManage) {
      filter.user = req.user._id;
      if (!req.query.status && req.query.includeHidden !== "1") {
        filter.status = {
          $nin: ["cancelled", "pending_payment"],
        };
      } else if (req.query.status) {
        filter.status = req.query.status;
      }

      const range = String(req.query.range || "").trim();
      if (range && range !== "all") {
        const months = range === "3m" ? 3 : range === "1y" ? 12 : 6;
        const from = new Date();
        from.setMonth(from.getMonth() - months);
        filter.createdAt = { $gte: from };
      }
    } else {
      // 어드민 "전체": 취소완료·결제대기 초안은 기본 제외 (탭으로만 조회)
      if (req.query.status) {
        filter.status = req.query.status;
      } else {
        filter.status = {
          $nin: ["cancelled", "pending_payment"],
        };
      }
      if (req.query.orderNumber) {
        filter.orderNumber = { $regex: req.query.orderNumber, $options: "i" };
      }
      if (req.query.customerName) {
        filter.customerName = { $regex: req.query.customerName, $options: "i" };
      }
      if (req.query.customerPhone) {
        filter.customerPhone = { $regex: req.query.customerPhone, $options: "i" };
      }
    }

    const { page, limit } = parsePagination(req.query, {
      defaultLimit: 10,
    });

    const total = await Order.countDocuments(filter);
    const pagination = buildPagination(total, page, limit);
    const safeSkip = (pagination.page - 1) * limit;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(safeSkip)
      .limit(limit);

    res.status(200).json({
      success: true,
      orders,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
    }

    const isOwner = order.user?.toString() === req.user._id.toString();
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const {
      customerName,
      customerPhone,
      paymentMethod,
      shippingMethod,
      shippingFee = 0,
      items,
      shippingAddress,
      userCouponId,
      pointsUsed: requestedPoints = 0,
    } = req.body;

    if (!customerName || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "customerName과 items는 필수입니다.",
      });
    }

    const addr = shippingAddress || {};
    if (
      !String(addr.recipient || "").trim() ||
      !String(addr.phone || customerPhone || "").trim() ||
      !String(addr.zipCode || "").trim() ||
      !String(addr.address || "").trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "받는 분, 연락처, 우편번호, 주소는 필수입니다.",
      });
    }

    const normalizedItems = await buildVerifiedOrderItems(items);
    const itemsTotal = normalizedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const expectedShippingFee = calcShippingFee(itemsTotal);
    if (Number(shippingFee || 0) !== expectedShippingFee) {
      return res.status(400).json({
        success: false,
        message: "배송비가 올바르지 않습니다.",
      });
    }

    const { couponDiscount, userCoupon } = await resolveCheckoutCoupon(
      req.user._id,
      userCouponId,
      itemsTotal
    );

    const freshUser = await User.findById(req.user._id).select("pointBalance");
    const pointsUsed = resolvePointsToUse({
      requested: requestedPoints,
      pointBalance: freshUser?.pointBalance || 0,
      itemsTotal,
      couponDiscount,
      shippingFee: expectedShippingFee,
    });

    const totalAmount = Math.max(
      0,
      itemsTotal - couponDiscount - pointsUsed + expectedShippingFee
    );
    const isDeposit = paymentMethod === "deposit";
    const nextStatus = isDeposit ? "pending_deposit" : "pending_payment";
    const fingerprint = itemsFingerprint(normalizedItems);

    const recentPending = await Order.find({
      user: req.user._id,
      status: nextStatus,
      createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    }).sort({ createdAt: -1 });

    const duplicate = recentPending.find(
      (existing) =>
        itemsFingerprint(existing.items) === fingerprint &&
        Number(existing.totalAmount) === Number(totalAmount) &&
        Number(existing.couponDiscount || 0) === Number(couponDiscount) &&
        Number(existing.pointsUsed || 0) === Number(pointsUsed)
    );

    if (duplicate) {
      duplicate.customerName = customerName;
      duplicate.customerPhone = customerPhone || duplicate.customerPhone;
      duplicate.paymentMethod = paymentMethod || duplicate.paymentMethod;
      duplicate.shippingMethod = shippingMethod || duplicate.shippingMethod;
      if (shippingAddress) {
        duplicate.shippingAddress = shippingAddress;
      }
      await duplicate.save();

      return res.status(200).json({
        success: true,
        order: duplicate,
        reused: true,
        message: "동일한 미결제 주문이 있어 기존 주문을 사용합니다.",
      });
    }

    const orderNumber = createOrderNumber();

    const order = await Order.create({
      orderNumber,
      user: req.user._id,
      customerName,
      customerPhone,
      paymentMethod,
      shippingMethod: shippingMethod || "standard",
      shippingFee: expectedShippingFee,
      items: normalizedItems,
      shippingAddress,
      itemsTotal,
      couponDiscount,
      pointsUsed,
      userCoupon: userCoupon?._id,
      totalAmount,
      status: nextStatus,
      pgProvider: isDeposit ? "" : "portone",
      pgMerchantUid: orderNumber,
      stockDeducted: false,
      stockRestored: false,
      history: [
        {
          at: new Date(),
          action: isDeposit ? "주문 접수 (무통장)" : "주문 접수 (결제대기)",
          actor: "Customer",
        },
      ],
    });

    if (userCoupon) {
      await markCouponUsed(userCoupon, order._id);
      order.history.push({
        at: new Date(),
        action: `쿠폰 사용 (${couponDiscount.toLocaleString("ko-KR")}원)`,
        actor: "Customer",
      });
    }

    if (pointsUsed > 0) {
      await creditPoints(req.user._id, -pointsUsed, {
        type: "order_use",
        note: `주문 사용 ${order.orderNumber}`,
        refOrder: order._id,
      });
      order.history.push({
        at: new Date(),
        action: `적립금 사용 (${pointsUsed.toLocaleString("ko-KR")}원)`,
        actor: "Customer",
      });
    }

    if (userCoupon || pointsUsed > 0) {
      await order.save();
    }

    if (isDeposit) {
      await removeVariantsFromCart(
        req.user._id,
        normalizedItems.map((item) => item.variant)
      );
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

const updateOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
    }

    const allowed = [
      "status",
      "paymentMethod",
      "shippingAddress",
      "paidAt",
      "shippedAt",
      "courier",
      "trackingNumber",
      "adminMemo",
      "shippingMethod",
      "shippingFee",
    ];

    const prevStatus = order.status;
    if (req.body.status === "cancelled" && prevStatus !== "cancelled") {
      return res.status(400).json({
        success: false,
        message: "주문 취소는 취소 버튼을 사용해 주세요. 결제 환불이 함께 처리됩니다.",
      });
    }
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) order[key] = req.body[key];
    });

    if (order.status === "paid" && !order.paidAt) {
      order.paidAt = new Date();
    }
    if (order.status === "shipping" && !order.shippedAt) {
      order.shippedAt = new Date();
    }
    if (order.status === "delivered" && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    if (req.body.status && req.body.status !== prevStatus) {
      order.history.push({
        at: new Date(),
        action: `상태 변경: ${statusLabel[req.body.status] || req.body.status}`,
        actor: req.user?.name || "Admin",
      });
    }

    if (req.body.trackingNumber) {
      order.history.push({
        at: new Date(),
        action: `송장 등록 (${req.body.courier || "택배"} ${req.body.trackingNumber})`,
        actor: req.user?.name || "Admin",
      });
    }

    if (order.status === "paid" && prevStatus !== "paid" && !order.stockDeducted) {
      await decrementStock(order.items);
      order.stockDeducted = true;
      order.stockRestored = false;
      order.paidAmount = order.paidAmount ?? order.totalAmount;
      order.history.push({
        at: new Date(),
        action: "재고 차감",
        actor: "System",
      });
    }

    if (order.status === "cancelled" && prevStatus !== "cancelled") {
      const restored = await restoreOrderStock(order);
      if (restored) {
        order.history.push({
          at: new Date(),
          action: "재고 복구",
          actor: req.user?.name || "Admin",
        });
      }
      await restoreOrderRewards(order);
    }

    await order.save();

    res.status(200).json({ success: true, order });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
    }

    const isOwner = order.user?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    if (order.status === "cancelled") {
      return res.status(200).json({ success: true, order });
    }

    // 고객: 취소요청만. 어드민 확정 시에만 취소완료(+재고복구)
    if (!isAdmin) {
      if (order.status === "cancel_requested") {
        return res.status(200).json({
          success: true,
          order,
          message: "이미 취소 요청된 주문입니다.",
        });
      }

      // 결제 전 초안은 바로 취소완료(주문내역에 안 보임)
      if (order.status === "pending_payment") {
        order.status = "cancelled";
        order.history.push({
          at: new Date(),
          action: "주문 취소 (미결제)",
          actor: "Customer",
        });
        await restoreOrderRewards(order);
        await order.save();
        return res.status(200).json({ success: true, order });
      }

      if (!["pending_deposit", "paid", "preparing"].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: "현재 상태에서는 취소 요청할 수 없습니다.",
        });
      }

      order.status = "cancel_requested";
      order.history.push({
        at: new Date(),
        action: "취소 요청",
        actor: "Customer",
      });
      await order.save();
      return res.status(200).json({
        success: true,
        order,
        message: "취소가 요청되었습니다. 관리자 확인 후 처리됩니다.",
      });
    }

    if (order.status === "delivered") {
      return res.status(400).json({
        success: false,
        message: "배송완료 주문은 취소할 수 없습니다.",
      });
    }

    const prevStatus = order.status;
    const paymentId = String(order.pgImpUid || "").trim();
    const needsPgRefund =
      Boolean(paymentId) &&
      /portone/i.test(String(order.pgProvider || "")) &&
      Number(order.paidAmount || order.totalAmount || 0) > 0 &&
      ["paid", "preparing", "shipping", "cancel_requested"].includes(prevStatus);

    if (needsPgRefund) {
      try {
        await cancelPortoneV2Payment(
          paymentId,
          `주문 취소 ${order.orderNumber}`
        );
        order.history.push({
          at: new Date(),
          action: "포트원 결제 취소/환불",
          actor: "System",
        });
      } catch (pgError) {
        return res.status(502).json({
          success: false,
          message:
            pgError.message ||
            "결제 환불에 실패해 주문을 취소하지 못했습니다. 포트원 콘솔을 확인해 주세요.",
        });
      }
    }

    order.status = "cancelled";
    order.history.push({
      at: new Date(),
      action: "주문 취소 확정",
      actor: req.user.name || "Admin",
    });

    const restored = await restoreOrderStock(order);
    if (restored) {
      order.history.push({
        at: new Date(),
        action: "재고 복구",
        actor: "System",
      });
    }

    await restoreOrderRewards(order);

    await order.save();
    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
    }

    if (order.stockDeducted && !order.stockRestored) {
      await restoreStock(order.items);
      order.stockRestored = true;
    }

    await restoreOrderRewards(order);
    await order.deleteOne();
    res.status(200).json({ success: true, message: "주문이 삭제되었습니다." });
  } catch (error) {
    next(error);
  }
};

/** 테스트용: 취소완료(또는 pending_payment) 주문 일괄 삭제 */
const cleanupTestOrders = async (req, res, next) => {
  try {
    const statuses = Array.isArray(req.body?.statuses)
      ? req.body.statuses
      : ["cancelled", "pending_payment"];

    const allowed = new Set([
      "cancelled",
      "pending_payment",
      "cancel_requested",
    ]);
    const targetStatuses = statuses.filter((s) => allowed.has(s));
    if (targetStatuses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "삭제할 상태 값이 올바르지 않습니다.",
      });
    }

    const orders = await Order.find({ status: { $in: targetStatuses } });
    for (const order of orders) {
      if (order.stockDeducted && !order.stockRestored) {
        await restoreStock(order.items);
      }
    }

    const result = await Order.deleteMany({ status: { $in: targetStatuses } });
    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount || 0,
      message: `${result.deletedCount || 0}건의 테스트/취소 주문을 삭제했습니다.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  cancelOrder,
  deleteOrder,
  cleanupTestOrders,
  markOrderPaid,
  statusLabel,
};
