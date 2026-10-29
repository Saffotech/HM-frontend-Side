import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { shouldShowPagination, visiblePageNumbers } from "../hooks/paginationMath";
import "./Pagination.css";

export default function Pagination({ page, totalPages, total, pageSize, onPageChange }) {
  if (!shouldShowPagination(total, pageSize) || totalPages <= 1) return null;

  const pages = visiblePageNumbers(page, totalPages, 5);
  const go = (next) => {
    const target = Math.min(Math.max(1, next), totalPages);
    if (target !== page) onPageChange(target);
  };

  return (
    <nav className="pagination" aria-label={`Pagination, page ${page} of ${totalPages}`}>
      <div className="pagination-pages" role="group" aria-label="Page navigation">
        <button
          type="button"
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => go(1)}
          aria-label="First page"
          title="First page"
        >
          <ChevronsLeft size={16} aria-hidden="true" />
        </button>
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            className={`pagination-btn${number === page ? " is-active" : ""}`}
            onClick={() => go(number)}
            aria-label={`Page ${number}`}
            aria-current={number === page ? "page" : undefined}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => go(totalPages)}
          aria-label="Last page"
          title="Last page"
        >
          <ChevronsRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
