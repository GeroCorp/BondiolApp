import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsMaitrePage } from './tabs-maitre.page';

describe('TabsMaitrePage', () => {
  let component: TabsMaitrePage;
  let fixture: ComponentFixture<TabsMaitrePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsMaitrePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
