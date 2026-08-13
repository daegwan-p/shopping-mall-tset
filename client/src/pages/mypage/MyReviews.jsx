import { useCallback, useEffect, useState } from "react";
import { Button, Field, Textarea } from "../../components/ui";
import { createReview, getMyReviews } from "../../api/reviews";
import { openCloudinaryWidget } from "../../utils/cloudinary";
import { formatPrice, getMainImage } from "../../utils/productDisplay";

function stars(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function MyReviews() {
  const [tab, setTab] = useState("available");
  const [available, setAvailable] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({ available: 0, written: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [draft, setDraft] = useState(null);
  const [reviewType, setReviewType] = useState("text");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async (nextTab = tab) => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyReviews(nextTab);
      setCounts(data.counts || { available: 0, written: 0 });
      if (nextTab === "written") {
        setReviews(data.reviews || []);
      } else {
        setAvailable(data.available || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load(tab);
  }, [load, tab]);

  const openForm = (item) => {
    setDraft(item);
    setReviewType("text");
    setRating(5);
    setContent("");
    setImages([]);
    setMessage("");
    setError("");
  };

  const closeForm = () => {
    setDraft(null);
    setSaving(false);
  };

  const handleUpload = async () => {
    setUploading(true);
    setError("");
    try {
      const result = await openCloudinaryWidget();
      if (result?.url) {
        setImages((prev) => [...prev, result.url].slice(0, 5));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await createReview({
        orderId: draft.orderId,
        orderItemId: draft.orderItemId,
        type: reviewType,
        rating,
        content: content.trim(),
        images: reviewType === "photo" ? images : [],
      });
      setMessage(
        `리뷰가 등록되었습니다. 적립금 ${formatPrice(data.rewardPoints || 2000)}이 지급되었습니다.`
      );
      closeForm();
      await load("available");
      setTab("written");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h1>리뷰 관리</h1>
      <div className="auth-tabs" style={{ marginTop: 12 }}>
        <button
          type="button"
          className={tab === "available" ? "is-active" : ""}
          onClick={() => setTab("available")}
        >
          작성 가능 {counts.available}
        </button>
        <button
          type="button"
          className={tab === "written" ? "is-active" : ""}
          onClick={() => setTab("written")}
        >
          작성한 리뷰 {counts.written}
        </button>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="muted-note">{message}</p> : null}
      {loading ? <p className="products-empty">불러오는 중...</p> : null}

      {!loading && tab === "available" ? (
        available.length === 0 ? (
          <p className="products-empty">작성 가능한 리뷰가 없습니다.</p>
        ) : (
          <div className="review-list">
            {available.map((item) => (
              <article key={String(item.orderItemId)} className="review-card">
                <div
                  className="cart-thumb"
                  style={
                    item.image
                      ? { backgroundImage: `url(${item.image})` }
                      : undefined
                  }
                />
                <div>
                  <p className="cart-brand">{item.brandName}</p>
                  <p className="cart-name">{item.productName}</p>
                  <p className="muted-note">
                    {item.color} / {item.size} · {item.daysLeft}일 남음
                  </p>
                  <p className="urgent-text">
                    적립금 {formatPrice(item.rewardPoints)}
                  </p>
                </div>
                <Button size="sm" onClick={() => openForm(item)}>
                  리뷰 쓰기
                </Button>
              </article>
            ))}
          </div>
        )
      ) : null}

      {!loading && tab === "written" ? (
        reviews.length === 0 ? (
          <p className="products-empty">작성한 리뷰가 없습니다.</p>
        ) : (
          <div className="review-list">
            {reviews.map((review) => {
              const thumb = getMainImage(review.product);
              return (
                <article key={review._id} className="review-card">
                  <div
                    className="cart-thumb"
                    style={
                      thumb
                        ? { backgroundImage: `url(${thumb})` }
                        : undefined
                    }
                  />
                  <div>
                    <p className="cart-brand">
                      {review.product?.brand?.name || "ODEUM"}
                    </p>
                    <p className="cart-name">{review.product?.name}</p>
                    <p className="muted-note">
                      {stars(review.rating)} ·{" "}
                      {review.type === "photo" ? "포토 리뷰" : "텍스트 리뷰"}
                    </p>
                    <p>{review.content}</p>
                    {review.images?.length ? (
                      <div className="review-photos">
                        {review.images.map((url) => (
                          <img key={url} src={url} alt="" />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : null}

      {draft ? (
        <div className="review-modal-backdrop" onClick={closeForm}>
          <form
            className="review-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2>리뷰 작성</h2>
            <p className="muted-note">
              {draft.productName} · {draft.color}/{draft.size}
            </p>

            <div className="chip-tabs" style={{ marginBottom: 12 }}>
              <button
                type="button"
                className={reviewType === "text" ? "is-active" : ""}
                onClick={() => setReviewType("text")}
              >
                텍스트 + 별점
              </button>
              <button
                type="button"
                className={reviewType === "photo" ? "is-active" : ""}
                onClick={() => setReviewType("photo")}
              >
                사진 + 텍스트 + 별점
              </button>
            </div>

            <Field label="별점">
              <div className="review-rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={rating >= value ? "is-active" : ""}
                    onClick={() => setRating(value)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </Field>

            <Field label="내용">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={5}
                placeholder="상품은 어떠셨나요?"
              />
            </Field>

            {reviewType === "photo" ? (
              <div style={{ marginBottom: 12 }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={uploading || images.length >= 5}
                  onClick={handleUpload}
                >
                  {uploading ? "업로드 중..." : "사진 추가"}
                </Button>
                <div className="review-photos" style={{ marginTop: 8 }}>
                  {images.map((url) => (
                    <button
                      key={url}
                      type="button"
                      className="review-photo-remove"
                      onClick={() =>
                        setImages((prev) => prev.filter((item) => item !== url))
                      }
                      style={{ backgroundImage: `url(${url})` }}
                      aria-label="사진 제거"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 8 }}>
              <Button type="submit" disabled={saving}>
                {saving ? "등록 중..." : "등록"}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm}>
                취소
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

export default MyReviews;
