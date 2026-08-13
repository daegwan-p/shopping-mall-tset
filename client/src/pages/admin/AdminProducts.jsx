import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteProduct, getProducts } from "../../api/catalog";
import Pagination from "../../components/Pagination";
import {
  getMainImage,
  productStatusLabel,
} from "../../utils/productDisplay";

const PAGE_SIZE = 10;

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState({ q: "", brand: "", category: "" });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
      };
      if (applied.q) params.q = applied.q;
      if (applied.brand) params.brand = applied.brand;
      if (applied.category) params.category = applied.category;

      const data = await getProducts(params);
      setProducts(data.products || []);
      setPagination(
        data.pagination || {
          page: 1,
          limit: PAGE_SIZE,
          total: data.products?.length || 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied({
      q: q.trim(),
      brand: brand.trim(),
      category: category.trim(),
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("이 상품을 삭제할까요?")) return;
    try {
      await deleteProduct(id);
      if (products.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await loadProducts();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page-inner">
      <div className="admin-page-head">
        <div>
          <h1>상품 관리</h1>
          <p className="admin-sub">
            전체 {pagination.total}개 · {pagination.page}/{pagination.totalPages}{" "}
            페이지
          </p>
        </div>
        <Link to="/admin/products/new" className="admin-btn-dark">
          상품 등록
        </Link>
      </div>

      <form className="admin-filters admin-card" onSubmit={handleSearch}>
        <label>
          상품명 / SKU
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="상품명 또는 SKU 검색"
          />
        </label>
        <label>
          브랜드 ID
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="브랜드 ObjectId (선택)"
          />
        </label>
        <label>
          카테고리
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="예: 아우터"
          />
        </label>
        <button type="submit" className="admin-btn-dark">
          검색
        </button>
      </form>

      {error && <p className="admin-form-error">{error}</p>}

      <div className="admin-card table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>상품</th>
              <th>SKU</th>
              <th>브랜드</th>
              <th>카테고리</th>
              <th>판매가</th>
              <th>재고</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="admin-empty-cell">
                  불러오는 중...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-empty-cell">
                  등록된 상품이 없습니다. 상단의 상품 등록으로 추가하세요.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const thumb = getMainImage(product);
                return (
                  <tr key={product._id}>
                    <td>
                      <div className="product-cell">
                        <div
                          className={`product-list-thumb ${
                            thumb ? "" : "is-empty"
                          }`}
                          style={
                            thumb
                              ? {
                                  backgroundImage: `url(${thumb})`,
                                }
                              : undefined
                          }
                          aria-hidden={!thumb}
                        />
                        <div>
                          <strong>{product.name}</strong>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="sku-code">{product.sku || "-"}</code>
                    </td>
                    <td>{product.brand?.name || "-"}</td>
                    <td>{product.category}</td>
                    <td>{Number(product.price).toLocaleString("ko-KR")}원</td>
                    <td>{product.totalStock ?? 0}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          product.status === "published" ? "ok" : "muted"
                        }`}
                      >
                        {productStatusLabel(product.status)}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <Link
                          to={`/admin/products/${product._id}/edit`}
                          className="admin-btn-outline"
                        >
                          수정
                        </Link>
                        <button
                          type="button"
                          className="admin-btn-outline"
                          onClick={() => handleDelete(product._id)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <Pagination
          className="admin-pagination"
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={setPage}
        />
      </div>
    </div>
  );
}

export default AdminProducts;
