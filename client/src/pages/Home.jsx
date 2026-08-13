import { useEffect, useState } from "react";
import { getBrands } from "../api/catalog";
import { HeroSection } from "../components/home/HeroSection";
import { JournalSection } from "../components/home/JournalSection";
import { ProductGrid } from "../components/home/ProductGrid";

function Home() {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    getBrands()
      .then((data) => setBrands(data.brands || []))
      .catch(() => setBrands([]));
  }, []);

  return (
    <div className="home">
      <HeroSection />

      {brands.length > 0 ? (
        <section className="brand-row" aria-label="브랜드">
          {brands.map((brand) => (
            <span key={brand._id || brand.name}>{brand.name}</span>
          ))}
        </section>
      ) : null}

      <section className="service-row">
        <article>
          <h3>전 상품 무료 배송</h3>
          <p>5만원 이상 주문 시 전국 무료</p>
        </article>
        <article>
          <h3>무료 수선</h3>
          <p>기장·품 수선 1회 무료 제공</p>
        </article>
        <article>
          <h3>30일 반품</h3>
          <p>수령 후 30일 이내 교환·반품</p>
        </article>
      </section>

      <ProductGrid />
      <JournalSection />
    </div>
  );
}

export default Home;
