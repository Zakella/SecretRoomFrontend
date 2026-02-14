import {ChangeDetectionStrategy, Component, HostListener, inject, OnInit} from '@angular/core';
import {MetaService} from '../../@core/services/meta.service';
import {TranslocoDirective, TranslocoService} from '@ngneat/transloco';
import {Language} from '../../@core/services/language';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-delivery-terms',
  imports: [TranslocoDirective, RouterLink],
  templateUrl: './delivery-terms.html',
  styleUrl: './delivery-terms.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryTerms implements OnInit {
  private metaService = inject(MetaService);
  private langService = inject(Language);
  private transloco = inject(TranslocoService);

  activeLang = this.langService.currentLanguage;

  sectionIds = ['general', 'dataProtection', 'orders', 'delivery', 'returns', 'privacy', 'contact'];
  activeSection = this.sectionIds[0];

  ngOnInit() {
    const isRo = this.activeLang() === 'ro';
    this.metaService.updateTitle(isRo
      ? 'Termeni și Condiții | Secret Room'
      : 'Правила и Условия | Secret Room');
    this.metaService.updateDescription(isRo
      ? 'Termeni și condiții de utilizare a magazinului online Secret Room. Livrare, plată, retur și protecția datelor.'
      : 'Правила и условия использования интернет-магазина Secret Room. Доставка, оплата, возврат и защита данных.');
    this.metaService.updateKeywords(isRo
      ? 'termeni și condiții, retur, livrare, plată, protecția datelor, Secret Room'
      : 'правила и условия, возврат, доставка, оплата, защита данных, Secret Room');
    this.metaService.updateImage('https://secretroom.md/assets/images/SR-transparent.png');
    this.metaService.updateCanonicalUrl();
    this.setFaqJsonLd();
    this.onWindowScroll();
  }

  private setFaqJsonLd() {
    const strip = (html: string) => html.replace(/<[^>]*>/g, '').substring(0, 300);
    const faq = this.sectionIds.map(id => ({
      '@type': 'Question',
      'name': this.transloco.translate(`termsPage.${id}.title`),
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': strip(this.transloco.translate(`termsPage.${id}.content`))
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

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPos = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    for (let i = this.sectionIds.length - 1; i >= 0; i--) {
      const sectionEl = document.getElementById(this.sectionIds[i]);
      if (sectionEl && scrollPos + 80 >= sectionEl.offsetTop) {
        this.activeSection = this.sectionIds[i];
        break;
      }
    }
  }
}
