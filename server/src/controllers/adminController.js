const Order = require("../models/Order");
const ProductVariant = require("../models/ProductVariant");

const PAID_STATUSES = ["paid", "preparing", "shipping", "delivered"];

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n) {
  const d = startOfDay();
  d.setDate(d.getDate() - n);
  return d;
}

const getDashboardStats = async (req, res, next) => {
  try {
    const today = startOfDay();
    const weekAgo = daysAgo(6);

    const [
      todayOrders,
      pendingPaymentCount,
      pendingDepositCount,
      cancelRequestedCount,
      weekOrders,
      lowStockVariants,
    ] = await Promise.all([
      Order.find({
        status: { $in: PAID_STATUSES },
        paidAt: { $gte: today },
      }).select("totalAmount paidAmount status paidAt createdAt"),
      Order.countDocuments({ status: "pending_payment" }),
      Order.countDocuments({ status: "pending_deposit" }),
      Order.countDocuments({ status: "cancel_requested" }),
      Order.find({
        status: { $in: PAID_STATUSES },
        $or: [{ paidAt: { $gte: weekAgo } }, { createdAt: { $gte: weekAgo } }],
      }).select("totalAmount paidAmount paidAt createdAt status"),
      ProductVariant.find({ stock: { $lte: 5 } })
        .sort({ stock: 1 })
        .limit(8)
        .populate("product", "name sku"),
    ]);

    const todayRevenue = todayOrders.reduce(
      (sum, o) => sum + Number(o.paidAmount ?? o.totalAmount ?? 0),
      0
    );

    const weekMap = {};
    for (let i = 0; i < 7; i += 1) {
      const day = daysAgo(6 - i);
      const key = day.toISOString().slice(0, 10);
      weekMap[key] = 0;
    }
    weekOrders.forEach((order) => {
      const at = order.paidAt || order.createdAt;
      const key = new Date(at).toISOString().slice(0, 10);
      if (weekMap[key] != null) {
        weekMap[key] += Number(order.paidAmount ?? order.totalAmount ?? 0);
      }
    });

    const weekSeries = Object.entries(weekMap).map(([date, amount]) => ({
      date,
      amount,
      label: new Date(date).toLocaleDateString("ko-KR", { weekday: "short" }),
    }));

    const recentOrders = await Order.find({
      status: { $nin: ["cancelled", "pending_payment"] },
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("orderNumber customerName status totalAmount createdAt items");

    res.status(200).json({
      success: true,
      stats: {
        todayRevenue,
        todayOrderCount: todayOrders.length,
        pendingPaymentCount,
        pendingDepositCount,
        cancelRequestedCount,
        lowStockCount: lowStockVariants.length,
        weekSeries,
        lowStock: lowStockVariants.map((v) => ({
          id: v._id,
          productName: v.product?.name || "-",
          sku: v.sku,
          color: v.color,
          size: v.size,
          stock: v.stock,
        })),
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getInventory = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const filter = {};
    if (q) {
      filter.$or = [
        { sku: { $regex: q, $options: "i" } },
        { color: { $regex: q, $options: "i" } },
        { size: { $regex: q, $options: "i" } },
      ];
    }

    const variants = await ProductVariant.find(filter)
      .sort({ stock: 1, updatedAt: -1 })
      .limit(200)
      .populate("product", "name sku status brand");

    res.status(200).json({
      success: true,
      items: variants.map((v) => ({
        id: v._id,
        productId: v.product?._id,
        productName: v.product?.name || "-",
        productSku: v.product?.sku || "",
        productStatus: v.product?.status || "",
        sku: v.sku,
        color: v.color,
        size: v.size,
        stock: v.stock,
        updatedAt: v.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const getSettlement = async (req, res, next) => {
  try {
    const orders = await Order.find({
      status: { $in: PAID_STATUSES },
    }).select("items totalAmount shippingFee status paidAt orderNumber");

    const map = {};
    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const brand = item.brandName || "ODEUM";
        if (!map[brand]) {
          map[brand] = { brand, sales: 0, qty: 0, orderIds: new Set() };
        }
        const line = Number(item.price) * Number(item.quantity || 1);
        map[brand].sales += line;
        map[brand].qty += Number(item.quantity || 0);
        map[brand].orderIds.add(String(order._id));
      });
    });

    const commissionRate = 0.22;
    const rows = Object.values(map)
      .map((row) => ({
        brand: row.brand,
        sales: row.sales,
        qty: row.qty,
        orderCount: row.orderIds.size,
        commission: Math.round(row.sales * commissionRate),
        settlement: Math.round(row.sales * (1 - commissionRate)),
      }))
      .sort((a, b) => b.sales - a.sales);

    const totals = rows.reduce(
      (acc, row) => {
        acc.sales += row.sales;
        acc.settlement += row.settlement;
        acc.commission += row.commission;
        return acc;
      },
      { sales: 0, settlement: 0, commission: 0 }
    );

    res.status(200).json({
      success: true,
      commissionRate,
      totals,
      rows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getInventory,
  getSettlement,
};
