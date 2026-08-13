import { authHeaders, request } from "./client";

export function getRewards() {
  return request("/rewards", { headers: authHeaders() });
}

export function redeemCoupon(code) {
  return request("/rewards/coupons/redeem", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ code }),
  });
}

export function getAdminCoupons() {
  return request("/coupons", { headers: authHeaders() });
}

export function createAdminCoupon(payload) {
  return request("/coupons", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export function updateAdminCoupon(id, payload) {
  return request(`/coupons/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export function deleteAdminCoupon(id) {
  return request(`/coupons/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}
