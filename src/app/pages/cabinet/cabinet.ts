import {ChangeDetectionStrategy, Component, inject, OnInit} from '@angular/core';
import {Authentication} from '../../@core/auth/authentication';
import {CurrencyPipe, DatePipe} from '@angular/common';
import {UserDetails} from '../../entities/user-details';
import {ORDERS} from '../../mock/goals';
import {UserService} from '../../@core/services/user-service';

@Component({
  selector: 'app-cabinet',
  imports: [
    DatePipe,
    CurrencyPipe
  ],
  templateUrl: './cabinet.html',
  styleUrl: './cabinet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Cabinet implements OnInit {
  visible: boolean = false;
  userIsLoggedIn: boolean = false;
  userDetails: UserDetails | null = null;
  userFirstName: string = '';
  userLastName: string = '';
  private authService = inject(Authentication);
  private  userService = inject(UserService);


  ngOnInit(): void {
    this.subscribeToUserStatus();
    this.updateUserDetails();
  }

  private subscribeToUserStatus() {
    this.authService.loggedIn.subscribe((isLoggedIn: boolean) => {
      this.userIsLoggedIn = isLoggedIn;
    });

  }

  updateUserDetails() {
    this.userDetails = this.authService.getUserDetails(); // Get user details
    this.userLastName = this.userDetails?.familyName || '';
    this.userFirstName = this.userDetails?.givenName || '';
  }

  orders = ORDERS;
}
