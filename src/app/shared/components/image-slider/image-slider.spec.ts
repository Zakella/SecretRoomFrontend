import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageSlider } from './image-slider';

describe('ImageSlider', () => {
  let component: ImageSlider;
  let fixture: ComponentFixture<ImageSlider>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageSlider]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageSlider);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
