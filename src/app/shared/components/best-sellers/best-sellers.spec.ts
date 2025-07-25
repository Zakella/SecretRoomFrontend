import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BestSellers } from './best-sellers';

describe('BestSellers', () => {
  let component: BestSellers;
  let fixture: ComponentFixture<BestSellers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BestSellers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BestSellers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
