function parsePagination(query = {}, { defaultLimit = 10, maxLimit = 50 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  let limit = Number.parseInt(query.limit, 10) || defaultLimit;
  limit = Math.min(maxLimit, Math.max(1, limit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildPagination(total, page, limit) {
  const safeTotal = Number(total) || 0;
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit) || 1);
  const currentPage = Math.min(Math.max(1, page), totalPages);

  return {
    page: currentPage,
    limit,
    total: safeTotal,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
}

module.exports = {
  parsePagination,
  buildPagination,
};
