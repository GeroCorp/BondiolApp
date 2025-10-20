import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeneradorQrMesasPage } from './generador-qr-mesas.page';

describe('GeneradorQrMesasPage', () => {
  let component: GeneradorQrMesasPage;
  let fixture: ComponentFixture<GeneradorQrMesasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GeneradorQrMesasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
