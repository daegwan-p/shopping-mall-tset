const CART_KEY = "odeum_cart_v1";

export function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function makeCartKey({ productId, color, size }) {
  return `${productId}__${color || ""}__${size || ""}`;
}
