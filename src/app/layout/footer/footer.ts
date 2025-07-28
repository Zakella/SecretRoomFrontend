import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';
import {ReturnPolicy} from '../../shared/components/return-policy/return-policy';

@Component({
  selector: 'app-footer',
  imports: [
    RouterLink,
    ReturnPolicy
  ],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer {
  isReturnPolicyVisible = false;

  showPolicy() {
    this.isReturnPolicyVisible = true;
  }

}
