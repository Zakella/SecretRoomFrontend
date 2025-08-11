import {inject, Injectable} from '@angular/core';
import {FormBuilder, Validators} from '@angular/forms';
import {Authentication} from '../../../@core/auth/authentication';
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  badCredentials: boolean = false
  private readonly fb = inject(FormBuilder);
  private authenticationService= inject(Authentication);
  private  router = inject(Router);
  processing:boolean = false;

  loginForm = this.fb.group({
    email: ["", [Validators.pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)]],
    password: ["", Validators.required],
  });




  onSubmit(user: any) {
    if (this.loginForm.valid) {
      this.processing = true;
      const email = this.loginForm.value.email || '';
      const password = this.loginForm.value.password || '';

      this.authenticationService.login(user).subscribe({
        next: (authResponse) => {
          localStorage.setItem('user', JSON.stringify(authResponse))
          this.router.navigate(['/myAccount']);

        },
        error: (err) => {
          if (err.status === 401) {
            this.badCredentials = true;
            setTimeout(() => this.badCredentials = false, 3000);

          }
        }
      });
    }
  }

}
