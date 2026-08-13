import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getWishlist,
  removeWishlistItem as apiRemove,
  toggleWishlistItem as apiToggle,
} from "../api/wishlist";
import { useAuth } from "./AuthContext";
import { saveWishlistIds } from "../utils/wishlistStorage";

const WishlistContext = createContext(null);

const loginRequiredError = () => {
  const error = new Error("로그인이 필요합니다.");
  error.code = "LOGIN_REQUIRED";
  return error;
};

export function WishlistProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [productIds, setProductIds] = useState([]);
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(!isLoggedIn);

  const applyIds = useCallback((ids) => {
    setProductIds([...new Set((ids || []).map(String))]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (!isLoggedIn) {
        if (!cancelled) {
          setProductIds([]);
          setItems([]);
          saveWishlistIds([]);
          setReady(true);
        }
        return;
      }

      setReady(false);
      try {
        const data = await getWishlist();
        if (!cancelled) {
          applyIds(data.productIds);
          setItems(data.items || []);
        }
      } catch {
        if (!cancelled) {
          applyIds([]);
          setItems([]);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    sync();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, applyIds]);

  const isWished = useCallback(
    (productId) => productIds.includes(String(productId)),
    [productIds]
  );

  const toggle = useCallback(
    async (productId) => {
      if (!isLoggedIn) throw loginRequiredError();
      const id = String(productId);
      if (!id) return false;
      const data = await apiToggle(id);
      applyIds(data.productIds);
      setItems(data.items || []);
      return Boolean(data.wished);
    },
    [applyIds, isLoggedIn]
  );

  const remove = useCallback(
    async (productId) => {
      if (!isLoggedIn) throw loginRequiredError();
      const data = await apiRemove(String(productId));
      applyIds(data.productIds);
      setItems(data.items || []);
    },
    [applyIds, isLoggedIn]
  );

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setProductIds([]);
      setItems([]);
      return;
    }
    const data = await getWishlist();
    applyIds(data.productIds);
    setItems(data.items || []);
  }, [applyIds, isLoggedIn]);

  const value = useMemo(
    () => ({
      ready,
      productIds,
      items,
      count: productIds.length,
      isWished,
      toggle,
      remove,
      refresh,
    }),
    [ready, productIds, items, isWished, toggle, remove, refresh]
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return context;
}
