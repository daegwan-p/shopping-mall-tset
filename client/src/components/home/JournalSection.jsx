import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../api/catalog";
import { getMainImage } from "../../utils/productDisplay";

/** Editorial fallback — men's minimal wardrobe (Unsplash) */
const JOURNAL_FALLBACK =
  "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1400&q=80";

export function JournalSection() {
  const [image, setImage] = useState(JOURNAL_FALLBACK);

  useEffect(() => {
    let cancelled = false;
    getProducts({ page: 1, limit: 12, category: "아우터" })
      .then((data) => {
        if (cancelled) return;
        const list = data.products || [];
        const withImage = list.find((item) => getMainImage(item));
        if (withImage) setImage(getMainImage(withImage));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="journal">
      <div
        className="journal-media"
        style={{ backgroundImage: `url(${image})` }}
        role="img"
        aria-label="시즌 캡슐 코디 이미지"
      />
      <div className="journal-copy">
        <p className="journal-label">JOURNAL</p>
        <h2>여섯 벌로 한 계절을 나는 법</h2>
        <p>
          최소한의 피스만으로도 충분히 완성되는 옷장을 위해,
          ODEUM이 제안하는 시즌 캡슐 코디를 소개합니다.
        </p>
        <Link to="/products" className="journal-link">
          읽어보기
        </Link>
      </div>
    </section>
  );
}
