import { TestBed } from '@angular/core/testing';
import { RankingViewComponent } from './ranking-view.component';

describe('RankingViewComponent', () => {
  it('renders the empty state when there is no active room', async () => {
    const fixture = await TestBed.configureTestingModule({
      imports: [RankingViewComponent],
    }).createComponent(RankingViewComponent);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No active room');
  });
});
