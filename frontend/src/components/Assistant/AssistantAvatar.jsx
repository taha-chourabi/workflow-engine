import React from 'react';

/**
 * Avatar animé de l'assistant SOTACIB : un ouvrier avec un casque de chantier.
 * mood :
 *  - "idle"      : cligne des yeux de temps en temps, flotte légèrement
 *  - "thinking"  : regarde vers le haut, points de réflexion au-dessus du casque
 *  - "listening" : ondes sonores autour de la tête, bouche ouverte
 *  - "happy"     : grand sourire, yeux plissés, petites étincelles
 */
const AssistantAvatar = ({ mood = 'idle', size = 40, className = '', animated = true }) => {
  const thinking = mood === 'thinking';
  const listening = mood === 'listening';
  const happy = mood === 'happy';
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const glowId = `avatar-glow-${uid}`;
  const clipId = `avatar-clip-${uid}`;

  // Décalage des pupilles : vers le haut quand il réfléchit
  const pupilDx = thinking ? 1.2 : 0;
  const pupilDy = thinking ? -1.6 : 0;

  return (
    <span
      className={`relative inline-flex items-center justify-center ${animated && mood === 'idle' ? 'sotacib-avatar-float' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Ondes quand il écoute */}
      {listening && (
        <>
          <span className="absolute inset-0 rounded-full border-2 border-brand-500/60 sotacib-avatar-wave" />
          <span className="absolute inset-0 rounded-full border-2 border-brand-500/40 sotacib-avatar-wave [animation-delay:0.5s]" />
        </>
      )}

      <svg viewBox="0 0 64 64" width={size} height={size} className="relative drop-shadow-sm">
        {/* Fond */}
        <circle cx="32" cy="32" r="31" fill="#1b1b1a" />
        <circle cx="32" cy="32" r="31" fill={`url(#${glowId})`} />
        <defs>
          <radialGradient id={glowId} cx="0.75" cy="0.2" r="0.8">
            <stop offset="0" stopColor="#e8591a" stopOpacity="0.55" />
            <stop offset="0.6" stopColor="#e8591a" stopOpacity="0" />
          </radialGradient>
          <clipPath id={clipId}>
            <circle cx="32" cy="32" r="31" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          {/* Corps / gilet */}
          <path d="M12 64 C12 50 20 45 32 45 C44 45 52 50 52 64 Z" fill="#e8591a" />
          <path d="M26 45 L32 55 L38 45" fill="none" stroke="#fbfaf7" strokeWidth="2.2" strokeLinejoin="round" />
          <rect x="16" y="54" width="32" height="2.4" fill="#fbfaf7" opacity="0.85" />

          {/* Cou */}
          <rect x="28" y="40" width="8" height="6" rx="2" fill="#e9b894" />

          {/* Visage */}
          <ellipse cx="32" cy="32" rx="12.5" ry="13" fill="#f2c7a2" />
          {/* Oreilles */}
          <ellipse cx="19.6" cy="33" rx="2" ry="3" fill="#e9b894" />
          <ellipse cx="44.4" cy="33" rx="2" ry="3" fill="#e9b894" />

          {/* Joues (plus rosées quand il est content) */}
          <ellipse cx="24.5" cy="37" rx="2.4" ry="1.5" fill="#e8591a" opacity={happy ? 0.45 : 0.2} />
          <ellipse cx="39.5" cy="37" rx="2.4" ry="1.5" fill="#e8591a" opacity={happy ? 0.45 : 0.2} />

          {/* Yeux */}
          {happy ? (
            <>
              <path d="M24.5 32 Q27 29.4 29.5 32" fill="none" stroke="#1b1b1a" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M34.5 32 Q37 29.4 39.5 32" fill="none" stroke="#1b1b1a" strokeWidth="1.8" strokeLinecap="round" />
            </>
          ) : (
            <g className={animated && (mood === 'idle' || listening) ? 'sotacib-avatar-blink' : ''} style={{ transformOrigin: '32px 31.5px' }}>
              <ellipse cx="27" cy="31.5" rx="2.6" ry="3" fill="#fff" />
              <ellipse cx="37" cy="31.5" rx="2.6" ry="3" fill="#fff" />
              <circle cx={27 + pupilDx} cy={31.8 + pupilDy} r="1.55" fill="#1b1b1a" />
              <circle cx={37 + pupilDx} cy={31.8 + pupilDy} r="1.55" fill="#1b1b1a" />
              <circle cx={27.6 + pupilDx} cy={31.1 + pupilDy} r="0.5" fill="#fff" />
              <circle cx={37.6 + pupilDx} cy={31.1 + pupilDy} r="0.5" fill="#fff" />
            </g>
          )}

          {/* Sourcils */}
          <path
            d={thinking ? 'M24 26.6 L29.5 25.6 M34.5 25.2 L40 26.8' : 'M24 27 L29.5 26.4 M34.5 26.4 L40 27'}
            stroke="#5c3a24"
            strokeWidth="1.3"
            strokeLinecap="round"
          />

          {/* Bouche */}
          {happy && <path d="M26.5 37.2 Q32 43.5 37.5 37.2 Q32 39.4 26.5 37.2 Z" fill="#8a2f12" />}
          {listening && <ellipse cx="32" cy="39" rx="2.4" ry="2" fill="#8a2f12" />}
          {thinking && <path d="M29 39.4 Q31.5 38.6 34.5 39.6" fill="none" stroke="#8a2f12" strokeWidth="1.5" strokeLinecap="round" />}
          {mood === 'idle' && <path d="M28 38.2 Q32 41.2 36 38.2" fill="none" stroke="#8a2f12" strokeWidth="1.6" strokeLinecap="round" />}

          {/* Casque de chantier blanc (ciment blanc) avec bande orange */}
          <path d="M17.5 26 C17.5 15 24 10 32 10 C40 10 46.5 15 46.5 26 Z" fill="#fbfaf7" />
          <path d="M30 10.4 L30 25.6 M34 10.4 L34 25.6" stroke="#e2ddd3" strokeWidth="1.2" />
          <rect x="15" y="24.6" width="34" height="3.6" rx="1.8" fill="#fbfaf7" stroke="#e2ddd3" strokeWidth="0.8" />
          <rect x="18.5" y="20.2" width="27" height="2.4" rx="1.2" fill="#e8591a" />
        </g>

        {/* Étincelles de joie */}
        {happy && (
          <g className="sotacib-avatar-sparkle" fill="#fbbf24">
            <path d="M52 12 l1.2 2.6 l2.6 1.2 l-2.6 1.2 l-1.2 2.6 l-1.2 -2.6 l-2.6 -1.2 l2.6 -1.2 Z" />
            <path d="M10 16 l0.8 1.8 l1.8 0.8 l-1.8 0.8 l-0.8 1.8 l-0.8 -1.8 l-1.8 -0.8 l1.8 -0.8 Z" />
          </g>
        )}
      </svg>

      {/* Bulles de réflexion */}
      {thinking && (
        <span className="absolute -right-1 -top-1.5 flex items-end gap-0.5">
          <span className="h-1 w-1 rounded-full bg-brand-500 sotacib-avatar-dot" />
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 sotacib-avatar-dot [animation-delay:0.15s]" />
          <span className="h-2 w-2 rounded-full bg-brand-500 sotacib-avatar-dot [animation-delay:0.3s]" />
        </span>
      )}
    </span>
  );
};

export default AssistantAvatar;
