import { authHeaders, request } from "./client";

export function register({ email, password, name, phone }) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name, phone }),
  });
}

export function login({ email, password }) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getMe() {
  return request("/auth/me", {
    headers: authHeaders(),
  });
}

export function updateMe(payload) {
  return request("/users/me", {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}
