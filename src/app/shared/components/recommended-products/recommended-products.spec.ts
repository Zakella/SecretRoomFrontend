import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecommendedProducts } from './recommended-products';

describe('RecommendedProducts', () => {
  let component: RecommendedProducts;
  let fixture: ComponentFixture<RecommendedProducts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecommendedProducts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecommendedProducts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
