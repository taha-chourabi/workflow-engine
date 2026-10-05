import { getFallbackReply } from './chatbotUtils';

describe('getFallbackReply', () => {
  it('returns a greeting for hello messages', () => {
    expect(getFallbackReply('bonjour')).toContain('Bonjour');
  });

  it('returns a validation guidance reply for validation requests', () => {
    const reply = getFallbackReply('je veux valider une demande');
    expect(reply).toContain('validation');
  });
});
