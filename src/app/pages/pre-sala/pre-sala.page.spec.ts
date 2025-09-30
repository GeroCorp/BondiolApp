import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PreSalaPage } from './pre-sala.page';

describe('PreSalaPage', () => {
  let component: PreSalaPage;
  let fixture: ComponentFixture<PreSalaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PreSalaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
