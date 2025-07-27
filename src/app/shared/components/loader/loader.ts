import {Component, signal} from '@angular/core';

@Component({
  selector: 'app-loader',
  imports: [],
  templateUrl: './loader.html',
  styleUrl: './loader.scss'
})
export class Loader {
 isLoad = signal(false)
}
