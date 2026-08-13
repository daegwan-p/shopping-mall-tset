import { authHeaders, request } from "./client";

export function getCart() {
  return request("/cart", { headers: authHeaders() });
}

export function addCartItem(payload) {
  return request("/cart/items", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export function updateCartItem(itemId, payload) {
  return request(`/cart/items/${itemId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export function removeCartItem(itemId) {
  return request(`/cart/items/${itemId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export function setCartAllSelected(selected) {
  return request("/cart/select-all", {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ selected }),
  });
}

export function removeCartSelected() {
  return request("/cart/selected", {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export function clearServerCart() {
  return request("/cart", {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export function mergeCart(items) {
  return request("/cart/merge", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ items }),
  });
}
