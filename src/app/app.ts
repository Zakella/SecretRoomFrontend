import {Component, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {Loader} from './shared/components/loader/loader';
import {Toast} from 'primeng/toast';
import {ThemeKey} from './@core/theme/theme.model';
import {ThemeService} from './@core/theme/theme.service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Loader, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private themeService = inject(ThemeService)

  constructor() {
    this.themeService.init()
  }
}
