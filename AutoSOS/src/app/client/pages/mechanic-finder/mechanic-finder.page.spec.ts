import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MechanicFinderPage } from './mechanic-finder.page';

describe('MechanicFinderPage', () => {
  let component: MechanicFinderPage;
  let fixture: ComponentFixture<MechanicFinderPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MechanicFinderPage ],
      imports: []
    })
    .compileComponents();

    fixture = TestBed.createComponent(MechanicFinderPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 