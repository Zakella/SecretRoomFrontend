import {Component, inject, OnInit} from '@angular/core';
import {UserDetails} from '../../@core/entities/user-details';
import {Router} from '@angular/router';
import {Authentication} from '../../@core/auth/authentication';

@Component({
  selector: 'app-cabinet',
  imports: [],
  templateUrl: './cabinet.html',
  styleUrl: './cabinet.scss'
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
}
