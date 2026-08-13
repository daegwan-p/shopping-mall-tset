import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../api/catalog";
import { getImageByType } from "../../utils/productDisplay";

export function HeroSection() {
  const [heroImage, setHeroImage] = useState("");
  const [heroProductId, setHeroProductId] = useState("");

  useEffect(() => {
    let cancelled = false;

    getProducts({ page: 1, limit: 8 })
      .then((data) => {
        if (cancelled) return;
        const list = data.products || [];
        const withWear = list.find((item) =>
          (item.images || []).some((img) => img.type === "wear" && img.url)
        );
        const featured = withWear || list.find((item) => getImageByType(item, "main"));
        if (!featured) return;
        setHeroImage(
          getImageByType(featured, "wear", ["main", "front", "detail"])
        );
        setHeroProductId(featured._id);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className={`hero ${heroImage ? "has-image" : ""}`}
      style={
        heroImage
          ? {
              backgroundImage: `linear-gradient(90deg, rgba(247,245,240,0.92) 0%, rgba(247,245,240,0.72) 42%, rgba(247,245,240,0.2) 100%), url(${heroImage})`,
            }
          : undefined
      }
    >
      <div className="hero-content">
        <p className="hero-eyebrow">ODEUM COLLECTION</p>
        <h1 className="hero-brand">ODEUM</h1>
        <p className="hero-headline">덜어낼수록 오래 입는다</p>
        <p className="hero-text">
          유행을 쫓기보다, 실루엣과 소재에 집중한 시즌리스 웨어.
          한 벌이 여러 계절을 이어가도록 설계했습니다.
        </p>
        {heroProductId ? (
          <Link to={`/products/${heroProductId}`} className="hero-cta">
            컬렉션 보기
          </Link>
        ) : (
          <a href="#new" className="hero-cta">
            컬렉션 보기
          </a>
        )}
      </div>
    </section>
  );
}
