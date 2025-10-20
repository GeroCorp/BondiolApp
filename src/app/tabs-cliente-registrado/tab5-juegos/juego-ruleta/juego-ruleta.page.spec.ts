import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JuegoRuletaPage } from './juego-ruleta.page';

describe('JuegoRuletaPage', () => {
  let component: JuegoRuletaPage;
  let fixture: ComponentFixture<JuegoRuletaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(JuegoRuletaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
