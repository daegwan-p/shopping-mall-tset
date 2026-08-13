import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import AdminLayout from "./components/admin/AdminLayout";
import Footer from "./components/Footer";
import Header from "./components/Header";
import MyPageLayout from "./components/mypage/MyPageLayout";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminSettlement from "./pages/admin/AdminSettlement";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminCoupons from "./pages/admin/AdminCoupons";
import Auth from "./pages/Auth";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Home from "./pages/Home";
import MyOrderDetail from "./pages/mypage/MyOrderDetail";
import MyOrders from "./pages/mypage/MyOrders";
import MyProfile from "./pages/mypage/MyProfile";
import MyRewards from "./pages/mypage/MyRewards";
import MyReviews from "./pages/mypage/MyReviews";
import MyShipping from "./pages/mypage/MyShipping";
import MyWishlist from "./pages/mypage/MyWishlist";
import OrderComplete from "./pages/OrderComplete";
import OrderFailed from "./pages/OrderFailed";
import ProductDetail from "./pages/ProductDetail";
import Products from "./pages/Products";
import "./App.css";

function StoreShell() {
  return (
    <div className="app-shell">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}

function AuthShell() {
  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
          <Routes>
            <Route element={<StoreShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route
                path="/cart"
                element={
                  <RequireAuth>
                    <Cart />
                  </RequireAuth>
                }
              />
              <Route
                path="/checkout"
                element={
                  <RequireAuth>
                    <Checkout />
                  </RequireAuth>
                }
              />
              <Route
                path="/order-complete/:id"
                element={
                  <RequireAuth>
                    <OrderComplete />
                  </RequireAuth>
                }
              />
              <Route
                path="/order-failed"
                element={
                  <RequireAuth>
                    <OrderFailed />
                  </RequireAuth>
                }
              />
              <Route path="/mypage" element={<MyPageLayout />}>
                <Route index element={<Navigate to="orders" replace />} />
                <Route path="orders" element={<MyOrders />} />
                <Route path="orders/:id" element={<MyOrderDetail />} />
                <Route path="shipping" element={<MyShipping />} />
                <Route path="wishlist" element={<MyWishlist />} />
                <Route path="rewards" element={<MyRewards />} />
                <Route path="reviews" element={<MyReviews />} />
                <Route path="profile" element={<MyProfile />} />
              </Route>
              <Route path="/profile" element={<Navigate to="/mypage/profile" replace />} />
            </Route>

            <Route element={<AuthShell />}>
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
            </Route>

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/new" element={<AdminProductForm />} />
              <Route path="products/:id/edit" element={<AdminProductForm />} />
              <Route path="brands" element={<AdminBrands />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="settlement" element={<AdminSettlement />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
