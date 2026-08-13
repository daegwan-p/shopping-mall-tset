import { authHeaders, request } from "./client";

export function getAdminStats() {
  return request("/admin/stats", { headers: authHeaders() });
}

export function getAdminInventory(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== undefined && value !== ""
      )
    )
  ).toString();
  return request(`/admin/inventory${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
}

export function getAdminSettlement() {
  return request("/admin/settlement", { headers: authHeaders() });
}
