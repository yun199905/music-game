import { MaskingService } from './masking.service';

describe('MaskingService', () => {
  const service = new MaskingService();

  it('normalizes punctuation and spaces when building answer sets', () => {
    const answers = service.buildAnswerSet('Blinding Lights', [
      'Blinding-Lights',
    ]);
    expect(answers).toContain('blindinglights');
  });

  it('masks direct title matches inside lyrics', () => {
    const masked = service.maskLyrics(
      'The whole room glows when Blinding Lights hits the speakers.',
      'Blinding Lights',
    );
    expect(masked).not.toContain('Blinding Lights');
    expect(masked).toContain('•••••••••••••••');
  });
});
