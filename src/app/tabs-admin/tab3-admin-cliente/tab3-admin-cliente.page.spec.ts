import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tab3AdminClientePage } from './tab3-admin-cliente.page';

describe('Tab3AdminClientePage', () => {
  let component: Tab3AdminClientePage;
  let fixture: ComponentFixture<Tab3AdminClientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Tab3AdminClientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
