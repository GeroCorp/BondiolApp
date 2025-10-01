import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab1MenuPage } from './tab1-menu.page';

describe('Tab1MenuPage', () => {
  let component: Tab1MenuPage;
  let fixture: ComponentFixture<Tab1MenuPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab1MenuPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
