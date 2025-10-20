import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab1MenuAnonimoPage } from './tab1-menu-anonimo.page';

describe('Tab1MenuAnonimoPage', () => {
  let component: Tab1MenuAnonimoPage;
  let fixture: ComponentFixture<Tab1MenuAnonimoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab1MenuAnonimoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
