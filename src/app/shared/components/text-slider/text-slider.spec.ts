import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextSlider } from './text-slider';

describe('TextSlider', () => {
  let component: TextSlider;
  let fixture: ComponentFixture<TextSlider>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextSlider]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextSlider);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
