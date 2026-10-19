import {FilterGroup} from '../../../entities/filter-group';
import {
  BRAND_SECTION_KEY,
  buildFilterSections,
  BuildSectionsInput,
  defaultOpenKeys,
  isSectionVisible,
  pickVisibleValues,
  sortSectionKeys,
} from './catalog-filters.util';

const values = (n: number) => Array.from({length: n}, (_, i) => ({slug: `v${i + 1}`, count: i + 1}));
const group = (slug: string, n: number): FilterGroup => ({slug, values: values(n)});
const brands = (n: number) => Array.from({length: n}, (_, i) => ({brand: `B${i + 1}`, brandAlias: ''}));

const input = (over: Partial<BuildSectionsInput> = {}): BuildSectionsInput => ({
  brands: [],
  groups: [],
  appliedBrand: null,
  appliedFilters: new Map(),
  markBrand: null,
  markFilters: new Map(),
  openOverrides: new Map(),
  expandedKeys: new Set(),
  ...over,
});

describe('catalog-filters.util', () => {
  describe('sortSectionKeys', () => {
    it('should order known sections: type, brand, size, volume, color, price', () => {
      const keys = ['price', 'color', 'volume', 'size', BRAND_SECTION_KEY, 'product-type'];
      expect(sortSectionKeys(keys)).toEqual(['product-type', BRAND_SECTION_KEY, 'size', 'volume', 'color', 'price']);
    });

    it('should put unknown sections last in the original backend order', () => {
      expect(sortSectionKeys(['scent', 'color', 'material', 'product-type'])).toEqual([
        'product-type', 'color', 'scent', 'material',
      ]);
    });

    it('should not mutate the input', () => {
      const keys = ['color', 'size'];
      sortSectionKeys(keys);
      expect(keys).toEqual(['color', 'size']);
    });
  });

  describe('isSectionVisible', () => {
    it('should hide a section with a single unselected value', () => {
      expect(isSectionVisible(1, 0)).toBe(false);
      expect(isSectionVisible(0, 0)).toBe(false);
    });

    it('should show a section with several values', () => {
      expect(isSectionVisible(2, 0)).toBe(true);
    });

    it('should keep a single-value section visible while it is selected', () => {
      expect(isSectionVisible(1, 1)).toBe(true);
    });
  });

  describe('defaultOpenKeys', () => {
    it('should open the first two visible sections', () => {
      expect([...defaultOpenKeys(['a', 'b', 'c', 'd'], new Map())]).toEqual(['a', 'b']);
    });

    it('should also open sections that have a selection', () => {
      const open = defaultOpenKeys(['a', 'b', 'c', 'd'], new Map([['d', 2]]));
      expect([...open].sort()).toEqual(['a', 'b', 'd']);
    });

    it('should cope with fewer sections than the limit', () => {
      expect([...defaultOpenKeys(['a'], new Map())]).toEqual(['a']);
    });
  });

  describe('pickVisibleValues', () => {
    const none = () => false;

    it('should show everything when there are at most 6 values', () => {
      expect(pickVisibleValues(values(6), none, false)).toEqual({shown: values(6), hiddenCount: 0});
    });

    it('should cut to 6 and report the hidden rest', () => {
      const r = pickVisibleValues(values(10), none, false);
      expect(r.shown.map(v => v.slug)).toEqual(['v1', 'v2', 'v3', 'v4', 'v5', 'v6']);
      expect(r.hiddenCount).toBe(4);
    });

    it('should pull selected values from the tail in place', () => {
      const r = pickVisibleValues(values(10), slug => slug === 'v9', false);
      expect(r.shown.map(v => v.slug)).toEqual(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v9']);
      expect(r.hiddenCount).toBe(3);
    });

    it('should show everything when expanded', () => {
      expect(pickVisibleValues(values(10), none, true)).toEqual({shown: values(10), hiddenCount: 0});
    });
  });

  describe('buildFilterSections', () => {
    it('should order sections and skip single-value ones', () => {
      const sections = buildFilterSections(input({
        brands: brands(3),
        groups: [group('color', 3), group('size', 1), group('scent', 2), group('product-type', 2)],
      }));
      expect(sections.map(s => s.key)).toEqual(['product-type', BRAND_SECTION_KEY, 'color', 'scent']);
    });

    it('should hide the brand section for a single brand', () => {
      const sections = buildFilterSections(input({brands: brands(1), groups: [group('size', 3)]}));
      expect(sections.map(s => s.key)).toEqual(['size']);
    });

    it('should open the first two sections and the ones with a selection', () => {
      const sel = new Map([['price', new Set(['v1'])]]);
      const sections = buildFilterSections(input({
        groups: [group('product-type', 2), group('size', 2), group('volume', 2), group('price', 2)],
        appliedFilters: sel,
        markFilters: sel,
      }));
      expect(sections.map(s => s.open)).toEqual([true, true, false, true]);
      expect(sections[3].selectedCount).toBe(1);
    });

    it('should let a user override beat the default', () => {
      const sections = buildFilterSections(input({
        groups: [group('size', 2), group('color', 2)],
        openOverrides: new Map([['size', false]]),
      }));
      expect(sections.map(s => s.open)).toEqual([false, true]);
    });

    it('should fold values behind "more" and unfold on expand', () => {
      const g = [group('size', 9)];
      const folded = buildFilterSections(input({groups: g}))[0];
      expect(folded.items.length).toBe(6);
      expect(folded.hiddenCount).toBe(3);
      expect(folded.canCollapse).toBe(false);

      const open = buildFilterSections(input({groups: g, expandedKeys: new Set(['size'])}))[0];
      expect(open.items.length).toBe(9);
      expect(open.hiddenCount).toBe(0);
      expect(open.canCollapse).toBe(true);
    });

    it('should keep a selected tail value visible and not count "all brands" in the six', () => {
      const sections = buildFilterSections(input({
        brands: brands(8),
        appliedBrand: 'B8',
        markBrand: 'B8',
      }));
      const brand = sections[0];
      expect(brand.items.map(i => i.slug)).toEqual(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B8']);
      expect(brand.items[6].selected).toBe(true);
      expect(brand.hiddenCount).toBe(1);
    });

    it('should mark values from the mark-selection but pull the tail by the applied one', () => {
      const pending = new Map([['size', new Set(['v8'])]]);
      const s = buildFilterSections(input({groups: [group('size', 9)], markFilters: pending}))[0];
      expect(s.items.length).toBe(6);
      expect(s.selectedCount).toBe(1);
    });
  });
});
