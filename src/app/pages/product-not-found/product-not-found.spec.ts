import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductNotFound } from './product-not-found';

describe('ProductNotFound', () => {
  let component: ProductNotFound;
  let fixture: ComponentFixture<ProductNotFound>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductNotFound]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductNotFound);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
