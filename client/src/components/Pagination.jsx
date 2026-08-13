function getPageWindow(page, totalPages, windowSize = 5) {
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, page - half);
  let end = start + windowSize - 1;

  if (end > totalPages) {
    end = totalPages;
    start = end - windowSize + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function Pagination({
  page = 1,
  totalPages = 1,
  onChange,
  className = "pagination",
}) {
  if (totalPages <= 1) return null;

  const pages = getPageWindow(page, totalPages);

  return (
    <div className={className} role="navigation" aria-label="페이지">
      {pages.map((num) => (
        <button
          key={num}
          type="button"
          className={num === page ? "is-active" : ""}
          onClick={() => onChange(num)}
        >
          {num}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="다음 페이지"
      >
        →
      </button>
    </div>
  );
}

export default Pagination;
