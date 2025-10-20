import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeAnonimoPage } from './home-anonimo.page';

describe('HomeAnonimoPage', () => {
  let component: HomeAnonimoPage;
  let fixture: ComponentFixture<HomeAnonimoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeAnonimoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
