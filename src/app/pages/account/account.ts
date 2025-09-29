import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'app-account',
  imports: [],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Account{
 /* userAccount: UserAccountInfo = new UserAccountInfo([]);
  orders: Order[] = [];
  displayOrders: Order[] = [];
  searchQuery: Subject<string> = new Subject<string>();

  constructor(private userService: UserService, private router: Router) { }

  ngOnInit() {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "null") {
      const userDetails: UserDetails = JSON.parse(storedUser);
      const email = userDetails.email;

      this.userService.getCustomerOrders(email)
        .pipe(untilDestroyed(this))
        .subscribe({
          next: (data: UserAccountInfo) => {
            this.userAccount = data;
            this.orders = this.userAccount.orders;
            this.displayOrders = this.orders;

          },
          error: (err: any) => {
            console.log(err);
            this.router.navigate(["account-not-found"]);
          }
        });

      this.searchQuery.pipe(
        debounceTime(300)
      ).pipe(untilDestroyed(this)).subscribe((query: string) => this.searchOrders(query));
    }
  }

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.next(query);
  }

  searchOrders(query: string) {
    if (query === "") {
      this.displayOrders = this.orders;
      return;
    }

    const queryNumber = Number(query);
    if (isNaN(queryNumber)) {
      return;
    }

    this.displayOrders = this.orders.filter((order: Order) => order.id === queryNumber);
  }*/
}
