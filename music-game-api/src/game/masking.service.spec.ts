import { MaskingService } from './masking.service';

describe('MaskingService', () => {
  const service = new MaskingService();

  it('normalizes punctuation and spaces when building answer sets', () => {
    const answers = service.buildAnswerSet('想見你想見你想見你', ['想 見 你']);
    expect(answers).toContain('想見你想見你想見你');
    expect(answers).toContain('想見你');
  });

  it('masks direct title matches inside lyrics', () => {
    const masked = service.maskLyrics('我想見你想見你想見你 直到和你相遇', '想見你想見你想見你');
    expect(masked).not.toContain('想見你想見你想見你');
    expect(masked).toContain('•••••••••');
  });
});
