import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProduct } from "../../api/catalog";
import { Button } from "../../components/ui";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import {
  formatPrice,
  getMainImage,
  salePrice,
} from "../../utils/productDisplay";

function MyWishlist() {
  const { items, ready, remove, refresh } = useWishlist();
  const { addItem } = useCart();
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const handleRemove = async (productId) => {
    setMessage("");
    try {
      await remove(productId);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleAddCart = async (product) => {
    setBusyId(product._id);
    setMessage("");
    try {
      const data = await getProduct(product._id);
      const variants = data.variants || [];
      const available = variants.find((item) => Number(item.stock) > 0);
      if (!available) {
        setMessage("담을 수 있는 재고가 없습니다. 상품 상세에서 확인해 주세요.");
        return;
      }
      await addItem({
        productId: product._id,
        variantId: available._id,
        brandName: product.brand?.name || "ODEUM",
        productName: product.name,
        color: available.color,
        size: available.size,
        price: salePrice(product),
        image: getMainImage(product),
        stock: available.stock,
        quantity: 1,
      });
      setMessage("장바구니에 담았습니다.");
    } catch (err) {
      setMessage(err.message || "장바구니 담기에 실패했습니다.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section>
      <h1>찜한 상품</h1>
      {message ? <p className="auth-error">{message}</p> : null}
      {!ready ? <p className="products-empty">불러오는 중...</p> : null}
      {ready && items.length === 0 ? (
        <p className="products-empty">찜한 상품이 없습니다.</p>
      ) : null}

      <div className="plp-grid" style={{ marginTop: 18 }}>
        {items.map((item) => {
          const product = item.product;
          if (!product) return null;
          const thumb = getMainImage(product);
          const soldOut = (product.totalStock ?? 0) <= 0;
          const onSale = Number(product.discountRate) > 0;

          return (
            <article key={item.productId || product._id} className="plp-card">
              <div className="plp-card-media">
                {soldOut ? (
                  <span className="plp-badge soldout">품절</span>
                ) : null}
                {!soldOut && onSale ? (
                  <span className="plp-badge sale">SALE</span>
                ) : null}
                <button
                  type="button"
                  className="plp-wish is-active"
                  aria-label="찜 해제"
                  onClick={() => handleRemove(product._id)}
                >
                  ♥
                </button>
                <Link to={`/products/${product._id}`}>
                  <div
                    className={`plp-thumb ${thumb ? "has-image" : ""}`}
                    style={
                      thumb
                        ? { backgroundImage: `url(${thumb})` }
                        : undefined
                    }
                  />
                </Link>
              </div>
              <div className="plp-card-body">
                <p className="plp-brand">{product.brand?.name || "ODEUM"}</p>
                <Link to={`/products/${product._id}`} className="plp-name">
                  {product.name}
                </Link>
                <p className="plp-price">{formatPrice(salePrice(product))}</p>
                {soldOut ? (
                  <Button variant="secondary" block size="sm" disabled>
                    품절
                  </Button>
                ) : (
                  <Button
                    block
                    size="sm"
                    disabled={busyId === product._id}
                    onClick={() => handleAddCart(product)}
                  >
                    {busyId === product._id ? "담는 중..." : "장바구니 담기"}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default MyWishlist;
