import {Component, inject} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {DOCUMENT} from '@angular/common';
import {provideRouter} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {MetaService} from './meta.service';

/** Страница-заглушка, которая снимает canonical/hreflang ещё во время активации маршрута. */
@Component({selector: 'app-test-missing', template: ''})
class MissingPage {
  constructor() {
    inject(MetaService).removeCanonicalAndAlternates();
  }
}

@Component({selector: 'app-test-ok', template: ''})
class OkPage {}

describe('MetaService.removeCanonicalAndAlternates (404)', () => {
  let doc: Document;
  let harness: RouterTestingHarness;
  let service: MetaService;

  const canonicals = () => doc.querySelectorAll('link[rel="canonical"]').length;
  const hreflangs = () => doc.querySelectorAll('link[rel="alternate"][hreflang]').length;

  function addLink(rel: string, href: string, hreflang?: string): void {
    const link = doc.createElement('link');
    link.setAttribute('rel', rel);
    link.setAttribute('href', href);
    if (hreflang) link.setAttribute('hreflang', hreflang);
    doc.head.appendChild(link);
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {path: 'ro/missing', component: MissingPage},
          {path: 'ro/ok', component: OkPage},
        ]),
      ],
    });
    doc = TestBed.inject(DOCUMENT);
    service = TestBed.inject(MetaService);
    harness = await RouterTestingHarness.create();
    doc.querySelectorAll('link[rel="canonical"], link[rel="alternate"]').forEach(el => el.remove());
  });

  afterEach(() => {
    doc.querySelectorAll('link[rel="canonical"], link[rel="alternate"]').forEach(el => el.remove());
  });

  it('снимает все canonical (в т.ч. шаблонный из index.html) и все hreflang', () => {
    addLink('canonical', 'https://secretroom.md/ro');
    addLink('canonical', 'https://secretroom.md/ro/x');
    addLink('alternate', 'https://secretroom.md/ro/x', 'ro');
    addLink('alternate', 'https://secretroom.md/ru/x', 'ru');
    addLink('alternate', 'https://secretroom.md/ro/x', 'x-default');

    service.removeCanonicalAndAlternates();

    expect(canonicals()).toBe(0);
    expect(hreflangs()).toBe(0);
  });

  it('не трогает прочие link[rel=alternate] без hreflang (например RSS)', () => {
    addLink('alternate', '/feed.xml');
    service.removeCanonicalAndAlternates();
    expect(doc.querySelectorAll('link[rel="alternate"]').length).toBe(1);
  });

  it('вызов во время навигации срабатывает после того, как MetaService сам поставил теги на NavigationEnd', async () => {
    addLink('canonical', 'https://secretroom.md/ro');

    await harness.navigateByUrl('/ro/missing');

    expect(canonicals()).toBe(0);
    expect(hreflangs()).toBe(0);
  });

  it('на обычной странице теги на месте — снятие не «залипает» на следующую навигацию', async () => {
    await harness.navigateByUrl('/ro/missing');
    await harness.navigateByUrl('/ro/ok');

    expect(canonicals()).toBe(1);
    expect(hreflangs()).toBe(3);
  });

  it('вызов вне навигации (асинхронный ответ API) снимает теги сразу', async () => {
    await harness.navigateByUrl('/ro/ok');
    expect(canonicals()).toBe(1);

    service.removeCanonicalAndAlternates();

    expect(canonicals()).toBe(0);
    expect(hreflangs()).toBe(0);
  });
});
