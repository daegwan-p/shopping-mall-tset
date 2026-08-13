const Order = require("../models/Order");
const Review = require("../models/Review");
const {
  REVIEW_REWARD_POINTS,
  REVIEW_WINDOW_DAYS,
} = require("../utils/rewardsConstants");
const { creditPoints } = require("../utils/points");

const msDay = 24 * 60 * 60 * 1000;

function daysLeft(fromDate) {
  const end = new Date(fromDate).getTime() + REVIEW_WINDOW_DAYS * msDay;
  return Math.ceil((end - Date.now()) / msDay);
}

function serializeReview(review) {
  return {
    _id: review._id,
    type: review.type,
    rating: review.rating,
    content: review.content,
    images: review.images || [],
    status: review.status,
    rewardGranted: review.rewardGranted,
    createdAt: review.createdAt,
    userName: review.user?.name
      ? `${review.user.name.slice(0, 1)}**`
      : "회원",
    product: review.product,
    order: review.order,
    orderItem: review.orderItem,
  };
}

const getMyReviews = async (req, res, next) => {
  try {
    const tab = req.query.tab || "available";

    if (tab === "written") {
      const reviews = await Review.find({ user: req.user._id })
        .populate({
          path: "product",
          select: "name images brand discountRate price totalStock",
          populate: { path: "brand", select: "name" },
        })
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        tab: "written",
        reviews: reviews.map(serializeReview),
        counts: await getCounts(req.user._id),
      });
    }

    const reviewedItemIds = new Set(
      (
        await Review.find({ user: req.user._id }).select("orderItem")
      ).map((item) => String(item.orderItem))
    );

    const orders = await Order.find({
      user: req.user._id,
      status: "delivered",
    }).sort({ updatedAt: -1 });

    const available = [];
    for (const order of orders) {
      const deliveredAt = order.deliveredAt || order.shippedAt || order.updatedAt || order.createdAt;
      const left = daysLeft(deliveredAt);
      if (left < 0) continue;

      for (const item of order.items || []) {
        if (reviewedItemIds.has(String(item._id))) continue;
        available.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          orderItemId: item._id,
          productId: item.product,
          brandName: item.brandName,
          productName: item.productName,
          color: item.color,
          size: item.size,
          image: item.image,
          deliveredAt,
          daysLeft: left,
          rewardPoints: REVIEW_REWARD_POINTS,
        });
      }
    }

    res.status(200).json({
      success: true,
      tab: "available",
      available,
      counts: await getCounts(req.user._id, available.length),
    });
  } catch (error) {
    next(error);
  }
};

async function getCounts(userId, availableOverride) {
  const written = await Review.countDocuments({ user: userId });
  if (typeof availableOverride === "number") {
    return { available: availableOverride, written };
  }

  const reviewedItemIds = new Set(
    (await Review.find({ user: userId }).select("orderItem")).map((item) =>
      String(item.orderItem)
    )
  );
  const orders = await Order.find({ user: userId, status: "delivered" });
  let available = 0;
  for (const order of orders) {
    const deliveredAt = order.deliveredAt || order.shippedAt || order.updatedAt || order.createdAt;
    if (daysLeft(deliveredAt) < 0) continue;
    for (const item of order.items || []) {
      if (!reviewedItemIds.has(String(item._id))) available += 1;
    }
  }
  return { available, written };
}

const createReview = async (req, res, next) => {
  try {
    const {
      orderId,
      orderItemId,
      rating,
      content,
      type = "text",
      images = [],
    } = req.body;

    if (!orderId || !orderItemId || !rating || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "orderId, orderItemId, rating, content는 필수입니다.",
      });
    }

    const reviewType = type === "photo" ? "photo" : "text";
    const imageList = Array.isArray(images)
      ? images.filter(Boolean).slice(0, 5)
      : [];

    if (reviewType === "photo" && imageList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "포토 리뷰는 사진이 1장 이상 필요합니다.",
      });
    }

    const score = Number(rating);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: "별점은 1–5 사이여야 합니다.",
      });
    }

    const order = await Order.findById(orderId);
    if (!order || order.user?.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: "주문을 찾을 수 없습니다.",
      });
    }
    if (order.status !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "배송이 완료된 상품만 리뷰할 수 있습니다.",
      });
    }

    const deliveredAt = order.deliveredAt || order.shippedAt || order.updatedAt || order.createdAt;
    if (daysLeft(deliveredAt) < 0) {
      return res.status(400).json({
        success: false,
        message: "리뷰 작성 기간이 지났습니다.",
      });
    }

    const orderItem = (order.items || []).id(orderItemId);
    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: "주문 상품을 찾을 수 없습니다.",
      });
    }
    if (!orderItem.product) {
      return res.status(400).json({
        success: false,
        message: "상품 정보가 없는 주문입니다.",
      });
    }

    const exists = await Review.findOne({
      user: req.user._id,
      orderItem: orderItemId,
    });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "이미 작성한 리뷰입니다.",
      });
    }

    const review = await Review.create({
      user: req.user._id,
      order: order._id,
      orderItem: orderItem._id,
      product: orderItem.product,
      type: reviewType,
      rating: score,
      content: content.trim(),
      images: reviewType === "photo" ? imageList : [],
      rewardGranted: false,
    });

    await creditPoints(req.user._id, REVIEW_REWARD_POINTS, {
      type: "review_earn",
      note: "리뷰 작성 적립",
      refReview: review._id,
    });
    review.rewardGranted = true;
    await review.save();

    res.status(201).json({
      success: true,
      review: serializeReview(review),
      rewardPoints: REVIEW_REWARD_POINTS,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "이미 작성한 리뷰입니다.",
      });
    }
    next(error);
  }
};

const getProductReviews = async (req, res, next) => {
  try {
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 상품입니다.",
      });
    }

    const productId = new mongoose.Types.ObjectId(req.params.productId);
    const reviews = await Review.find({
      product: productId,
      status: "visible",
    })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    const agg = await Review.aggregate([
      { $match: { product: productId, status: "visible" } },
      {
        $group: {
          _id: "$product",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = agg[0]
      ? {
          avgRating: Math.round(agg[0].avgRating * 10) / 10,
          count: agg[0].count,
        }
      : { avgRating: 0, count: 0 };

    res.status(200).json({
      success: true,
      summary,
      reviews: reviews.map(serializeReview),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyReviews,
  createReview,
  getProductReviews,
};
