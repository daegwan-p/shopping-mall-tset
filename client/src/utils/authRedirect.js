const TRANSIENT_PREFIXES = [
  "/order-complete",
  "/order-failed",
  "/checkout",
  "/login",
  "/register",
];

export function isTransientAuthPath(path = "") {
  return TRANSIENT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

/** 로그인 후 이동 경로 (일회성 결제/완료 URL로는 돌아가지 않음) */
export function resolvePostLoginPath(from, user) {
  if (user?.role === "admin") {
    if (from && String(from).startsWith("/admin")) return from;
    return "/admin";
  }

  if (!from || typeof from !== "string" || isTransientAuthPath(from)) {
    return "/";
  }

  return from;
}
