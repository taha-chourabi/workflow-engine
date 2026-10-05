import React from 'react';
import logo from '../../assets/sotacib-logo.jpg';
import ThemeToggle from '../Layout/ThemeToggle';

const highlights = [
  { title: 'Circuits de validation', text: 'Chaque demande suit son workflow, étape par étape.' },
  { title: 'Notifications ciblées', text: 'Le bon validateur est prévenu au bon moment.' },
  { title: 'Traçabilité complète', text: 'Historique des décisions et PDF récapitulatif.' },
];

const CrossMark = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);

// Mise en page partagée des écrans d'authentification (présentation uniquement).
const AuthShell = ({ title, subtitle, children, footer }) => (
  <div className="flex min-h-screen bg-[var(--app-bg)]">
    {/* Panneau éditorial */}
    <aside className="relative hidden w-[52%] flex-col justify-between overflow-hidden bg-[#1b1b1a] p-12 text-stone-100 lg:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '80px 80px' }}
      />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(232,89,26,0.22),transparent_65%)]" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-white p-0.5">
            <img src={logo} alt="SOTACIB" className="h-full w-full rounded-full object-contain" />
          </div>
          <div className="leading-tight">
            <p className="font-['Inter_Tight'] text-base font-medium tracking-tight">SOTACIB</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Workflow</p>
          </div>
        </div>
        <span className="rounded-full border border-white/15 px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] text-stone-400">
          Ciment blanc · depuis 1983
        </span>
      </div>

      <div className="relative">
        <CrossMark className="mb-10 h-12 w-12 text-brand-500" />
        <h2 className="max-w-xl font-['Inter_Tight'] text-[3.6rem] font-extralight leading-[0.98] tracking-[-0.045em]">
          Des processus
          <br />
          plus <span className="font-normal text-brand-400">solides</span>,
          <br />
          des décisions tracées.
        </h2>

        <div className="mt-14 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
          {highlights.map((item, index) => (
            <div key={item.title}>
              <p className="font-['Inter_Tight'] text-xs tabular-nums text-brand-400">{String(index + 1).padStart(2, '0')}</p>
              <p className="mt-2 text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-400">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="relative text-[11px] uppercase tracking-[0.18em] text-stone-600">
        Société Tuniso-Andalouse de Ciment Blanc
      </p>
    </aside>

    {/* Formulaire */}
    <main className="relative flex flex-1 flex-col">
      <div className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2 lg:invisible">
          <div className="h-9 w-9 overflow-hidden rounded-full bg-white p-0.5 ring-1 ring-[var(--line)]">
            <img src={logo} alt="SOTACIB" className="h-full w-full rounded-full object-contain" />
          </div>
          <span className="font-['Inter_Tight'] text-base font-medium tracking-tight text-[var(--ink)]">SOTACIB</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-8 pb-16">
        <div className="w-full max-w-md animate-fade-up">
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            <span className="h-px w-8 bg-brand-500" /> Espace sécurisé
          </p>
          <h1 className="mt-5 font-['Inter_Tight'] text-5xl font-light leading-none tracking-[-0.04em] text-[var(--ink)]">{title}</h1>
          {subtitle && <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">{subtitle}</p>}
          <div className="mt-10">{children}</div>
          {footer && <div className="mt-10 border-t border-[var(--line)] pt-6 text-sm text-[var(--muted)]">{footer}</div>}
        </div>
      </div>
    </main>
  </div>
);

export default AuthShell;
