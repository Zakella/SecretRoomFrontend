import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VsList } from './vs-list';

describe('VsList', () => {
  let component: VsList;
  let fixture: ComponentFixture<VsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
