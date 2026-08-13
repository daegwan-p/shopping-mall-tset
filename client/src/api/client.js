import { getToken } from "../utils/authStorage";

const API_URL = String(import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

let onUnauthorized = null;

export function setOnUnauthorized(handler) {
  onUnauthorized = handler;
}

function joinUrl(path) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (API_URL.endsWith("/api") && suffix.startsWith("/api/")) {
    return `${API_URL}${suffix.slice(4)}`;
  }
  return `${API_URL}${suffix}`;
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function request(path, options = {}) {
  const { headers, ...rest } = options;

  const response = await fetch(joinUrl(path), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : {};

  if (response.status === 401 && !path.includes("/auth/login") && !path.includes("/auth/register")) {
    onUnauthorized?.();
  }

  if (!response.ok) {
    throw new Error(data.message || "요청에 실패했습니다.");
  }

  if (!contentType.includes("application/json")) {
    throw new Error("서버 응답이 올바르지 않습니다. API 주소를 확인해 주세요.");
  }

  return data;
}
