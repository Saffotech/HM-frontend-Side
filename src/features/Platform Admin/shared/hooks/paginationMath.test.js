import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { paginate, shouldShowPagination, visiblePageNumbers } from "./paginationMath.js";

describe("client-side pagination", () => {
  it("hides controls when the filtered records fit on one page", () => {
    assert.equal(shouldShowPagination(0, 10), false);
    assert.equal(shouldShowPagination(1, 10), false);
    assert.equal(shouldShowPagination(10, 10), false);
    assert.equal(shouldShowPagination(11, 10), true);
    assert.equal(shouldShowPagination(8, 8), false);
    assert.equal(shouldShowPagination(9, 8), true);
  });

  it("slices only the current page and clamps a stale page", () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1);
    assert.deepEqual(paginate([], 3, 10), {
      page: 1,
      pageSize: 10,
      totalPages: 1,
      total: 0,
      from: 0,
      to: 0,
      rows: [],
    });
    assert.deepEqual(paginate(items.slice(0, 10), 4, 10).rows, items.slice(0, 10));
    assert.equal(paginate(items.slice(0, 10), 4, 10).page, 1);
    assert.deepEqual(paginate(items.slice(0, 11), 1, 10).rows, items.slice(0, 10));
    assert.deepEqual(paginate(items.slice(0, 11), 2, 10).rows, [11]);
    const clamped = paginate(items, 9, 10);
    assert.equal(clamped.page, 3);
    assert.equal(clamped.totalPages, 3);
    assert.deepEqual(clamped.rows, [21, 22, 23, 24, 25]);
    assert.equal(clamped.from, 21);
    assert.equal(clamped.to, 25);
  });

  it("shows at most five page numbers and shifts the window at the ends", () => {
    assert.deepEqual(visiblePageNumbers(1, 1), []);
    assert.deepEqual(visiblePageNumbers(1, 3), [1, 2, 3]);
    assert.deepEqual(visiblePageNumbers(1, 10), [1, 2, 3, 4, 5]);
    assert.deepEqual(visiblePageNumbers(4, 10), [2, 3, 4, 5, 6]);
    assert.deepEqual(visiblePageNumbers(6, 10), [4, 5, 6, 7, 8]);
    assert.deepEqual(visiblePageNumbers(10, 10), [6, 7, 8, 9, 10]);
  });
});
