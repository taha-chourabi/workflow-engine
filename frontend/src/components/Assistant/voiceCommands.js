// Interprétation des commandes vocales (français + quelques mots de darija).
// Retourne { type: 'navigate', path, label } ou { type: 'ask', text }.

const normalize = (text = '') => String(text)
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[’']/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// « Ok SOTACIB, … » / « Salut SOTACIB … » : le mot d'appel est retiré
export const stripWakeWord = (text = '') =>
  String(text).replace(/^\s*(ok|okay|hey|salut|bonjour|ya)?\s*(sotacib|sota\s*cib|so\s*ta\s*sib|sotasib)[\s,.!:]*/i, '').trim();

// Nombres dits en lettres (« demande dix-sept ») → chiffres
const WORD_NUMBERS = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, 'dix sept': 17, 'dix huit': 18,
  'dix neuf': 19, vingt: 20, 'vingt et un': 21, 'vingt deux': 22, 'vingt trois': 23, 'vingt quatre': 24,
  'vingt cinq': 25, 'vingt six': 26, 'vingt sept': 27, 'vingt huit': 28, 'vingt neuf': 29, trente: 30,
};

const extractRequestNumber = (t) => {
  const digits = t.match(/\b(?:demande|dossier|numero|dem|n)\s*(?:numero|n)?\s*(\d{1,6})\b/) || t.match(/\bdem\s*0*(\d{1,6})\b/);
  if (digits) return Number(digits[1]);
  const spoken = t.replace(/-/g, ' ').match(/(?:demande|dossier|numero)\s+((?:[a-z]+\s?){1,4})/);
  if (spoken) {
    const words = spoken[1].trim();
    const keys = Object.keys(WORD_NUMBERS).sort((a, b) => b.length - a.length);
    const key = keys.find((k) => words.startsWith(k));
    if (key) return WORD_NUMBERS[key];
  }
  return null;
};

const SHOW = '(montre|montrez|affiche|afficher|ouvre|ouvrir|va|aller|allons|voir|voir mes|je veux voir|emmene|warini|warrini|7el|hel|hell|ahel)';

const ROUTES = [
  { pattern: /(nouvelle demande|creer une demande|cree une demande|faire une demande|ajouter une demande|demande jdida)/, path: '/requests/new', label: 'Nouvelle demande' },
  { pattern: /(mes validations|a valider|valider|validation|mes taches|a traiter)/, path: '/', label: 'Vos validations', needsShow: true },
  { pattern: /(mes demandes|les demandes|demandes|talabet|talbet|dossiers)/, path: '/requests', label: 'Mes demandes', needsShow: true },
  { pattern: /(tableau de bord|dashboard|accueil|page d accueil)/, path: '/', label: 'Tableau de bord' },
  { pattern: /(statistique|stats|analytique)/, path: '/admin/stats', label: 'Statistiques' },
  { pattern: /(organigramme|organisation|hierarchie)/, path: '/admin/orgchart', label: 'Organigramme' },
  { pattern: /(utilisateurs|comptes|inscriptions)/, path: '/admin/users', label: 'Utilisateurs' },
  { pattern: /(suivi des workflows|workflows|circuits)/, path: '/admin/workflows', label: 'Workflows' },
  { pattern: /(messages|messagerie|conversations|discussion)/, path: '/chats', label: 'Messages' },
];

export const parseVoiceCommand = (rawText = '') => {
  const text = stripWakeWord(rawText);
  const t = normalize(text);
  if (!t) return { type: 'none' };

  const hasShowVerb = new RegExp(`\\b${SHOW}\\b`).test(t);
  const isQuestion = /(\?|^(ou|quand|pourquoi|comment|combien|qui|quel|quelle|est ce|win|9adech|kifech)\b)/.test(t);

  // « ouvre la demande 17 » → page de la demande
  const number = extractRequestNumber(t);
  if (number && (hasShowVerb || /^(la )?demande/.test(t)) && !isQuestion) {
    return { type: 'navigate', path: `/requests/${number}`, label: `Demande DEM${String(number).padStart(6, '0')}` };
  }

  for (const route of ROUTES) {
    if (!route.pattern.test(t)) continue;
    if (route.needsShow && !hasShowVerb) continue;
    if (isQuestion && route.needsShow) continue;
    return { type: 'navigate', path: route.path, label: route.label };
  }

  // Tout le reste est une question pour l'assistant
  return { type: 'ask', text };
};
