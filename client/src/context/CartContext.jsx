import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  addCartItem as apiAddCartItem,
  clearServerCart,
  getCart,
  removeCartItem as apiRemoveCartItem,
  removeCartSelected,
  setCartAllSelected,
  updateCartItem as apiUpdateCartItem,
} from "../api/cart";
import { useAuth } from "./AuthContext";
import { makeCartKey, saveCart } from "../utils/cartStorage";

const CartContext = createContext(null);
export const FREE_SHIPPING_THRESHOLD = 100000;

const loginRequiredError = () => {
  const error = new Error("로그인이 필요합니다.");
  error.code = "LOGIN_REQUIRED";
  return error;
};

export function CartProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(!isLoggedIn);

  const applyServerItems = useCallback((next) => {
    setItems(Array.isArray(next) ? next : []);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncCart() {
      if (!isLoggedIn) {
        if (!cancelled) {
          setItems([]);
          saveCart([]);
          setReady(true);
        }
        return;
      }

      setReady(false);
      try {
        const data = await getCart();
        if (!cancelled) applyServerItems(data.items);
      } catch {
        if (!cancelled) applyServerItems([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    syncCart();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, applyServerItems]);

  const findByKey = useCallback(
    (key) => items.find((item) => item.key === key),
    [items]
  );

  const addItem = useCallback(
    async (payload) => {
      if (!isLoggedIn) throw loginRequiredError();
      if (!payload.variantId) {
        throw new Error("상품 옵션 정보가 필요합니다.");
      }
      const data = await apiAddCartItem({
        productId: payload.productId,
        variantId: payload.variantId,
        quantity: payload.quantity || 1,
        brandName: payload.brandName || "",
        productName: payload.productName || "",
        color: payload.color || "",
        size: payload.size || "",
        price: Number(payload.price) || 0,
        image: payload.image || "",
      });
      applyServerItems(data.items);
      return makeCartKey(payload);
    },
    [applyServerItems, isLoggedIn]
  );

  const updateQuantity = useCallback(
    async (key, quantity) => {
      if (!isLoggedIn) throw loginRequiredError();
      const target = findByKey(key);
      if (!target?._id) return;
      const qty = Math.max(1, Number(quantity) || 1);
      const data = await apiUpdateCartItem(target._id, { quantity: qty });
      applyServerItems(data.items);
    },
    [applyServerItems, findByKey, isLoggedIn]
  );

  const toggleSelected = useCallback(
    async (key) => {
      if (!isLoggedIn) throw loginRequiredError();
      const target = findByKey(key);
      if (!target?._id) return;
      const data = await apiUpdateCartItem(target._id, {
        selected: !target.selected,
      });
      applyServerItems(data.items);
    },
    [applyServerItems, findByKey, isLoggedIn]
  );

  const setAllSelected = useCallback(
    async (selected) => {
      if (!isLoggedIn) throw loginRequiredError();
      const data = await setCartAllSelected(selected);
      applyServerItems(data.items);
    },
    [applyServerItems, isLoggedIn]
  );

  const removeItem = useCallback(
    async (key) => {
      if (!isLoggedIn) throw loginRequiredError();
      const target = findByKey(key);
      if (!target?._id) return;
      const data = await apiRemoveCartItem(target._id);
      applyServerItems(data.items);
    },
    [applyServerItems, findByKey, isLoggedIn]
  );

  const removeSelected = useCallback(async () => {
    if (!isLoggedIn) throw loginRequiredError();
    const data = await removeCartSelected();
    applyServerItems(data.items);
  }, [applyServerItems, isLoggedIn]);

  const clearCart = useCallback(async () => {
    if (!isLoggedIn) throw loginRequiredError();
    const data = await clearServerCart();
    applyServerItems(data.items);
  }, [applyServerItems, isLoggedIn]);

  const clearSelected = useCallback(async () => {
    if (!isLoggedIn) throw loginRequiredError();
    const data = await removeCartSelected();
    applyServerItems(data.items);
  }, [applyServerItems, isLoggedIn]);

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn) {
      setItems([]);
      return;
    }
    const data = await getCart();
    applyServerItems(data.items);
  }, [applyServerItems, isLoggedIn]);

  const selectedItems = useMemo(
    () => items.filter((item) => item.selected),
    [items]
  );

  const totalCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const selectedCount = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.quantity, 0),
    [selectedItems]
  );

  const productAmount = useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
    [selectedItems]
  );

  const value = useMemo(
    () => ({
      items,
      ready,
      selectedItems,
      totalCount,
      selectedCount,
      productAmount,
      addItem,
      updateQuantity,
      toggleSelected,
      setAllSelected,
      removeItem,
      removeSelected,
      clearCart,
      clearSelected,
      refreshCart,
    }),
    [
      items,
      ready,
      selectedItems,
      totalCount,
      selectedCount,
      productAmount,
      addItem,
      updateQuantity,
      toggleSelected,
      setAllSelected,
      removeItem,
      removeSelected,
      clearCart,
      clearSelected,
      refreshCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
