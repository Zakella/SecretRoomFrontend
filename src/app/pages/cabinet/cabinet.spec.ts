import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cabinet } from './cabinet';

describe('Cabinet', () => {
  let component: Cabinet;
  let fixture: ComponentFixture<Cabinet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cabinet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Cabinet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
