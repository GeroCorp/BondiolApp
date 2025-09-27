import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistrarClientePage } from './registrar-cliente.page';

describe('RegistrarClientePage', () => {
  let component: RegistrarClientePage;
  let fixture: ComponentFixture<RegistrarClientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegistrarClientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
