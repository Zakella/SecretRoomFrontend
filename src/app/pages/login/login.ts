import {Component, inject} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, Validators} from '@angular/forms';
import { Authentication } from '../../@core/auth/authentication';
import {TranslocoPipe, TranslocoService} from '@ngneat/transloco';
import {Router, RouterLink} from '@angular/router';
import {ResetPassword} from '../reset-password/reset-password';
import {NgIf} from '@angular/common';
import {Language} from '../../@core/services/language';
import {FadeUp} from '../../@core/directives/fade-up';

@Component({
  selector: 'app-login',
  imports: [
    ResetPassword,
    FormsModule,
    NgIf,
    TranslocoPipe,
    RouterLink,
    FadeUp
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  showReset = false;

  badCredentials: boolean = false
  visible: boolean = false;

  errorMessage: string | null = null;

  loading: boolean = false;

  passwordVisible: boolean = false;
  isSuccess: boolean = false;
  private langService = inject(Language);
  public activeLang = this.langService.currentLanguage
  form!: FormGroup;
  restoreForm!: FormGroup;
  processing:boolean = false;
  constructor(private fb: FormBuilder,
              private auth: Authentication,
              private router: Router,
              private translocoService: TranslocoService) {

    this.form = this.fb.group({
      email: ["", [Validators.pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)]],
      password: ["", Validators.required],
    });


    this.restoreForm = this.fb.group({
      email: ["", [Validators.pattern(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/)]],
    });

  }


/*  onSubmit() {
    if (this.form.valid) {
      this.processing = true;
      const email = this.form.value.email || '';
      const password = this.form.value.password || '';
      const user: User = new User(email, password, "", "");

      this.auth.login(user).subscribe({
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
  }*/


  showDialog() {
    this.visible = true;
  }

  onSubmitRestore() {
    if (this.restoreForm.valid) {
      const email = this.restoreForm.value.email;
      const lang = localStorage.getItem('lang') || "ro"; // Get lang from localStorage
      if (email) {
        this.loading = true;
        this.auth.restorePassword(email, lang)
          .subscribe({
            next: () => {
              this.visible = false;
              this.loading = false;
              this.errorMessage = null;
              this.isSuccess = true; // Set isSuccess to true
              this.restoreForm.controls['email'].reset();
            },
            error: (err) => {
              this.loading = false;
              if (err.status === 404) {
                this.errorMessage =  this.translocoService.translate(`errors.userWithEmail`, { email: email });
              } else {
                const errorKey = 'serverError';
                this.errorMessage = this.translocoService.translate(`errors.${errorKey}` );
              }
            }
          });
      }
    }
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }
  email: string = '';
  password: string = '';

  onSubmit() {
    if (this.email && this.password) {
      // Здесь будет логика входа, например вызов сервиса аутентификации
      alert(`Вход для ${this.email} выполнен!`);
    }
  }
}
