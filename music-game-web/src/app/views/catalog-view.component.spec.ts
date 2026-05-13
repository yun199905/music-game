import { TestBed } from '@angular/core/testing';
import { CatalogViewComponent } from './catalog-view.component';

describe('CatalogViewComponent', () => {
  it('emits submitSong from the catalog action button', async () => {
    const fixture = await TestBed.configureTestingModule({
      imports: [CatalogViewComponent],
    }).createComponent(CatalogViewComponent);

    fixture.componentRef.setInput('catalogOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.submitSong.subscribe(spy);

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const button = buttons.find((element) => element.textContent?.includes('Add Song'))!;

    button.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
