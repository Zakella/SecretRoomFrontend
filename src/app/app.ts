import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {Loader} from './shared/components/loader/loader';
import {Toast} from 'primeng/toast';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Loader, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
