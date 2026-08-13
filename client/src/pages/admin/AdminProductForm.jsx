import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createProduct,
  getBrands,
  getProduct,
  updateProduct,
} from "../../api/catalog";
import { openCloudinaryWidget } from "../../utils/cloudinary";
import { previewProductSku, previewVariantSku } from "../../utils/sku";

const categories = ["아우터", "상의", "셔츠", "니트", "팬츠", "액세서리"];
const discounts = ["없음", "10%", "20%", "30%"];
const colorOptions = [
  "블랙",
  "화이트",
  "네이비",
  "그레이",
  "베이지",
  "브라운",
  "카키",
  "레드",
  "블루",
  "그린",
  "에크루",
  "아이보리",
];
const sizes = ["XS", "S", "M", "L", "XL"];
const imageSlots = [
  { type: "main", label: "대표컷" },
  { type: "front", label: "정면" },
  { type: "back", label: "후면" },
  { type: "detail", label: "디테일" },
  { type: "wear", label: "착용" },
];

const emptySizeRow = () =>
  Object.fromEntries(sizes.map((size) => [size, 0]));

const emptyImages = () =>
  Object.fromEntries(imageSlots.map((slot) => [slot.type, ""]));

function AdminProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState("");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("없음");
  const [origin, setOrigin] = useState("");
  const [commission, setCommission] = useState("");
  const [selectedColors, setSelectedColors] = useState([]);
  const [stock, setStock] = useState({});
  const [images, setImages] = useState(emptyImages);
  const [uploadingType, setUploadingType] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [missingFields, setMissingFields] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError("");
      try {
        const brandData = await getBrands();
        if (cancelled) return;
        const list = brandData.brands || [];
        setBrands(list);

        if (isEdit) {
          setLoading(true);
          const data = await getProduct(id);
          if (cancelled) return;

          const product = data.product;
          const variants = data.variants || [];
          const brandValue =
            typeof product.brand === "object"
              ? product.brand?._id
              : product.brand;

          setBrandId(brandValue || "");
          setCategory(product.category || "");
          setName(product.name || "");
          setSku(product.sku || "");
          setDescription(product.description || "");
          setPrice(String(product.price ?? ""));
          setDiscount(
            product.discountRate ? `${product.discountRate}%` : "없음"
          );
          setOrigin(product.shippingOrigin || "");
          setCommission(
            product.commissionRate === null ||
              product.commissionRate === undefined
              ? ""
              : String(product.commissionRate)
          );

          const nextImages = emptyImages();
          (product.images || []).forEach((img) => {
            if (img?.type && img.url) nextImages[img.type] = img.url;
          });
          setImages(nextImages);

          const colors = [];
          const nextStock = {};
          variants.forEach((variant) => {
            if (!colors.includes(variant.color)) {
              colors.push(variant.color);
              nextStock[variant.color] = emptySizeRow();
            }
            nextStock[variant.color][variant.size] = variant.stock ?? 0;
          });
          setSelectedColors(colors);
          setStock(nextStock);
        } else if (list.length > 0) {
          setBrandId(list[0]._id);
          setCommission(String(list[0].commissionRate ?? 22));
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
  }, [id, isEdit]);

  const selectedBrand = brands.find((item) => item._id === brandId);
  const skuPreview = useMemo(
    () =>
      previewProductSku({
        brandName: selectedBrand?.name,
        brandSlug: selectedBrand?.slug,
        category,
        customSku: sku,
      }),
    [selectedBrand, category, sku]
  );

  const variantSkuPreviews = useMemo(() => {
    const rows = [];
    selectedColors.forEach((color) => {
      sizes.forEach((size) => {
        const qty = Number(stock[color]?.[size] || 0);
        if (qty > 0) {
          rows.push({
            color,
            size,
            stock: qty,
            sku: previewVariantSku({
              productSku: skuPreview,
              color,
              size,
            }),
          });
        }
      });
    });
    return rows;
  }, [selectedColors, stock, skuPreview]);

  const allColorChoices = useMemo(() => {
    const extras = selectedColors.filter((color) => !colorOptions.includes(color));
    return [...colorOptions, ...extras];
  }, [selectedColors]);

  const totalStock = useMemo(
    () =>
      selectedColors.reduce((sum, color) => {
        const row = stock[color] || {};
        return sum + sizes.reduce((a, size) => a + Number(row[size] || 0), 0);
      }, 0),
    [selectedColors, stock]
  );

  const numericPrice = Number(String(price).replace(/,/g, "")) || 0;
  const discountRate =
    discount === "없음" ? 0 : Number(discount.replace("%", ""));
  const salePrice = Math.round(numericPrice * (1 - discountRate / 100));
  const settlement = Math.round(
    salePrice * (1 - Number(commission || 0) / 100)
  );

  const toggleColor = (color) => {
    setSelectedColors((prev) => {
      if (prev.includes(color)) {
        setStock((current) => {
          const next = { ...current };
          delete next[color];
          return next;
        });
        return prev.filter((item) => item !== color);
      }

      setStock((current) => ({
        ...current,
        [color]: current[color] || emptySizeRow(),
      }));
      return [...prev, color];
    });
  };

  const addCustomColor = () => {
    const value = customColor.trim();
    if (!value) return;
    if (!selectedColors.includes(value)) {
      setSelectedColors((prev) => [...prev, value]);
      setStock((current) => ({
        ...current,
        [value]: current[value] || emptySizeRow(),
      }));
    }
    setCustomColor("");
  };

  const updateStock = (color, size, value) => {
    setStock((prev) => ({
      ...prev,
      [color]: {
        ...(prev[color] || emptySizeRow()),
        [size]: Number(value) || 0,
      },
    }));
    if (Number(value) > 0) {
      setMissingFields((prev) =>
        prev.filter((key) => key !== "stock" && key !== "colors")
      );
    }
  };

  const buildVariants = () => {
    const variants = [];
    selectedColors.forEach((color) => {
      sizes.forEach((size) => {
        const qty = Number(stock[color]?.[size] || 0);
        if (qty > 0) {
          variants.push({ color, size, stock: qty });
        }
      });
    });
    return variants;
  };

  const buildImages = () =>
    imageSlots
      .filter((slot) => images[slot.type])
      .map((slot, index) => ({
        url: images[slot.type],
        type: slot.type,
        order: index,
      }));

  const handleUploadImage = async (type) => {
    setError("");
    setUploadingType(type);
    try {
      const result = await openCloudinaryWidget();
      setImages((prev) => ({ ...prev, [type]: result.url }));
      if (type === "main") {
        setMissingFields((prev) => prev.filter((key) => key !== "mainImage"));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingType("");
    }
  };

  const handleRemoveImage = (type) => {
    setImages((prev) => ({ ...prev, [type]: "" }));
  };

  const getMissingRequired = (status) => {
    const missing = [];

    if (!brandId) missing.push({ key: "brand", label: "브랜드" });
    if (!category) missing.push({ key: "category", label: "카테고리" });
    if (!name.trim()) missing.push({ key: "name", label: "상품명" });
    if (!price || numericPrice <= 0) {
      missing.push({ key: "price", label: "판매가" });
    }

    if (status === "published") {
      if (!images.main) {
        missing.push({ key: "mainImage", label: "대표컷 이미지" });
      }
      if (selectedColors.length === 0) {
        missing.push({ key: "colors", label: "색상" });
      } else if (buildVariants().length === 0) {
        missing.push({ key: "stock", label: "사이즈별 재고" });
      }
    }

    return missing;
  };

  const isMissing = (key) => missingFields.includes(key);

  const checklist = useMemo(() => {
    const hasStock = selectedColors.some((color) =>
      sizes.some((size) => Number(stock[color]?.[size] || 0) > 0)
    );

    return [
      {
        key: "basics",
        label: "브랜드·카테고리·상품명·가격 입력",
        done: Boolean(brandId && category && name.trim() && numericPrice > 0),
      },
      {
        key: "description",
        label: "상품 설명 작성 (선택)",
        done: Boolean(description.trim()),
      },
      {
        key: "stock",
        label: "색상 선택 후 재고 입력",
        done: hasStock,
      },
      {
        key: "mainImage",
        label: "대표 이미지 업로드",
        done: Boolean(images.main),
      },
    ];
  }, [
    brandId,
    category,
    name,
    numericPrice,
    description,
    selectedColors,
    stock,
    images.main,
  ]);

  const handleSubmit = async (status) => {
    setError("");
    setMessage("");

    const missing = getMissingRequired(status);
    if (missing.length > 0) {
      setMissingFields(missing.map((item) => item.key));
      const labels = missing.map((item) => item.label).join(", ");
      setError(`다음 필수 항목이 비어 있습니다: ${labels}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setMissingFields([]);
    setSaving(true);
    try {
      const payload = {
        brand: brandId,
        category,
        name: name.trim(),
        sku: sku.trim() || undefined,
        description: description.trim(),
        price: numericPrice,
        discountRate,
        shippingOrigin: origin,
        commissionRate: commission === "" ? null : Number(commission),
        status,
        images: buildImages(),
        variants: buildVariants(),
      };

      if (isEdit) {
        await updateProduct(id, payload);
        setMessage(
          status === "draft" ? "임시저장되었습니다." : "상품이 수정되었습니다."
        );
      } else {
        await createProduct(payload);
        setMessage(
          status === "draft" ? "임시저장되었습니다." : "상품이 등록되었습니다."
        );
      }
      navigate("/admin/products");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-inner product-form-page">
        <p className="admin-sub">상품 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="admin-page-inner product-form-page">
      <div className="admin-page-head">
        <div>
          <p className="admin-breadcrumb">
            <Link to="/admin/products">상품 관리</Link> /{" "}
            {isEdit ? "상품 수정" : "상품 등록"}
          </p>
          <h1>{isEdit ? "상품 수정" : "상품 등록"}</h1>
          <p className="admin-sub">
            {isEdit
              ? "정보를 수정한 뒤 저장하세요."
              : "필수 정보를 입력한 뒤 등록하세요."}
          </p>
        </div>
        <div className="admin-head-actions">
          <button
            type="button"
            className="admin-btn-outline"
            disabled={saving}
            onClick={() => handleSubmit("draft")}
          >
            임시저장
          </button>
          <button
            type="button"
            className="admin-btn-dark"
            disabled={saving}
            onClick={() => handleSubmit("published")}
          >
            {saving
              ? "저장 중..."
              : isEdit
                ? "수정 저장"
                : "상품 등록"}
          </button>
        </div>
      </div>

      {error && <p className="admin-form-error">{error}</p>}
      {message && <p className="admin-form-success">{message}</p>}

      {brands.length === 0 && (
        <div className="admin-card" style={{ marginBottom: 12 }}>
          <p>
            등록된 브랜드가 없습니다.{" "}
            <Link to="/admin/brands">브랜드 메뉴</Link>에서 먼저 브랜드를
            만들어 주세요.
          </p>
        </div>
      )}

      <div className="product-form-grid">
        <div className="product-form-main">
          <section className="admin-card">
            <h2>기본 정보</h2>

            <div
              className={`field-block ${isMissing("brand") ? "is-invalid" : ""}`}
            >
              <p className="field-label">
                브랜드 <span className="required-mark">*</span>
              </p>
              <div className="chip-row">
                {brands.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    className={brandId === item._id ? "is-active" : ""}
                    onClick={() => {
                      setBrandId(item._id);
                      setCommission(String(item.commissionRate ?? 22));
                      setMissingFields((prev) =>
                        prev.filter((key) => key !== "brand")
                      );
                    }}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              {isMissing("brand") && (
                <p className="field-error-text">브랜드를 선택해 주세요.</p>
              )}
            </div>

            <div
              className={`field-block ${isMissing("category") ? "is-invalid" : ""}`}
            >
              <p className="field-label">
                카테고리 <span className="required-mark">*</span>
              </p>
              <div className="chip-row">
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={category === item ? "is-active" : ""}
                    onClick={() => {
                      setCategory(item);
                      setMissingFields((prev) =>
                        prev.filter((key) => key !== "category")
                      );
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {isMissing("category") && (
                <p className="field-error-text">카테고리를 선택해 주세요.</p>
              )}
            </div>

            <label
              className={`field-block ${isMissing("name") ? "is-invalid" : ""}`}
            >
              <span className="field-label">
                상품명 <span className="required-mark">*</span>
              </span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value.trim()) {
                    setMissingFields((prev) =>
                      prev.filter((key) => key !== "name")
                    );
                  }
                }}
                placeholder="상품명을 입력하세요"
              />
              {isMissing("name") && (
                <p className="field-error-text">상품명을 입력해 주세요.</p>
              )}
            </label>

            <label className="field-block">
              <span className="field-label">상품 SKU</span>
              <input
                value={sku}
                onChange={(e) =>
                  setSku(e.target.value.toUpperCase().replace(/\s+/g, "-"))
                }
                placeholder="비우면 자동 생성"
              />
              <p className="field-hint">
                미리보기: <code>{skuPreview}</code>
                {!sku.trim() &&
                  (isEdit
                    ? " (SKU가 없으면 저장 시 한 번만 자동 생성됩니다)"
                    : " (저장 시 **** 부분이 랜덤 코드로 채워집니다)")}
                {isEdit && sku.trim()
                  ? " · 이미 있는 SKU는 수정해도 유지됩니다"
                  : ""}
              </p>
            </label>

            <label className="field-block">
              <span className="field-label">상품 설명</span>
              <textarea
                className="admin-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="상품을 간략히 설명해 주세요 (선택)"
                rows={3}
              />
            </label>

            <div className="field-inline">
              <label
                className={`field-block ${isMissing("price") ? "is-invalid" : ""}`}
              >
                <span className="field-label">
                  판매가 <span className="required-mark">*</span>
                </span>
                <input
                  value={price ? Number(price).toLocaleString("ko-KR") : ""}
                  onChange={(e) => {
                    const next = e.target.value.replace(/[^0-9]/g, "");
                    setPrice(next);
                    if (Number(next) > 0) {
                      setMissingFields((prev) =>
                        prev.filter((key) => key !== "price")
                      );
                    }
                  }}
                  placeholder="0"
                />
                {isMissing("price") && (
                  <p className="field-error-text">판매가를 입력해 주세요.</p>
                )}
              </label>

              <div className="field-block">
                <p className="field-label">할인율</p>
                <div className="chip-row">
                  {discounts.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={discount === item ? "is-active" : ""}
                      onClick={() => setDiscount(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section
            className={`admin-card ${isMissing("mainImage") ? "is-invalid-section" : ""}`}
          >
            <h2>
              상품 이미지{" "}
              <span className="required-mark" style={{ fontSize: 14 }}>
                *
              </span>
            </h2>
            <p className="admin-sub">
              Cloudinary 위젯으로 업로드 · 1:1 권장 · 최대 5장(슬롯별 1장) ·
              대표컷 필수
            </p>
            {isMissing("mainImage") && (
              <p className="field-error-text">대표컷 이미지를 업로드해 주세요.</p>
            )}
            <div className="image-slots">
              {imageSlots.map((slot) => {
                const url = images[slot.type];
                const isUploading = uploadingType === slot.type;
                const slotInvalid =
                  slot.type === "main" && isMissing("mainImage") && !url;

                return (
                  <div
                    key={slot.type}
                    className={`image-slot ${url ? "has-image" : ""} ${
                      slotInvalid ? "is-invalid" : ""
                    }`}
                  >
                    {url ? (
                      <>
                        <img src={url} alt={slot.label} />
                        <div className="image-slot-actions">
                          <button
                            type="button"
                            onClick={() => handleUploadImage(slot.type)}
                            disabled={Boolean(uploadingType)}
                          >
                            교체
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(slot.type)}
                            disabled={Boolean(uploadingType)}
                          >
                            삭제
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="image-slot-upload"
                        onClick={() => handleUploadImage(slot.type)}
                        disabled={Boolean(uploadingType)}
                      >
                        <span>
                          {slot.label}
                          {slot.type === "main" ? " *" : ""}
                        </span>
                        <small>{isUploading ? "업로드 중..." : "업로드"}</small>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section
            className={`admin-card ${
              isMissing("colors") || isMissing("stock")
                ? "is-invalid-section"
                : ""
            }`}
          >
            <div className="admin-card-head">
              <h2>
                옵션·재고{" "}
                <span className="required-mark" style={{ fontSize: 14 }}>
                  *
                </span>
              </h2>
              <strong>총 재고 {totalStock}</strong>
            </div>

            <div
              className={`field-block ${
                isMissing("colors") || isMissing("stock") ? "is-invalid" : ""
              }`}
              style={{ marginTop: 0 }}
            >
              <p className="field-label">색상 선택</p>
              <div className="chip-row">
                {allColorChoices.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={selectedColors.includes(color) ? "is-active" : ""}
                    onClick={() => {
                      toggleColor(color);
                      setMissingFields((prev) =>
                        prev.filter((key) => key !== "colors" && key !== "stock")
                      );
                    }}
                  >
                    {color}
                  </button>
                ))}
              </div>
              {isMissing("colors") && (
                <p className="field-error-text">색상을 하나 이상 선택해 주세요.</p>
              )}
              {isMissing("stock") && (
                <p className="field-error-text">
                  선택한 색상의 사이즈별 재고를 1개 이상 입력해 주세요.
                </p>
              )}
              <div className="color-add-row">
                <input
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="직접 입력 (예: 올리브)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomColor();
                    }
                  }}
                />
                <button
                  type="button"
                  className="admin-btn-outline"
                  onClick={addCustomColor}
                >
                  색상 추가
                </button>
              </div>
            </div>

            {selectedColors.length === 0 ? (
              <div className="admin-empty-block">
                색상을 선택하면 사이즈별 재고 표가 나타납니다.
              </div>
            ) : (
              <div className="stock-table-wrap">
                <table className="admin-table stock-table">
                  <thead>
                    <tr>
                      <th>색상 / 사이즈</th>
                      {sizes.map((size) => (
                        <th key={size}>{size}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedColors.map((color) => (
                      <tr key={color}>
                        <td>{color}</td>
                        {sizes.map((size) => (
                          <td key={size}>
                            <input
                              type="number"
                              min="0"
                              value={stock[color]?.[size] ?? 0}
                              onChange={(e) =>
                                updateStock(color, size, e.target.value)
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {variantSkuPreviews.length > 0 && (
              <div className="variant-sku-list">
                <p className="field-label">옵션 SKU 미리보기</p>
                <ul>
                  {variantSkuPreviews.map((row) => (
                    <li key={`${row.color}-${row.size}`}>
                      <span>
                        {row.color} / {row.size} · 재고 {row.stock}
                      </span>
                      <code>{row.sku}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="admin-card">
            <h2>배송·정산</h2>
            <div className="field-inline">
              <label className="field-block">
                <span className="field-label">출고지</span>
                <input
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="출고지 입력"
                />
              </label>
              <label className="field-block">
                <span className="field-label">브랜드 수수료 (%)</span>
                <input
                  value={commission}
                  onChange={(e) =>
                    setCommission(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="0"
                />
              </label>
              <div className="field-block">
                <span className="field-label">정산 예정액</span>
                <p className="settlement-value">
                  {settlement.toLocaleString("ko-KR")}원
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="product-form-side">
          <section className="admin-card">
            <h2>고객 화면 미리보기</h2>
            <div className="product-preview">
              <div
                className="preview-thumb"
                style={
                  images.main
                    ? {
                        backgroundImage: `url(${images.main})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              />
              <p className="preview-brand">
                {selectedBrand?.name || "브랜드"}
              </p>
              <p className="preview-name">{name || "상품명"}</p>
              <p className="preview-sku">SKU {skuPreview}</p>
              <p className="preview-desc">
                {description || "상품 설명이 여기에 표시됩니다."}
              </p>
              <p className="preview-price">
                {salePrice.toLocaleString("ko-KR")}원
              </p>
              <p className="preview-sizes">
                {selectedColors.length > 0
                  ? `색상 ${selectedColors.join(" · ")}`
                  : "색상 미선택"}
              </p>
            </div>
          </section>

          <section className="admin-card">
            <h2>등록 전 체크</h2>
            <ul className="checklist">
              {checklist.map((item) => (
                <li
                  key={item.key}
                  className={item.done ? "is-done" : "is-pending"}
                >
                  <span className="checklist-mark">
                    {item.done ? "✓" : "·"}
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default AdminProductForm;
