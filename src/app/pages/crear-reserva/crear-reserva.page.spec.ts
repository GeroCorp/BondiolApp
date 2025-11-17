import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrearReservaPage } from './crear-reserva.page';

describe('CrearReservaPage', () => {
  let component: CrearReservaPage;
  let fixture: ComponentFixture<CrearReservaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearReservaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
