import {inject, Injectable} from '@angular/core';
import {environment} from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import {Observable} from 'rxjs';
import { UserAccountInfo } from '../../entities/user-account-info';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = environment.apiUrl +'v1/users/accountInfo';
  private http = inject(HttpClient);

  getCustomerOrders(userEmail: string): Observable<UserAccountInfo> {
    return this.http.post<UserAccountInfo>(this.API_URL, {email: userEmail});
  }

}
