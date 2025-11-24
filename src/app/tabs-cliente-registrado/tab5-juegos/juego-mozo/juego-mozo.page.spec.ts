import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JuegoMozoPage } from './juego-mozo.page';

describe('JuegoMozoPage', () => {
  let component: JuegoMozoPage;
  let fixture: ComponentFixture<JuegoMozoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(JuegoMozoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
