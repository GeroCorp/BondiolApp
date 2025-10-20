import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JuegoAdivinanzaPage } from './juego-adivinanza.page';

describe('JuegoAdivinanzaPage', () => {
  let component: JuegoAdivinanzaPage;
  let fixture: ComponentFixture<JuegoAdivinanzaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(JuegoAdivinanzaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
