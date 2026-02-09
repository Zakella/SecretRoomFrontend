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
