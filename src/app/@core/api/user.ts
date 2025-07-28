import { Injectable } from '@angular/core';
import {environment} from '../../../environments/environment';
import {HttpClient} from '@angular/common/http';
import {UserAccountInfo} from '../entities/user-account-info';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class User {
  private readonly API_URL = environment.apiUrl +'v1/users/accountInfo';

  constructor(private http: HttpClient) {
  }

  getCustomerOrders(userEmail: string): Observable<UserAccountInfo> {
    return this.http.post<UserAccountInfo>(this.API_URL, {email: userEmail});
  }
}
