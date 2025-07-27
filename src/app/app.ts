import {Component, inject} from '@angular/core';
import {Header} from './layout/header/header';
import {Footer} from './layout/footer/footer';
import {FloatingSidebar} from './layout/floating-sidebar/floating-sidebar';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {TranslocoService} from '@ngneat/transloco';
import {distinctUntilChanged, filter, map} from 'rxjs';
import {Loader} from './shared/components/loader/loader';

@Component({
  selector: 'app-root',
  imports: [Header, Footer, FloatingSidebar, RouterOutlet, Loader],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translateService = inject(TranslocoService);
constructor() {
  this.initializeMetaTags();
}

  public initializeMetaTags() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.route.firstChild?.snapshot.paramMap.get('lang')),
        distinctUntilChanged()
      )
      .subscribe(lang => {
        const currentLang = (lang && ['ru', 'ro'].includes(lang)) ? lang : 'en';
        this.translateService.setActiveLang(currentLang);

/*        const meta = META_INFO[currentLang];
        if (meta) {
          this.updateMetaTags(currentLang, meta.title, meta.description, meta.keywords);
        }*/
      });
  }

/*  private updateMetaTags(lang: string, title: string, description: string, keywords: string) {
    this.titleService.setTitle(title);

    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ name: 'keywords', content: keywords });

    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });

    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });

    if (this.document?.documentElement) {
      this.document.documentElement.lang = lang;
    }
  }

  public setNoIndexNoFollow(): void {
    this.metaService.removeTag("name='robots'");

    this.metaService.addTag({ name: 'robots', content: 'noindex, nofollow' });
  }*/
}
