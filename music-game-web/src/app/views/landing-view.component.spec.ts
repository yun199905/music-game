import { TestBed } from '@angular/core/testing';
import { LandingViewComponent } from './landing-view.component';

describe('LandingViewComponent', () => {
  it('renders join mode fields and emits room code updates', async () => {
    const fixture = await TestBed.configureTestingModule({
      imports: [LandingViewComponent],
    }).createComponent(LandingViewComponent);

    fixture.componentRef.setInput('entryMode', 'join');
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.fieldChange.subscribe(spy);

    const inputs = fixture.nativeElement.querySelectorAll('input');
    const roomCodeInput = inputs[1] as HTMLInputElement;
    roomCodeInput.value = 'room1';
    roomCodeInput.dispatchEvent(new Event('input'));

    expect(fixture.nativeElement.textContent).toContain('Join an existing room');
    expect(spy).toHaveBeenCalledWith({ field: 'joinCode', value: 'room1' });
  });
});
