import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentFail } from './payment-fail';

describe('PaymentFail', () => {
  let component: PaymentFail;
  let fixture: ComponentFixture<PaymentFail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentFail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentFail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
