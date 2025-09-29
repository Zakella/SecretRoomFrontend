import {ChangeDetectionStrategy, Component, inject, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {Authentication} from '../../@core/auth/authentication';
import {CurrencyPipe, DatePipe} from '@angular/common';
import {UserDetails} from '../../entities/user-details';

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
export class Cabinet  implements OnInit{
  visible: boolean = false;
  userIsLoggedIn: boolean = false;
  userDetails: UserDetails | null = null;
  userFirstName: string = '';
  userLastName: string = '';
  private router = inject(Router);
  private authService= inject(Authentication);




  ngOnInit(): void {
    this.subscribeToUserStatus();
    this.updateUserDetails();
  }

  private subscribeToUserStatus() {
    this.authService.loggedIn.subscribe((isLoggedIn: boolean) => {
      this.userIsLoggedIn = isLoggedIn;
    });

  }

  goToLogin() {
    this.router.navigate(['/login']);
    this.visible = false;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
    this.visible = false;
  }

  goToOrdersList() {
    this.router.navigate(['/myAccount']);
    this.visible = false;
  }


  updateUserDetails() {
    this.userDetails = this.authService.getUserDetails(); // Get user details
    this.userLastName = this.userDetails?.familyName || '';
    this.userFirstName = this.userDetails?.givenName || '';
  }
  orders = [
    {
      id: '100213',
      date: new Date('2025-07-26'),
      status: 'Доставлен',
      total: 59.99,
      items: [
        {
          title: 'Glow Nectar Face Oil',
          quantity: 1,
          price: 39.99,
          image: 'assets/images/demo/main.jpeg'
        },
        {
          title: 'Rose Lip Balm',
          quantity: 1,
          price: 20.00,
          image: 'assets/images/demo/main.jpeg'
        }
      ]
    },
    {
      id: '100212',
      date: new Date('2025-07-18'),
      status: 'В обработке',
      total: 25.00,
      items: [
        {
          title: 'Hydra Mist Toner',
          quantity: 1,
          price: 25.00,
          image: 'assets/images/demo/main.jpeg'
        }
      ]
    }
  ];
}
