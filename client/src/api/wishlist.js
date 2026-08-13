import { authHeaders, request } from "./client";

export function getWishlist() {
  return request("/wishlist", { headers: authHeaders() });
}

export function getWishlistIds() {
  return request("/wishlist/ids", { headers: authHeaders() });
}

export function addWishlistItem(productId) {
  return request("/wishlist/items", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ productId }),
  });
}

export function removeWishlistItem(productId) {
  return request(`/wishlist/items/${productId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export function toggleWishlistItem(productId) {
  return request("/wishlist/toggle", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ productId }),
  });
}

export function mergeWishlist(productIds) {
  return request("/wishlist/merge", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ productIds }),
  });
}
