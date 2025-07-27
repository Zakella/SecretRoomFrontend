import { TestBed } from '@angular/core/testing';

import { AccesGuard } from './acces-guard';

describe('AccesGuard', () => {
  let service: AccesGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccesGuard);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
