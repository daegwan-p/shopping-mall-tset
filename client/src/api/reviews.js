import { authHeaders, request } from "./client";

export function getMyReviews(tab = "available") {
  return request(`/reviews/mine?tab=${encodeURIComponent(tab)}`, {
    headers: authHeaders(),
  });
}

export function createReview(payload) {
  return request("/reviews", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export function getProductReviews(productId) {
  return request(`/reviews/product/${productId}`);
}
