import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProduct, getProducts } from "../api/catalog";
import { getProductReviews } from "../api/reviews";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import {
  COLOR_SWATCHES,
  SIZE_OPTIONS,
  formatPrice,
  getMainImage,
  getProductImages,
  salePrice,
  stockFor,
  uniqueColors,
  uniqueSizes,
} from "../utils/productDisplay";

const accordionItems = [
  {
    id: "material",
    title: "소재 및 관리",
    body: "상품 설명과 케어 라벨을 참고해 주세요. 울·혼방 소재는 드라이클리닝을 권장합니다.",
  },
  {
    id: "size",
    title: "사이즈 상세",
    body: "모델 착용 컷과 실측은 브랜드 가이드를 기준으로 합니다. 사이즈 가이드에서 상세 치수를 확인해 주세요.",
  },
  {
    id: "shipping",
    title: "배송",
    body: "평일 기준 출고 후 1–3일 내 수령 가능합니다. 5만원 이상 주문 시 무료 배송됩니다.",
  },
  {
    id: "return",
    title: "교환 및 반품",
    body: "수령 후 30일 이내 미착용·택 부착 상태에 한해 교환·반품이 가능합니다.",
  },
];

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { addItem } = useCart();
  const { isWished, toggle } = useWishlist();
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [openAccordion, setOpenAccordion] = useState("material");
  const [cartMessage, setCartMessage] = useState("");
  const [reviewSummary, setReviewSummary] = useState({ avgRating: 0, count: 0 });
  const [productReviews, setProductReviews] = useState([]);
  const wished = product ? isWished(product._id) : false;

  const handleToggleWish = async () => {
    if (!product) return;
    if (!isLoggedIn) {
      navigate("/login", {
        state: { from: `/products/${product._id}` },
      });
      return;
    }
    try {
      const next = await toggle(product._id);
      setCartMessage(next ? "위시리스트에 추가했습니다." : "위시리스트에서 제거했습니다.");
    } catch (err) {
      setCartMessage(err.message || "위시리스트 변경에 실패했습니다.");
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setCartMessage("");
      try {
        const data = await getProduct(id);
        if (cancelled) return;

        const nextProduct = data.product;
        const nextVariants = data.variants || [];
        setProduct(nextProduct);
        setVariants(nextVariants);

        const colors = uniqueColors(nextVariants);
        const firstColor = colors[0] || "";
        setColor(firstColor);

        const sizesForColor = uniqueSizes(
          nextVariants.filter((item) => item.color === firstColor)
        );
        const firstAvailable =
          sizesForColor.find(
            (item) => stockFor(nextVariants, firstColor, item) > 0
          ) ||
          sizesForColor[0] ||
          "";
        setSize(firstAvailable);
        setQty(1);
        setActiveImage(0);

        if (nextProduct?.category) {
          const relatedData = await getProducts({
            category: nextProduct.category,
            limit: 4,
            page: 1,
          });
          if (!cancelled) {
            setRelated(
              (relatedData.products || []).filter(
                (item) => item._id !== nextProduct._id
              )
            );
          }
        }

        try {
          const reviewData = await getProductReviews(id);
          if (!cancelled) {
            setReviewSummary(reviewData.summary || { avgRating: 0, count: 0 });
            setProductReviews(reviewData.reviews || []);
          }
        } catch {
          if (!cancelled) {
            setReviewSummary({ avgRating: 0, count: 0 });
            setProductReviews([]);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const images = useMemo(() => getProductImages(product), [product]);
  const colors = useMemo(() => uniqueColors(variants), [variants]);
  const sizes = useMemo(() => {
    const list = uniqueSizes(variants.filter((item) => item.color === color));
    return list.length > 0 ? list : SIZE_OPTIONS;
  }, [variants, color]);

  const unitPrice = product ? salePrice(product) : 0;
  const maxStock = stockFor(variants, color, size);
  const total = unitPrice * qty;
  const installment = Math.round(unitPrice / 3);

  const metaLine = [
    product?.brand?.name,
    product?.category ? product.category.toUpperCase() : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const handleColor = (nextColor) => {
    setColor(nextColor);
    const nextSizes = uniqueSizes(
      variants.filter((item) => item.color === nextColor)
    );
    const available =
      nextSizes.find((item) => stockFor(variants, nextColor, item) > 0) ||
      nextSizes[0] ||
      "";
    setSize(available);
    setQty(1);
  };

  const handleAddCart = async () => {
    if (!isLoggedIn) {
      navigate("/login", {
        state: { from: `/products/${id}` },
      });
      return;
    }
    if (!color || !size) {
      setCartMessage("컬러와 사이즈를 선택해 주세요.");
      return;
    }
    if (maxStock <= 0) {
      setCartMessage("선택한 옵션은 품절입니다.");
      return;
    }

    const variant = variants.find(
      (item) => item.color === color && item.size === size
    );
    if (!variant?._id) {
      setCartMessage("상품 옵션을 찾을 수 없습니다.");
      return;
    }

    try {
      await addItem({
        productId: product._id,
        variantId: variant._id,
        brandName: product.brand?.name || "ODEUM",
        productName: product.name,
        color,
        size,
        price: unitPrice,
        image: getMainImage(product),
        stock: maxStock,
        quantity: qty,
      });
      setCartMessage("장바구니에 담았습니다.");
    } catch (err) {
      setCartMessage(err.message || "장바구니 담기에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <main className="pdp-page">
        <p className="products-empty">상품을 불러오는 중...</p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="pdp-page">
        <p className="auth-error">{error || "상품을 찾을 수 없습니다."}</p>
        <Link to="/products" className="pdp-back">
          상품 목록으로
        </Link>
      </main>
    );
  }

  const mainSrc = images[activeImage]?.url || getMainImage(product);

  return (
    <main className="pdp-page">
      <div className="pdp-inner">
        <section className="pdp-top">
          <div className="pdp-gallery">
            <div className="pdp-thumbs">
              {(images.length > 0 ? images : [{ url: "" }]).map((img, index) => (
                <button
                  key={`${img.type || "img"}-${index}`}
                  type="button"
                  className={`pdp-thumb ${
                    activeImage === index ? "is-active" : ""
                  }`}
                  onClick={() => setActiveImage(index)}
                  style={
                    img.url
                      ? { backgroundImage: `url(${img.url})` }
                      : undefined
                  }
                  aria-label={`이미지 ${index + 1}`}
                />
              ))}
            </div>
            <div
              className={`pdp-main-image ${mainSrc ? "has-image" : ""}`}
              style={
                mainSrc ? { backgroundImage: `url(${mainSrc})` } : undefined
              }
            />
          </div>

          <div className="pdp-info">
            <p className="pdp-meta">{metaLine || "ODEUM"}</p>
            <h1>{product.name}</h1>
            <div className="pdp-price-block">
              <strong>{formatPrice(unitPrice)}</strong>
              <span>무이자 3개월 {formatPrice(installment)}</span>
            </div>
            <p className="pdp-desc">
              {product.description ||
                "실루엣과 소재감을 살린 ODEUM 셀렉션입니다. 컬러와 사이즈를 선택해 담아 보세요."}
            </p>

            <div className="pdp-option">
              <div className="pdp-option-head">
                <span>컬러</span>
                <strong>{color || "-"}</strong>
              </div>
              <div className="pdp-color-row">
                {colors.length === 0 ? (
                  <p className="pdp-option-empty">등록된 컬러가 없습니다.</p>
                ) : (
                  colors.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`pdp-color ${color === item ? "is-active" : ""}`}
                      style={{ background: COLOR_SWATCHES[item] || "#bbb" }}
                      onClick={() => handleColor(item)}
                      aria-label={item}
                      title={item}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="pdp-option">
              <div className="pdp-option-head">
                <span>사이즈</span>
                <button type="button" className="pdp-guide">
                  사이즈 가이드
                </button>
              </div>
              <div className="pdp-size-row">
                {sizes.map((item) => {
                  const stock = stockFor(variants, color, item);
                  const disabled = stock <= 0;
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={disabled}
                      className={size === item ? "is-active" : ""}
                      onClick={() => {
                        setSize(item);
                        setQty(1);
                      }}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pdp-qty-row">
              <div className="pdp-qty">
                <button
                  type="button"
                  onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                >
                  -
                </button>
                <span>{qty}</span>
                <button
                  type="button"
                  onClick={() =>
                    setQty((prev) =>
                      Math.min(Math.max(maxStock, 1), prev + 1)
                    )
                  }
                  disabled={maxStock > 0 ? qty >= maxStock : true}
                >
                  +
                </button>
              </div>
              <p className="pdp-total">합계 {formatPrice(total)}</p>
            </div>

            <div className="pdp-actions">
              <button
                type="button"
                className="pdp-cart"
                onClick={handleAddCart}
                disabled={maxStock <= 0}
              >
                {maxStock <= 0 ? "품절" : "장바구니 담기"}
              </button>
              <button
                type="button"
                className={`pdp-heart${wished ? " is-active" : ""}`}
                aria-label="위시리스트"
                onClick={handleToggleWish}
              >
                {wished ? "♥" : "♡"}
              </button>
            </div>
            {cartMessage && <p className="pdp-cart-msg">{cartMessage}</p>}

            <div className="pdp-accordions">
              {accordionItems.map((item, index) => {
                const open = openAccordion === item.id;
                const body =
                  item.id === "material" && product.description
                    ? product.description
                    : item.body;
                return (
                  <div key={item.id} className="pdp-acc">
                    <button
                      type="button"
                      className="pdp-acc-trigger"
                      onClick={() =>
                        setOpenAccordion(open ? "" : item.id)
                      }
                    >
                      <span>{item.title}</span>
                      <span>{open ? "−" : "+"}</span>
                    </button>
                    {open && <p className="pdp-acc-body">{body}</p>}
                    {index === 0 && open && product.shippingOrigin ? (
                      <p className="pdp-acc-body muted">
                        출고지: {product.shippingOrigin}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pdp-reviews">
          <div className="pdp-reviews-head">
            <h2>리뷰</h2>
            <p>
              {reviewSummary.count > 0
                ? `★ ${reviewSummary.avgRating} · ${reviewSummary.count}개`
                : "아직 리뷰가 없습니다."}
            </p>
          </div>
          {productReviews.length > 0 ? (
            <ul className="pdp-review-list">
              {productReviews.slice(0, 8).map((review) => (
                <li key={review._id}>
                  <div className="pdp-review-meta">
                    <strong>
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </strong>
                    <span>
                      {review.userName} ·{" "}
                      {review.type === "photo" ? "포토" : "텍스트"} ·{" "}
                      {new Date(review.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <p>{review.content}</p>
                  {review.images?.length ? (
                    <div className="review-photos">
                      {review.images.map((url) => (
                        <img key={url} src={url} alt="" />
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="pdp-related">
          <h2>함께 보면 좋은</h2>
          {related.length === 0 ? (
            <p className="products-empty">추천 상품이 아직 없습니다.</p>
          ) : (
            <div className="pdp-related-grid">
              {related.map((item) => {
                const thumb = getMainImage(item);
                return (
                  <Link
                    key={item._id}
                    to={`/products/${item._id}`}
                    className="pdp-related-card"
                  >
                    <div
                      className={`pdp-related-thumb ${thumb ? "has-image" : ""}`}
                      style={
                        thumb
                          ? { backgroundImage: `url(${thumb})` }
                          : undefined
                      }
                    />
                    <p>{item.brand?.name || "ODEUM"}</p>
                    <h3>{item.name}</h3>
                    <strong>{formatPrice(salePrice(item))}</strong>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default ProductDetail;
