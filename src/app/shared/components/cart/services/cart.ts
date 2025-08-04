import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CartUi {
  private _visible = signal(false);

  visible = this._visible.asReadonly();

  open() {
    this._visible.set(true);
  }

  close() {
    this._visible.set(false);
  }

  toggle() {
    this._visible.update(v => !v);
  }
}
