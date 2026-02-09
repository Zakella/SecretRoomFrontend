import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class MetaService {
  private meta = inject(Meta);
  private title = inject(Title);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);

  constructor() {
    // Listen to route changes to update canonical URL
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateCanonicalUrl();
    });
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

  updateImage(imageUrl: string) {
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
  }

  updateUrl(url: string) {
    this.meta.updateTag({ property: 'og:url', content: url });
  }

  updateCanonicalUrl() {
    if (isPlatformBrowser(this.platformId)) {
      const head = this.document.getElementsByTagName('head')[0];
      let link: HTMLLinkElement = this.document.querySelector('link[rel="canonical"]') || this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', this.document.location.href);
      if (!link.parentElement) {
        head.appendChild(link);
      }
    }
  }

  updateAlternateTags(roUrl: string, ruUrl: string) {
    if (isPlatformBrowser(this.platformId)) {
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

      // x-default usually points to the main language (ro)
      const linkDefault = this.document.createElement('link');
      linkDefault.setAttribute('rel', 'alternate');
      linkDefault.setAttribute('hreflang', 'x-default');
      linkDefault.setAttribute('href', roUrl);
      head.appendChild(linkDefault);
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
      const baseUrl = 'https://secretroom.md';
      // We need to construct URLs manually or use a helper
      // Assuming structure: /:lang/product/:id/:slug
      const slug = slugifyService.transform(product.name); // Using default name for slug usually
      const roUrl = `${baseUrl}/ro/product/${product.id}/${slug}`;
      const ruUrl = `${baseUrl}/ru/product/${product.id}/${slug}`;

      this.updateAlternateTags(roUrl, ruUrl);
    }

    this.setJsonLd({
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": name,
      "image": product.imageURL,
      "description": cleanDescription,
      "brand": {
        "@type": "Brand",
        "name": brand
      },
      "offers": {
        "@type": "Offer",
        "url": this.document.location.href,
        "priceCurrency": "MDL",
        "price": product.price,
        "availability": "https://schema.org/InStock",
        "itemCondition": "https://schema.org/NewCondition"
      }
    });
  }

  setBreadcrumbJsonLd(breadcrumbs: { label: string, url: string }[]) {
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
    });
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
    });
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
    });
  }

  setJsonLd(data: any) {
    if (isPlatformBrowser(this.platformId)) {
      let script = this.document.querySelector('script[type="application/ld+json"]');
      if (!script) {
        script = this.document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        this.document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(data);
    }
  }
}
