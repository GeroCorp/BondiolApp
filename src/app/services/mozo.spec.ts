import { TestBed } from '@angular/core/testing';

import { Mozo } from './mozo';

describe('Mozo', () => {
  let service: Mozo;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Mozo);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
