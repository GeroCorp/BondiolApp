import { TestBed } from '@angular/core/testing';

import { ClienteAnonimoService } from './cliente-anonimo.service';

describe('ClienteAnonimoService', () => {
  let service: ClienteAnonimoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClienteAnonimoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
