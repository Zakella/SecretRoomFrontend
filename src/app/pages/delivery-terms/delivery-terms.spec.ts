import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryTerms } from './delivery-terms';

describe('DeliveryTerms', () => {
  let component: DeliveryTerms;
  let fixture: ComponentFixture<DeliveryTerms>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryTerms]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryTerms);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
