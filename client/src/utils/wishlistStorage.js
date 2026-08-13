const WISH_KEY = "odeum_wishlist_v1";

export function loadWishlistIds() {
  try {
    const raw = localStorage.getItem(WISH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function saveWishlistIds(ids) {
  localStorage.setItem(WISH_KEY, JSON.stringify([...new Set(ids.map(String))]));
}
