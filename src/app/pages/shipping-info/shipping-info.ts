import {ChangeDetectionStrategy, Component, HostListener, inject, OnInit, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {MetaService} from '../../@core/services/meta.service';
import {TranslocoDirective, TranslocoService} from '@ngneat/transloco';
import {Language} from '../../@core/services/language';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-shipping-info',
  imports: [TranslocoDirective, RouterLink],
  templateUrl: './shipping-info.html',
  styleUrl: './shipping-info.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShippingInfo implements OnInit {
  private metaService = inject(MetaService);
  private langService = inject(Language);
  private transloco = inject(TranslocoService);
  private platformId = inject(PLATFORM_ID);

  activeLang = this.langService.currentLanguage;

  sectionIds = ['zones', 'cost', 'payment', 'processing', 'important'];
  activeSection = this.sectionIds[0];

  ngOnInit() {
    const isRo = this.activeLang() === 'ro';
    this.metaService.updateTitle(isRo
      ? 'Condiții de livrare | Secret Room'
      : 'Условия доставки | Secret Room');
    this.metaService.updateDescription(isRo
      ? 'Condiții de livrare și plată pentru magazinul online Secret Room Moldova.'
      : 'Условия доставки и оплаты интернет-магазина Secret Room Молдова.');
    this.metaService.updateKeywords(isRo
      ? 'livrare Moldova, cost livrare, plată online, livrare Chișinău, Secret Room'
      : 'доставка Молдова, стоимость доставки, онлайн оплата, доставка Кишинев, Secret Room');
    this.metaService.updateImage('https://secretroom.md/assets/images/SR-transparent.png');
    this.metaService.updateCanonicalUrl();
    this.setFaqJsonLd();
    if (isPlatformBrowser(this.platformId)) {
      this.onWindowScroll();
    }
  }

  private setFaqJsonLd() {
    const strip = (html: string) => html.replace(/<[^>]*>/g, '').substring(0, 300);
    const faq = this.sectionIds.map(id => ({
      '@type': 'Question',
      'name': this.transloco.translate(`shippingPage.${id}.title`),
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': strip(this.transloco.translate(`shippingPage.${id}.content`))
      }
    }));
    this.metaService.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faq
    }, 'faq');
  }

  scrollToSection(id: string, event: Event) {
    event.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({behavior: 'smooth', block: 'start'});
      this.activeSection = id;
    }
  }

  private scrollTicking = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (this.scrollTicking || !isPlatformBrowser(this.platformId)) return;
    this.scrollTicking = true;
    requestAnimationFrame(() => {
      const scrollPos = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      for (let i = this.sectionIds.length - 1; i >= 0; i--) {
        const sectionEl = document.getElementById(this.sectionIds[i]);
        if (sectionEl && scrollPos + 80 >= sectionEl.offsetTop) {
          this.activeSection = this.sectionIds[i];
          break;
        }
      }
      this.scrollTicking = false;
    });
  }
}
