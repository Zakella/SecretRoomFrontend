import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalCertificate } from './modal-certificate';

describe('ModalCertificate', () => {
  let component: ModalCertificate;
  let fixture: ComponentFixture<ModalCertificate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalCertificate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalCertificate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
