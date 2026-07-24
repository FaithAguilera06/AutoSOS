import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServiceRequestsPage } from './service-requests.page';

describe('ServiceRequestsPage', () => {
  let component: ServiceRequestsPage;
  let fixture: ComponentFixture<ServiceRequestsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ServiceRequestsPage ],
      imports: []
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceRequestsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 