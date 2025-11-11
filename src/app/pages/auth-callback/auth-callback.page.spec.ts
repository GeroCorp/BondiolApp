import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthCallbackPage } from './auth-callback.page';

describe('AuthCallbackPage', () => {
  let component: AuthCallbackPage;
  let fixture: ComponentFixture<AuthCallbackPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthCallbackPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
