import {ChangeDetectionStrategy, Component, HostListener, inject, OnInit} from '@angular/core';
import {MetaService} from '../../@core/services/meta.service';

@Component({
  selector: 'app-delivery-terms',
  imports: [],
  templateUrl: './delivery-terms.html',
  styleUrl: './delivery-terms.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryTerms implements OnInit {
  private metaService = inject(MetaService);

  sections = [
    { id: 'general', title: 'Общие положения' },
    { id: 'orders', title: 'Заказы и Оплата' },
    { id: 'delivery', title: 'Доставка и Возврат' },
    { id: 'privacy', title: 'Конфиденциальность' },
    { id: 'intellectual', title: 'Интеллектуальная собственность' }
  ];

  activeSection: string = this.sections[0].id;

  ngOnInit() {
    this.metaService.updateTitle('Termeni și Condiții | Secret Room');
    this.metaService.updateDescription('Termeni și condiții de livrare, plată și retur pentru magazinul Secret Room.');
    this.onWindowScroll();

    // FAQ Schema for Delivery Page
    this.metaService.setJsonLd({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Cum pot plăti comanda?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Puteți achita comanda online cu cardul bancar (Visa, MasterCard) sau numerar la livrare."
          }
        },
        {
          "@type": "Question",
          "name": "Cât costă livrarea?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Livrarea în Chișinău este gratuită pentru comenzi de peste 1000 MDL. Pentru comenzi mai mici, costul este de 50 MDL."
          }
        },
        {
          "@type": "Question",
          "name": "Pot returna produsul?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Conform legislației, produsele cosmetice și lenjeria intimă nu pot fi returnate dacă au fost desigilate, din motive de igienă."
          }
        }
      ]
    });
  }

  scrollToSection(id: string, event: Event) {
    event.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.activeSection = id;
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPos = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

    for (let i = this.sections.length - 1; i >= 0; i--) {
      const sectionEl = document.getElementById(this.sections[i].id);
      if (sectionEl) {
        const offsetTop = sectionEl.offsetTop;
        if (scrollPos + 80 >= offsetTop) {
          this.activeSection = this.sections[i].id;
          break;
        }
      }
    }
  }
}

interface Section {
  id: string;
  number: number;
  title: string;
  text: string;
}
