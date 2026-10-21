/**
 * SR-103: catalog pagination lives in ?page=N.
 * Only an integer N >= 2 without leading zeros is a real page; page 1 is the clean URL without the parameter.
 * server.ts applies the same rule and 301-redirects anything else (page=1, 0, -2, abc, 02) to the clean URL.
 */
const VALID_PAGE = /^[1-9]\d{0,8}$/;

/** 1-based page from the raw ?page value, or null when it is absent, page 1 or junk. */
export function parseCatalogPage(value: string | null | undefined): number | null {
  return value != null && VALID_PAGE.test(value) && value !== '1' ? Number(value) : null;
}

/** Query string of a catalog page: '' for page 1, '?page=N' otherwise. */
export function catalogPageQuery(page: number): string {
  return page >= 2 ? `?page=${page}` : '';
}
