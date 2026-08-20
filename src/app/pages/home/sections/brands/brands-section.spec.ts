import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideTransloco} from '@ngneat/transloco';
import {TranslocateHttpLoader} from '../../../../@core/configs/transloco-config';
import {Language} from '../../../../@core/services/language';
import {Brand} from '../../../../entities/category';
import {environment} from '../../../../../environments/environment';
import {BrandsSection} from './brands-section';

const BRANDS_URL = `${environment.apiUrl}products/brands`;

const BRANDS: Brand[] = [
  {brand: 'VictoriasSecret', brandAlias: "Victoria's Secret"},
  {brand: 'BathAndBody', brandAlias: 'Bath & Body Works'},
  {brand: 'AnnSummers', brandAlias: ''},
];

describe('BrandsSection', () => {
  let fixture: ComponentFixture<BrandsSection>;
  let httpMock: HttpTestingController;
  const currentLanguage = signal('ro');

  function brandLinks(): HTMLAnchorElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('a.brand-tile'),
    ) as HTMLAnchorElement[];
  }

  beforeEach(() => {
    currentLanguage.set('ro');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTransloco({
          config: {availableLangs: ['ro', 'ru'], defaultLang: 'ro'},
          loader: TranslocateHttpLoader,
        }),
        {provide: Language, useValue: {currentLanguage}},
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BrandsSection);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function render(brands: Brand[] = BRANDS): void {
    fixture.detectChanges();
    httpMock.expectOne(BRANDS_URL).flush(brands);
    fixture.detectChanges();
  }

  it('should render one tile per brand', () => {
    render();
    expect(brandLinks().length).toBe(BRANDS.length);
  });

  it('should render brand tiles as real anchors with an href attribute', () => {
    // Суть правки: раньше переход шёл через (click) и краулер ссылок не видел.
    render();
    for (const link of brandLinks()) {
      expect(link.tagName).toBe('A');
      expect(link.getAttribute('href')).toBeTruthy();
    }
  });

  it('should point every href at the brand catalog page', () => {
    render();
    expect(brandLinks().map(a => a.getAttribute('href'))).toEqual([
      '/ro/catalog/brand/victorias-secret',
      '/ro/catalog/brand/bath-and-body',
      '/ro/catalog/brand/ann-summers',
    ]);
  });

  it('should build hrefs for the active language', () => {
    currentLanguage.set('ru');
    render();
    expect(brandLinks().map(a => a.getAttribute('href'))).toEqual([
      '/ru/catalog/brand/victorias-secret',
      '/ru/catalog/brand/bath-and-body',
      '/ru/catalog/brand/ann-summers',
    ]);
  });

  it('should show the alias and fall back to the brand key', () => {
    render();
    const names = Array.from(
      fixture.nativeElement.querySelectorAll('.brand-tile__name'),
    ).map(el => (el as HTMLElement).textContent!.trim());
    expect(names).toEqual(["Victoria's Secret", 'Bath & Body Works', 'AnnSummers']);
  });

  it('should link to the full brands page with an href', () => {
    render();
    const all = fixture.nativeElement.querySelector('a.brands-section__all') as HTMLAnchorElement;
    expect(all.getAttribute('href')).toBe('/ro/brands');
  });

  it('should render nothing when the brand list is empty', () => {
    render([]);
    expect(fixture.nativeElement.querySelector('.brands-section')).toBeNull();
  });
});
