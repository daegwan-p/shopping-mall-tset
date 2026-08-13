import { authHeaders, request } from "./client";

export function getBrands() {
  return request("/brands", { headers: authHeaders() });
}

export function createBrand(payload) {
  return request("/brands", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export function updateBrand(id, payload) {
  return request(`/brands/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export function deleteBrand(id) {
  return request(`/brands/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export function getProducts(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== ""
    )
  );
  const query = new URLSearchParams(cleaned).toString();
  return request(`/products${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });
}

export function getProduct(id) {
  return request(`/products/${id}`, {
    headers: authHeaders(),
  });
}

export function createProduct(payload) {
  return request("/products", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id, payload) {
  return request(`/products/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id) {
  return request(`/products/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}
