import { TestBed } from '@angular/core/testing';

import { ConcinaBar } from './concina-bar';

describe('ConcinaBar', () => {
  let service: ConcinaBar;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConcinaBar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
