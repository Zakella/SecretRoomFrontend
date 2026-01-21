import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FadeUp} from '../../@core/directives/fade-up';
import {NgIf} from '@angular/common';

type Step = 'information' | 'shipping' | 'payment';
export interface Review {
  user: string;
  avatar: string;
  rating: number;
  date: string;
  text: string;
  images?: string[];
}

@Component({
  selector: 'app-checkout',
  imports: [
    FadeUp,
    NgIf
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Checkout {
  step: Step = 'information';

  goTo(step: Step) {
    this.step = step;
  }


  totalRating = 4.8;
  totalCount = 125;

  bars = [
    { label: 'Excellent', value: 100 },
    { label: 'Good', value: 11 },
    { label: 'Average', value: 3 },
    { label: 'Below Average', value: 8 },
    { label: 'Poor', value: 1 }
  ];

  reviews: Review[] = [
    {
      user: 'Grace Carey',
      avatar: 'https://i.pravatar.cc/50?img=1',
      rating: 4,
      date: '24 January,2023',
      text: `I was a bit nervous to be buying a secondhand phone from Amazon, but I couldn’t be happier
      with my purchase!! ... Highly recommend!!!`
    },
    {
      user: 'Ronald Richards',
      avatar: 'https://i.pravatar.cc/50?img=2',
      rating: 5,
      date: '24 January,2023',
      text: `This phone has 1T storage and is durable. Plus all the new iPhones have a C port! ...`
    },
    {
      user: 'Darcy King',
      avatar: 'https://i.pravatar.cc/50?img=3',
      rating: 3,
      date: '24 January,2023',
      text: `I might be the only one to say this but the camera is a little funky. Hoping it will change with a software update...`,
      images: [
        'https://via.placeholder.com/60',
        'https://via.placeholder.com/60'
      ]
    }
  ];

  showAll = false;

  toggle() {
    this.showAll = !this.showAll;
  }

  get visibleReviews() {
    return this.showAll ? this.reviews : this.reviews.slice(0, 2);
  }

  get starsArray() {
    return Array(5).fill(0);
  }

  /* cartItems: CartItem[] = [];
   selectedPayment: string[] = [];
   selectedPaymentValue: string = '';
   currentLang: string = 'ro';

   totalAmount: number = 0;
   loading: boolean = false;
   private ngUnsubscribe = new Subject<void>();



   shippingOptions: ShippingOption[] = [];
   selectedOption: ShippingOption | undefined = undefined;
   shippingCost: number = 0;
   form!: FormGroup;
   isLoading: boolean = false;


   constructor(private cartService: CartService,
               private fb: FormBuilder,
               private router: Router,
               private purchaseService: PurchaseService,
               private shippingService: ShippingService,
               private messageService: MessageService,
               private analyticsService: AnalyticsService,
               private languageService: LanguageService,
               private authService: AuthenticationService) {
   }

   ngOnInit(): void {
     this.isLoading = true; // Устанавливаем isLoading в true.


     forkJoin({
       formInit: this.initForm(),
       cartItems: this.loadCartItems(),
       shippingOptions: this.loadShippingOptions(),
       userDetails: this.checkUserDetails()
     }).subscribe({
       next: () => {

         if (this.shippingOptions.length > 0) {
           this.selectedOption = this.shippingOptions[0];
           this.form.controls['selectedValue'].setValue(this.selectedOption.id, {onlySelf: true});
           this.putAvailablePaymentOptions();
         }
         this.isLoading = false;
       },
       error: () => {
         this.isLoading = false;
       }
     });

     this.cardModified();
     this.subscribeToTotalAmount();
     this.subscribeToShippingOption();
     this.setLanguage();
   }

   setLanguage() {
     this.languageService.language$.subscribe(
       lang => {
         this.currentLang = lang;
       }
     );
   }


 // Инициализация формы
   private initForm() {
  /!*   return new Observable<void>((observer) => {
       this.form = this.fb.group({
         email: ["", [Validators.required, Validators.pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)]],
         country: {value: "Moldova, Republic of", disabled: true},
         name: ["", this.nameValidator],
         checked: this.fb.control(true),
         selectedValue: ["", Validators.required],
         lastname: ["", this.nameValidator],
         address: ["", [Validators.required, Validators.minLength(3)]],
         city: ["", this.nameValidator],
         zip: ["", [Validators.required, Validators.pattern(/^\d+$/)]],
         phone: ["", [Validators.required, Validators.pattern(/^0[67]\d{7}$/)]],
         payment: ["", Validators.required],
         iAgree: [false, Validators.required],
         delivery: "",
         comment: ""
       });
       observer.next();
       observer.complete();
     });*!/
   }

 // Загрузка товаров из корзины
   private loadCartItems() {
     return new Observable<void>((observer) => {
       this.cartItems = this.cartService.loadCartItemsFromStorage();
       if (this.cartItems.length === 0) {
         this.router.navigate(['empty-cart']);
       }
       observer.next();
       observer.complete();
     });
   }

 // Загрузка вариантов доставки
   private loadShippingOptions() {
     return this.shippingService.getShippingOptions().pipe(
       takeUntil(this.ngUnsubscribe),
       map((response) => {
         this.shippingOptions = response.map(option => {
           option.expectedDeliveryDescription = this.getDeliveryDate(option.expectedDeliveryFrom, option.expectedDeliveryTo);
           return option;
         });
       })
     );
   }

 // Проверка данных пользователя
   private checkUserDetails() {
     return new Observable<void>((observer) => {
       this.authService.loggedIn.subscribe(loggedIn => {
           if (this.form.controls['email']) {
             if (loggedIn) {
               this.setUserDetails();
               this.form.controls['email'].disable();
             } else {
               this.form.controls['email'].enable();
             }
           }
           observer.next();
           observer.complete();
         });
     });
   }


   private subscribeToTotalAmount() {
     this.cartService.totalAmount.pipe(takeUntil(this.ngUnsubscribe)).subscribe(
       (amount) => {
         this.totalAmount = amount;
         this.onTotalAmountChange(amount);
       }
     );
   }

   private onTotalAmountChange(amount: number) {
     if (this.selectedOption) {
       if (this.totalAmount >= this.selectedOption.freeShippingFrom) {
         this.shippingCost = 0;
       } else {
         this.shippingCost = this.selectedOption.cost;
       }
     }
   }

   private setUserDetails() {
     const userDetails = this.authService.getUserDetails();
     if (userDetails) {
       this.form.patchValue({
         name: userDetails.givenName,
         lastname: userDetails.familyName,
         email: userDetails.email
       });
     }
   }

   cardModified() {
     this.cartService.cartModified
       .subscribe(
         (data) => {
           if (data) {
             this.cartItems = this.cartService.cartItems.value;
           }
         }
       );
   }

   getDeliveryDate(minDays: number, maxDays: number): string {
     const current = new Date();
     const formatter = new Intl.DateTimeFormat('ru', {day: '2-digit', month: '2-digit', year: 'numeric'});

     const startDeliveryDate = formatter.format(new Date(current.getFullYear(), current.getMonth(), current.getDate() + minDays));
     const endDeliveryDate = formatter.format(new Date(current.getFullYear(), current.getMonth(), current.getDate() + maxDays));

     return `${startDeliveryDate} - ${endDeliveryDate}`;
   }

   placeOrder() {
     this.loading = true;
     const lang = localStorage.getItem('lang') || 'ro';
     const payment = this.form.get('payment')?.value || '';

     let purchase = new Purchase(
       this.createCustomer(),
       this.createShippingAddress(),
       this.createOrder(),
       this.createOrderItems(),
       this.setComment(),
       lang,
       payment,
     );


     this.purchaseService.placeOrder(purchase)
       .pipe(untilDestroyed(this))
       .subscribe({
         next: response => {

           this.handleResponse(response);
         },
         error: error => {
           this.loading = false;
           if (error.status === 0) {
             this.showError('Server is not responding. Please try again later.');
           } else {
             this.showError("Server error, try to refresh the page or contact us");
           }
           return throwError(() => new Error('Something bad happened; please try again later.'));
         }
       });
   }

   showError(summary: string) {
     this.messageService.add({
       severity: 'error',
       summary: summary,
       icon: "pi pi-times-circle"
     });
   }

   private createOrder() {
     const totalAmount = this.totalAmount;
     const orderQuantity = this.cartItems.reduce(
       (total, cartItem) => total + cartItem.quantity, 0);

     const selectedShippingOptionId = this.form.get('selectedValue')?.value ?? '';
     const selectedOption = this.shippingOptions.find(option => option.id === selectedShippingOptionId);

     const shippingCost = selectedOption?.cost || 0;

     const shippingAddress = this.createShippingAddress();
     const customer = this.createCustomer();

     return new Order(
       null,
       new Date(),
       selectedOption,
       shippingAddress,
       customer,
       shippingCost,
       orderQuantity,
       totalAmount,
       totalAmount + shippingCost,
     );
   }

   setShippingOptions(id: string) {
     this.form.controls['selectedValue'].setValue(id);
     this.selectedOption = this.shippingOptions.find(option => option.id === id);
     this.shippingCost = this.selectedOption?.cost || 0;
     this.onTotalAmountChange(this.totalAmount);

     if (this.selectedOption) {
       //   // Отправка события аналитики
       this.analyticsService.sendEvent('shipping_option_selected', {
         shipping_option_name: this.selectedOption.name
       });

       this.putAvailablePaymentOptions();

     }
   }

   //Метод не используется :)
   private subscribeToCartItems() {
     combineLatest([this.cartService.totalAmount, this.cartService.cartModified]).pipe(takeUntil(this.ngUnsubscribe)).subscribe(
       ([totalAmount, cartModified]) => {
         if (cartModified) {
           this.cartItems = this.cartService.cartItems.value;
         }
         this.totalAmount = totalAmount;
         if (this.cartItems.length === 0) {
           this.router.navigate(['empty-cart']);
         }
       }
     );
   }

   ngOnDestroy(): void {
     this.ngUnsubscribe.next();
     this.ngUnsubscribe.complete();
   }

   onSubmit() {
     if (this.form.valid) {
       this.analyticsService.sendEvent('order_submission');
       this.placeOrder();
     }
   }

   private subscribeToShippingOption() {
     this.shippingService.getShippingOptions()
       .pipe(takeUntil(this.ngUnsubscribe)).subscribe({
       next: response => {
         this.shippingOptions = response.map(option => {
           option.expectedDeliveryDescription = this.getDeliveryDate(option.expectedDeliveryFrom, option.expectedDeliveryTo);
           return option;
         });
       },
       error: error => {
         console.log(error);
       }
     });
   }

   private createOrderItems() {
     return this.cartItems.map(cartItem => {
       const product = cartItem.product;
       const unitPrice = product?.price ?? 0;
       return {
         product,
         sizeType: cartItem.size?.sizeType,
         amount: unitPrice * cartItem.quantity,
         quantity: cartItem.quantity
       };
     });
   }

   private createCustomer() {
     return new Customer(
       this.form.get('name')?.value ?? '',
       this.form.get('lastname')?.value ?? '',
       this.form.get('email')?.value ?? '',
       this.form.get('phone')?.value ?? '',
     );
   }

   private createShippingAddress() {
     return new Address(
       this.form.get('address')?.value ?? '',
       this.form.get('city')?.value ?? '',
       "Moldova, Republic of",
       this.form.get('zip')?.value ?? '',
       this.form.get('phone')?.value ?? ''
     );
   }

   markFieldAsTouched(fieldName: string) {
     const field = this.form.get(fieldName);
     if (field) {
       field.markAsTouched();
     }
   }

   private setComment() {
     return this.form.get('comment')?.value ?? '';
   }

   onPaymentSelect(payment: string): void {
     this.selectedPaymentValue = payment;
     this.form.controls['payment'].setValue(payment);
     this.analyticsService.sendEvent('payment_option_selected', {
       payment_option_name: payment
     });
   }

   private handleResponse(response: ResponsePurchase) {

     if (response.waitingForPayment && response.ok && response.paymentUrl) {
       window.location.href = response.paymentUrl;
     } else {
       this.cartService.clearCart();
       this.router.navigate([`/order-success/${response.orderTrackingNumber}`]);
       this.loading = false;
     }
   }


   private putAvailablePaymentOptions() {
     this.selectedPayment = [];
     if (this.selectedOption) {
       if (this.selectedOption.onlinePaymentAvailable) {
         this.selectedPayment.push('OnlinePayment');
       }

       if (this.selectedOption.cashOnDeliveryAvailable) {
         this.selectedPayment.push('CashOnDelivery');
       }

       if (this.selectedOption.cardOnDeliveryAvailable) {
         this.selectedPayment.push('CardOnDelivery');
       }

     }
   }

   disableSubmitButton() {
     return !this.form.valid || this.loading || this.form.get('iAgree')?.value === false;
   }*/
}
