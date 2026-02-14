import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {LoaderService} from './loader-service';

@Component({
  selector: 'app-loader',
  imports: [],
  templateUrl: './loader.html',
  styleUrl: './loader.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Loader {
  loader = inject(LoaderService);
  isLoad =  this.loader.isLoading;
}
