import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTransloco} from '@ngneat/transloco';
import {ProductGallery} from './product-gallery';
import {ProductImage} from '../../../../entities/product-image';

describe('ProductGallery', () => {
  let fixture: ComponentFixture<ProductGallery>;
  let cmp: ProductGallery;
  const el = () => fixture.nativeElement as HTMLElement;
  const imgs = (n: number): ProductImage[] =>
    Array.from({length: n}, (_, i) => ({imageUrl: `img${i + 1}.jpg`, description: ''}));

  function setup(images: ProductImage[], alt = 'Silk robe') {
    fixture.componentRef.setInput('images', images);
    fixture.componentRef.setInput('alt', alt);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductGallery],
      providers: [provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}})],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductGallery);
    cmp = fixture.componentInstance;
  });

  it('renders the first photo eager with high priority, the rest lazy', () => {
    setup(imgs(3));
    const images = Array.from(el().querySelectorAll<HTMLImageElement>('.slide img'));
    const first = images.find(i => i.getAttribute('src') === 'img1.jpg' && i.getAttribute('loading') === 'eager')!;
    expect(first).toBeTruthy();
    expect(first.getAttribute('fetchpriority')).toBe('high');
    expect(first.getAttribute('width')).toBe('550');
    expect(first.getAttribute('height')).toBe('550');
    const others = images.filter(i => i !== first);
    expect(others.length).toBe(4); // 2 настоящих + 2 клона
    expect(others.every(i => i.getAttribute('loading') === 'lazy')).toBeTrue();
  });

  it('alt: name for the first, "name - N" for the rest; clones are hidden', () => {
    setup(imgs(3));
    const real = Array.from(el().querySelectorAll<HTMLElement>('.slide:not([aria-hidden]) img'));
    expect(real.map(i => i.getAttribute('alt'))).toEqual(['Silk robe', 'Silk robe - 2', 'Silk robe - 3']);
    expect(el().querySelectorAll('.slide[aria-hidden="true"]').length).toBe(2);
  });

  it('empty imageUrl falls back to the placeholder', () => {
    setup([{imageUrl: '', description: ''}]);
    expect(el().querySelector('.slide img')!.getAttribute('src')).toBe('assets/images/unavailable.jpg');
  });

  it('single photo: no arrows, no thumbnails, no clones', () => {
    setup(imgs(1));
    expect(el().querySelectorAll('.slide').length).toBe(1);
    expect(el().querySelector('.arrow')).toBeNull();
    expect(el().querySelector('.thumbnails')).toBeNull();
  });

  it('renders nothing without photos', () => {
    setup([]);
    expect(el().querySelector('.gallery')).toBeNull();
  });

  it('thumbnail click selects the photo and marks it active', () => {
    setup(imgs(3));
    const thumbs = el().querySelectorAll<HTMLButtonElement>('.thumb');
    expect(thumbs.length).toBe(3);
    thumbs[2].click();
    fixture.detectChanges();
    expect(cmp.selectedIndex()).toBe(2);
    expect(el().querySelectorAll('.thumb')[2].classList).toContain('active');
  });

  it('next/prev wrap around', () => {
    setup(imgs(3));
    (el().querySelector('.arrow-prev') as HTMLButtonElement).click();
    expect(cmp.selectedIndex()).toBe(2);
    (el().querySelector('.arrow-next') as HTMLButtonElement).click();
    expect(cmp.selectedIndex()).toBe(0);
    cmp.next();
    expect(cmp.selectedIndex()).toBe(1);
  });

  it('arrow keys move the selection', () => {
    setup(imgs(3));
    const viewport = el().querySelector('.viewport')!;
    viewport.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight'}));
    expect(cmp.selectedIndex()).toBe(1);
    viewport.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft'}));
    viewport.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft'}));
    expect(cmp.selectedIndex()).toBe(2);
  });

  it('changing images resets the index to 0', () => {
    setup(imgs(3));
    cmp.select(2);
    expect(cmp.selectedIndex()).toBe(2);
    fixture.componentRef.setInput('images', [{imageUrl: 'other1.jpg', description: ''}, {imageUrl: 'other2.jpg', description: ''}]);
    fixture.detectChanges();
    expect(cmp.selectedIndex()).toBe(0);
  });

  it('arrows have translated aria-labels', () => {
    setup(imgs(2));
    expect(el().querySelector('.arrow-prev')!.getAttribute('aria-label')).toBeTruthy();
    expect(el().querySelector('.arrow-next')!.getAttribute('aria-label')).toBeTruthy();
  });
});
