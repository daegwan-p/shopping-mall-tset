import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getBrands, getProducts } from "../api/catalog";
import Pagination from "../components/Pagination";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import {
  COLOR_SWATCHES,
  SIZE_OPTIONS,
  formatPrice,
  getMainImage,
  salePrice,
  uniqueColors,
  uniqueSizes,
} from "../utils/productDisplay";

const PAGE_SIZE = 12;
const PRICE_MAX = 500000;

const sortOptions = [
  { value: "newest", label: "신상품" },
  { value: "popular", label: "인기" },
  { value: "price_asc", label: "낮은 가격" },
  { value: "price_desc", label: "높은 가격" },
];

const colorFilters = [
  "블랙",
  "화이트",
  "네이비",
  "그레이",
  "차콜",
  "베이지",
  "브라운",
  "블루",
  "레드",
  "그린",
  "에크루",
  "아이보리",
];

function Products() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { isWished, toggle } = useWishlist();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") || "";
  const page = Number(searchParams.get("page") || 1);
  const sort = searchParams.get("sort") || "newest";
  const brand = searchParams.get("brand") || "";
  const size = searchParams.get("size") || "";
  const color = searchParams.get("color") || "";
  const q = searchParams.get("q") || "";
  const maxPrice = Number(searchParams.get("maxPrice") || PRICE_MAX);

  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [priceDraft, setPriceDraft] = useState(maxPrice);

  useEffect(() => {
    setPriceDraft(maxPrice);
  }, [maxPrice]);

  useEffect(() => {
    getBrands()
      .then((data) => setBrands(data.brands || []))
      .catch(() => setBrands([]));
  }, []);

  const title = q ? `"${q}" 검색` : category || "전체 상품";

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: Math.max(1, page),
        limit: PAGE_SIZE,
        sort: sort === "newest" ? undefined : sort,
      };
      if (category) params.category = category;
      if (brand) params.brand = brand;
      if (size) params.size = size;
      if (color) params.color = color;
      if (q) params.q = q;
      if (maxPrice < PRICE_MAX) params.maxPrice = maxPrice;

      const data = await getProducts(params);
      setProducts(data.products || []);
      setPagination(
        data.pagination || {
          page: 1,
          total: data.products?.length || 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, category, sort, brand, size, color, q, maxPrice]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const updateParams = (next, { resetPage = true } = {}) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      const empty =
        value === undefined ||
        value === null ||
        value === "" ||
        value === "전체" ||
        (key === "page" && (value === 1 || value === "1")) ||
        (key === "sort" && value === "newest") ||
        (key === "maxPrice" && Number(value) >= PRICE_MAX);

      if (empty) params.delete(key);
      else params.set(key, String(value));
    });
    if (resetPage && next.page === undefined) params.delete("page");
    setSearchParams(params);
  };

  const toggleFilter = (key, value) => {
    updateParams({ [key]: searchParams.get(key) === value ? "" : value });
  };

  const handlePage = (nextPage) => {
    updateParams({ page: nextPage }, { resetPage: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const breadcrumbCategory = useMemo(
    () => (q ? `"${q}"` : category || "전체"),
    [category, q]
  );

  return (
    <main className="plp-page">
      <div className="plp-inner">
        <aside className="plp-sidebar">
          <section className="plp-filter-block">
            <h2>브랜드</h2>
            <div className="plp-chip-row">
              {brands.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className={brand === item._id ? "is-active" : ""}
                  onClick={() => toggleFilter("brand", item._id)}
                >
                  {item.name}
                </button>
              ))}
              {brands.length === 0 && (
                <p className="plp-filter-empty">등록된 브랜드가 없습니다.</p>
              )}
            </div>
          </section>

          <section className="plp-filter-block">
            <h2>사이즈</h2>
            <div className="plp-chip-row">
              {SIZE_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={size === item ? "is-active" : ""}
                  onClick={() => toggleFilter("size", item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <section className="plp-filter-block">
            <h2>컬러</h2>
            <div className="plp-chip-row">
              {colorFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={color === item ? "is-active" : ""}
                  onClick={() => toggleFilter("color", item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <section className="plp-filter-block">
            <h2>가격</h2>
            <div className="plp-price">
              <input
                type="range"
                min="0"
                max={PRICE_MAX}
                step="100"
                value={priceDraft}
                onChange={(e) => setPriceDraft(Number(e.target.value))}
                onMouseUp={() => updateParams({ maxPrice: priceDraft })}
                onTouchEnd={() => updateParams({ maxPrice: priceDraft })}
              />
              <div className="plp-price-labels">
                <span>0원</span>
                <span>{formatPrice(priceDraft)} 이하</span>
              </div>
            </div>
          </section>
        </aside>

        <section className="plp-main">
          <div className="plp-head">
            <div>
              <p className="plp-breadcrumb">
                <Link to="/">홈</Link>
                <span> / </span>
                <span>{breadcrumbCategory}</span>
              </p>
              <div className="plp-title-row">
                <h1>{title}</h1>
                <span>{pagination.total}개 상품</span>
              </div>
            </div>

            <div className="plp-sort">
              {sortOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={sort === item.value ? "is-active" : ""}
                  onClick={() => updateParams({ sort: item.value })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          {loading ? (
            <p className="products-empty">상품을 불러오는 중...</p>
          ) : products.length === 0 ? (
            <p className="products-empty">조건에 맞는 상품이 없습니다.</p>
          ) : (
            <div className="plp-grid">
              {products.map((product) => {
                const thumb = getMainImage(product);
                const discounted = Number(product.discountRate) > 0;
                const soldOut = (product.totalStock ?? 0) <= 0;
                const colors = uniqueColors(product.variants);
                const sizes = uniqueSizes(product.variants);

                return (
                  <article key={product._id} className="plp-card">
                    <Link to={`/products/${product._id}`} className="plp-card-media">
                      {soldOut && <span className="plp-badge soldout">품절</span>}
                      {!soldOut && discounted && (
                        <span className="plp-badge sale">SALE</span>
                      )}
                      <button
                        type="button"
                        className={`plp-wish${
                          isWished(product._id) ? " is-active" : ""
                        }`}
                        aria-label="위시리스트"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isLoggedIn) {
                            navigate("/login", {
                              state: {
                                from: `/products${
                                  searchParams.toString()
                                    ? `?${searchParams.toString()}`
                                    : ""
                                }`,
                              },
                            });
                            return;
                          }
                          try {
                            await toggle(product._id);
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        {isWished(product._id) ? "♥" : "♡"}
                      </button>
                      <div
                        className={`plp-thumb ${thumb ? "has-image" : ""}`}
                        style={
                          thumb
                            ? {
                                backgroundImage: `url(${thumb})`,
                              }
                            : undefined
                        }
                      />
                    </Link>

                    <div className="plp-card-body">
                      <p className="plp-brand">
                        {product.brand?.name || "ODEUM"}
                      </p>
                      <Link
                        to={`/products/${product._id}`}
                        className="plp-name"
                      >
                        {product.name}
                      </Link>
                      <p className="plp-price-row">
                        {discounted && (
                          <span className="plp-price-origin">
                            {formatPrice(product.price)}
                          </span>
                        )}
                        <span
                          className={
                            discounted ? "plp-price-sale" : "plp-price"
                          }
                        >
                          {formatPrice(salePrice(product))}
                        </span>
                      </p>
                      {colors.length > 0 && (
                        <div className="plp-swatches">
                          {colors.slice(0, 5).map((item) => (
                            <span
                              key={item}
                              title={item}
                              style={{
                                background: COLOR_SWATCHES[item] || "#ccc",
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {sizes.length > 0 && (
                        <p className="plp-sizes">{sizes.join(" ")}</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <Pagination
            className="store-pagination"
            page={pagination.page}
            totalPages={pagination.totalPages}
            onChange={handlePage}
          />
        </section>
      </div>
    </main>
  );
}

export default Products;
