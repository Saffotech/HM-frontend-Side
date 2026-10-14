import Button from "./Button";
import "./Pagination.css";

function windowPages(page, total) {
  const size = 5;
  let start = Math.max(1, page - 2);
  const end = Math.min(total, start + size - 1);
  start = Math.max(1, end - size + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function Pagination({ page, totalPages, total, from, to, onPageChange }) {
  if (total === 0) return null;
  return (
    <div className="pagination">
      <span className="muted">Showing {from}–{to} of {total}</span>
      <div className="pagination-pages">
        <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
        {windowPages(page, totalPages).map((number) => (
          <Button key={number} variant="secondary" size="sm" className={number === page ? "page-active" : ""} onClick={() => onPageChange(number)}>
            {number}
          </Button>
        ))}
        <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
