import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MetaService {
  private meta = inject(Meta);
  private title = inject(Title);
  private router = inject(Router);
  private document = inject(DOCUMENT);
  private readonly siteUrl = environment.frontend;

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateCanonicalUrl();
      this.autoUpdateAlternateTags();
    });
  }

  /** Build full absolute URL from router path (works in SSR and browser) */
  private getFullUrl(): string {
    const path = this.router.url.split('?')[0].split('#')[0];
    return `${this.siteUrl}${path}`;
  }

  updateTitle(title: string) {
    this.title.setTitle(title);
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ name: 'twitter:title', content: title });
  }

  updateDescription(description: string) {
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ name: 'twitter:description', content: description });
  }

  updateKeywords(keywords: string) {
    this.meta.updateTag({ name: 'keywords', content: keywords });
  }

  updateImage(imageUrl: string, width: number = 1200, height: number = 630) {
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ property: 'og:image:width', content: String(width) });
    this.meta.updateTag({ property: 'og:image:height', content: String(height) });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
  }

  updateUrl(url: string) {
    this.meta.updateTag({ property: 'og:url', content: url });
  }

  updateCanonicalUrl() {
    const url = this.getFullUrl();
    const head = this.document.getElementsByTagName('head')[0];
    let link = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
    this.updateUrl(url);
  }

  updateAlternateTags(roUrl: string, ruUrl: string) {
    const head = this.document.getElementsByTagName('head')[0];

    // Remove existing alternate tags
    const existing = this.document.querySelectorAll('link[rel="alternate"]');
    existing.forEach(el => el.remove());

    const linkRo = this.document.createElement('link');
    linkRo.setAttribute('rel', 'alternate');
    linkRo.setAttribute('hreflang', 'ro-MD');
    linkRo.setAttribute('href', roUrl);
    head.appendChild(linkRo);

    const linkRu = this.document.createElement('link');
    linkRu.setAttribute('rel', 'alternate');
    linkRu.setAttribute('hreflang', 'ru-MD');
    linkRu.setAttribute('href', ruUrl);
    head.appendChild(linkRu);

    const linkDefault = this.document.createElement('link');
    linkDefault.setAttribute('rel', 'alternate');
    linkDefault.setAttribute('hreflang', 'x-default');
    linkDefault.setAttribute('href', roUrl);
    head.appendChild(linkDefault);
  }

  /** Auto-generate hreflang alternates from current URL by swapping the lang segment */
  private autoUpdateAlternateTags() {
    const path = this.router.url.split('?')[0].split('#')[0];
    const segments = path.split('/');
    // URL structure: /:lang/... (segments[0] is empty, segments[1] is lang)
    if (segments.length >= 2 && (segments[1] === 'ro' || segments[1] === 'ru')) {
      const pathWithoutLang = segments.slice(2).join('/');
      const roUrl = `${this.siteUrl}/ro/${pathWithoutLang}`;
      const ruUrl = `${this.siteUrl}/ru/${pathWithoutLang}`;
      this.updateAlternateTags(roUrl, ruUrl);
    }
  }

  setProductMeta(product: any, lang: string = 'ro', slugifyService?: any) {
    const name = lang === 'ru' ? (product.nameRu || product.name) : (product.nameRo || product.name);
    const description = lang === 'ru' ? (product.descriptionRu || product.description) : (product.descriptionRo || product.description);
    const brand = product.brandAlias || product.brand || 'Secret Room';

    // Strip HTML tags from description if present
    const cleanDescription = description ? description.replace(/<[^>]*>/g, '').substring(0, 160) : '';

    // Aggressive SEO Title
    // RO: Bare Vanilla Victoria's Secret - Preț Moldova | Secret Room
    // RU: Bare Vanilla Victoria's Secret - Цена Молдова | Secret Room
    let title = '';
    let metaDesc = '';

    if (lang === 'ro') {
      title = `${name} ${brand} - Preț Moldova | Secret Room`;
      metaDesc = `Cumpără ${name} de la ${brand} în Moldova. ${cleanDescription}. Livrare rapidă în Chișinău.`;
    } else {
      title = `${name} ${brand} - Цена Молдова | Secret Room`;
      metaDesc = `Купить ${name} от ${brand} в Молдове. ${cleanDescription}. Быстрая доставка по Кишиневу.`;
    }

    this.updateTitle(title);
    this.updateDescription(metaDesc);
    this.updateImage(product.imageURL);
    this.updateKeywords(`${name}, ${brand}, moldova, chisinau, pret, цена, купить, cumpara`);

    // Add product specific meta tags
    this.meta.updateTag({ property: 'product:price:amount', content: product.price });
    this.meta.updateTag({ property: 'product:price:currency', content: 'MDL' });
    this.meta.updateTag({ property: 'product:brand', content: brand });

    // Generate Hreflang links if slugify service is provided
    if (slugifyService && product.id) {
      const slug = slugifyService.transform(product.name);
      const roUrl = `${this.siteUrl}/ro/product/${product.id}/${slug}`;
      const ruUrl = `${this.siteUrl}/ru/product/${product.id}/${slug}`;

      this.updateAlternateTags(roUrl, ruUrl);
    }

    const inStock = product.inStock !== false && (product.unitsInStock ?? 0) > 0;
    const availability = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

    this.setJsonLd({
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": name,
      "image": product.imageURL,
      "description": cleanDescription,
      "sku": product.sku || product.article || undefined,
      "brand": {
        "@type": "Brand",
        "name": brand
      },
      "offers": {
        "@type": "Offer",
        "url": this.getFullUrl(),
        "priceCurrency": "MDL",
        "price": product.price,
        "availability": availability,
        "itemCondition": "https://schema.org/NewCondition"
      }
    }, 'product');
  }

  setBreadcrumbJsonLd(breadcrumbs: { label: string, url: string }[]) {
    if (!breadcrumbs.length) {
      this.removeJsonLd('breadcrumb');
      return;
    }

    const itemListElement = breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": `https://secretroom.md${item.url}`
    }));

    this.setJsonLd({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": itemListElement
    }, 'breadcrumb');
  }

  setOrganizationJsonLd() {
    this.setJsonLd({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Secret Room",
      "url": "https://secretroom.md",
      "logo": "https://secretroom.md/assets/images/logo/secretroom.png",
      "sameAs": [
        "https://www.instagram.com/secretroom.md/",
        "https://www.facebook.com/secretroom.md"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+37369999999",
        "contactType": "customer service",
        "areaServed": "MD",
        "availableLanguage": ["ro", "ru"]
      },
      "location": [
        {
          "@type": "Store",
          "name": "Secret Room - Atrium",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Strada Albișoara 4, CC Atrium, et. 2, but. 2018",
            "addressLocality": "Chișinău",
            "addressCountry": "MD"
          }
        },
        {
          "@type": "Store",
          "name": "Secret Room - Eminescu",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Strada Mihai Eminescu 56",
            "addressLocality": "Chișinău",
            "addressCountry": "MD"
          }
        }
      ]
    }, 'organization');
  }

  setWebSiteJsonLd() {
    this.setJsonLd({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Secret Room",
      "url": "https://secretroom.md",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://secretroom.md/ro/search/{search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }, 'website');
  }

  setJsonLd(data: any, schemaId: string = 'default') {
    const selector = `script[type="application/ld+json"][data-schema="${schemaId}"]`;
    let script = this.document.querySelector(selector) as HTMLScriptElement;
    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-schema', schemaId);
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  removeJsonLd(schemaId: string) {
    const script = this.document.querySelector(`script[type="application/ld+json"][data-schema="${schemaId}"]`);
    script?.remove();
  }

  clearJsonLd() {
    const scripts = this.document.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(s => s.remove());
  }

  updateHtmlLang(lang: string) {
    this.document.documentElement.setAttribute('lang', lang);
  }
}
