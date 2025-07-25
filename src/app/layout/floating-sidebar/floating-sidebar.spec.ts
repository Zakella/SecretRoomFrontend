import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingSidebar } from './floating-sidebar';

describe('FloatingSidebar', () => {
  let component: FloatingSidebar;
  let fixture: ComponentFixture<FloatingSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingSidebar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FloatingSidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
