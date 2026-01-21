import {ChangeDetectionStrategy, Component, HostListener} from '@angular/core';
import {FadeUp} from '../../@core/directives/fade-up';

@Component({
  selector: 'app-delivery-terms',
  imports: [FadeUp],
  templateUrl: './delivery-terms.html',
  styleUrl: './delivery-terms.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryTerms {
  sections: Section[] = [
    {
      id: 'general',
      number: 1,
      title: 'Общие положения',
      text: 'Используя наш магазин косметики, вы соглашаетесь с этими правилами и условиями.',
    },
    {
      id: 'orders',
      number: 2,
      title: 'Оформление заказов',
      text: 'Заказ считается оформленным после подтверждения. Мы можем отказать в заказе при отсутствии товара.',
    },
    {
      id: 'payment',
      number: 3,
      title: 'Оплата',
      text: 'Оплата возможна онлайн или при получении товара, если эта опция доступна.',
    },
    {
      id: 'delivery',
      number: 4,
      title: 'Доставка',
      text: 'Доставка осуществляется по всей стране в сроки, указанные при оформлении.',
    },
    {
      id: 'returns',
      number: 5,
      title: 'Возврат и обмен',
      text: 'Косметические товары надлежащего качества возврату не подлежат. В случае брака возможен возврат или обмен.',
    },
    {
      id: 'privacy',
      number: 6,
      title: 'Конфиденциальность',
      text: 'Мы заботимся о вашей конфиденциальности и обрабатываем данные в соответствии с политикой сайта.',
    },
    {
      id: 'changes',
      number: 7,
      title: 'Изменение условий',
      text: 'Администрация сайта может изменять правила без предварительного уведомления.',
    },
  ];

  activeSection: string = this.sections[0].id;

  ngOnInit() {
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
