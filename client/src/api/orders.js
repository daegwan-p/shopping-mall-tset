import { authHeaders, request } from "./client";

export function getOrders(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== undefined && value !== ""
      )
    )
  ).toString();

  return request(`/orders${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
}

export function getOrder(id) {
  return request(`/orders/${id}`, {
    headers: authHeaders(),
  });
}

export function createOrder(payload) {
  return request("/orders", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export function updateOrder(id, payload) {
  return request(`/orders/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export function cancelOrder(id) {
  return request(`/orders/${id}/cancel`, {
    method: "POST",
    headers: authHeaders(),
  });
}

export function deleteOrder(id) {
  return request(`/orders/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export function cleanupTestOrders(statuses) {
  return request("/orders/cleanup", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      statuses: statuses || ["cancelled", "pending_payment"],
    }),
  });
}

export function confirmPayment(payload) {
  return request("/payments/confirm", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}
