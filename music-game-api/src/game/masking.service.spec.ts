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

  it('keeps Chinese aliases answerable after normalization', () => {
    const answers = service.buildAnswerSet('晴天', ['天晴']);
    expect(answers).toContain('晴天');
    expect(answers).toContain('天晴');
  });

  it('masks Chinese song titles inside local lyrics', () => {
    const masked = service.maskLyrics('你說這一句晴天值得再猜一回。', '晴天');
    expect(masked).not.toContain('晴天');
    expect(masked).toContain('••');
  });
});
