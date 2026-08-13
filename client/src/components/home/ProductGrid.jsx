import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../api/catalog";
import {
  formatPrice,
  getMainImage,
  salePrice,
} from "../../utils/productDisplay";

const HOME_LIMIT = 8;

export function ProductGrid() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getProducts({ page: 1, limit: HOME_LIMIT })
      .then((data) => {
        if (!cancelled) setProducts(data.products || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="arrivals" id="new">
      <div className="section-head">
        <h2>이번 주 입고</h2>
        <Link to="/products">전체 보기</Link>
      </div>

      {loading && <p className="products-empty">상품을 불러오는 중...</p>}
      {error && <p className="auth-error">{error}</p>}
      {!loading && !error && products.length === 0 && (
        <p className="products-empty">등록된 판매 상품이 없습니다.</p>
      )}

      {!loading && products.length > 0 && (
        <div className="product-grid">
          {products.map((product) => {
            const thumb = getMainImage(product);
            return (
              <article key={product._id} className="product-item">
                <Link to={`/products/${product._id}`} className="home-product-link">
                  <div
                    className={`product-thumb ${thumb ? "has-image" : ""}`}
                    style={
                      thumb
                        ? {
                            backgroundImage: `url(${thumb})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                    aria-hidden="true"
                  />
                  <p className="product-brand">
                    {product.brand?.name || "ODEUM"}
                  </p>
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-price">
                    {formatPrice(salePrice(product))}
                  </p>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
