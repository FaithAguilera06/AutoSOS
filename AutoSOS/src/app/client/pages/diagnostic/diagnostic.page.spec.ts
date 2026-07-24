import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiagnosticPage } from './diagnostic.page';

describe('DiagnosticPage', () => {
  let component: DiagnosticPage;
  let fixture: ComponentFixture<DiagnosticPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiagnosticPage ],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(DiagnosticPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 