import { parseVoiceCommand, stripWakeWord } from './voiceCommands';

describe('stripWakeWord', () => {
  it('retire « Ok SOTACIB »', () => {
    expect(stripWakeWord('Ok SOTACIB, montre-moi mes validations')).toBe('montre-moi mes validations');
  });
});

describe('parseVoiceCommand', () => {
  it('ouvre les validations', () => {
    expect(parseVoiceCommand('Ok SOTACIB, montre-moi mes validations')).toMatchObject({ type: 'navigate', path: '/' });
  });

  it('ouvre une demande par son numéro (chiffres ou lettres)', () => {
    expect(parseVoiceCommand('ouvre la demande 17')).toMatchObject({ type: 'navigate', path: '/requests/17' });
    expect(parseVoiceCommand('ouvre la demande dix-sept')).toMatchObject({ type: 'navigate', path: '/requests/17' });
  });

  it('comprend quelques mots de darija', () => {
    expect(parseVoiceCommand('warini talabet')).toMatchObject({ type: 'navigate', path: '/requests' });
  });

  it('ouvre les pages principales', () => {
    expect(parseVoiceCommand('nouvelle demande')).toMatchObject({ path: '/requests/new' });
    expect(parseVoiceCommand('statistiques')).toMatchObject({ path: '/admin/stats' });
    expect(parseVoiceCommand('affiche l’organigramme')).toMatchObject({ path: '/admin/orgchart' });
  });

  it('transmet les vraies questions à l’assistant', () => {
    expect(parseVoiceCommand('où en est la demande 17 ?')).toMatchObject({ type: 'ask' });
    expect(parseVoiceCommand('combien de brouillons ai-je')).toMatchObject({ type: 'ask' });
  });
});
