import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRequests } from '../services/requestService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiArrowUpRight, FiCalendar, FiCheckCircle, FiClock, FiDollarSign, FiFileText, FiInbox, FiLayers, FiTool, FiTrendingUp, FiUser, FiUserPlus } from 'react-icons/fi';

const ValidatorDashboard = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await getRequests();
        setRequests(data);
      } catch (error) {
        toast.error('Erreur chargement des validations');
      }
    };
    loadRequests();
  }, []);

  const pendingForMe = useMemo(
    () =>
      requests.filter(
        (req) =>
          req.status === 'in_progress' &&
          (Number(req.assignedTo) === Number(user?.id) || Number(req.assignee?.id) === Number(user?.id)) &&
          Number(req.createdBy) !== Number(user?.id)
      ),
    [requests, user]
  );

  const statsCards = [
    { title: 'En attente de vous', value: pendingForMe.length, tone: 'amber' },
    { title: 'Total à traiter chargé', value: requests.filter((r) => r.status === 'in_progress').length, tone: 'blue' },
  ];

  /* ---------- Présentation ---------- */

  const workflowMeta = (type) => {
    const map = {
      AvanceCaisse: { label: 'Avance sur caisse', icon: FiDollarSign },
      CreationClient: { label: 'Création client', icon: FiUserPlus },
      Investissement: { label: 'Investissement', icon: FiTrendingUp },
      AvisTechnique: { label: 'Avis technique', icon: FiTool },
    };
    return map[type] || { label: type, icon: FiFileText };
  };

  const daysWaiting = (req) => {
    const since = new Date(req.updatedAt || req.createdAt);
    return Math.max(0, Math.floor((Date.now() - since.getTime()) / 86400000));
  };

  const urgency = (days) => {
    if (days >= 7) return { label: 'Urgent', color: '#d64545' };
    if (days >= 3) return { label: 'À traiter', color: '#e8591a' };
    return { label: 'Récent', color: '#2f9e6b' };
  };

  const formatDate = (value) =>
    new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  const sortedPending = [...pendingForMe].sort((a, b) => daysWaiting(b) - daysWaiting(a));
  const oldest = sortedPending[0] ? daysWaiting(sortedPending[0]) : 0;

  const byType = pendingForMe.reduce((acc, req) => {
    acc[req.workflowType] = (acc[req.workflowType] || 0) + 1;
    return acc;
  }, {});

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : '';

  return (
    <div className="ui-page">
      {/* Bandeau d'accueil */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#1b1b1a] px-6 py-8 text-white sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(232,89,26,0.45),transparent_65%)] blur-2xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
              <span className="h-px w-6 bg-brand-500" />
              Espace validateur{user?.role ? ` · ${user.role}` : ''}
            </p>
            <h1 className="mt-5 max-w-2xl font-['Inter_Tight'] text-4xl font-extralight leading-[1.05] tracking-[-0.04em] sm:text-5xl">
              Bonjour {firstName},
              <br />
              {pendingForMe.length > 0 ? (
                <>
                  <span className="font-normal text-brand-400">{pendingForMe.length}</span> demande{pendingForMe.length > 1 ? 's' : ''} vous attend{pendingForMe.length > 1 ? 'ent' : ''}.
                </>
              ) : (
                <>tout est <span className="font-normal text-emerald-300">à jour</span>.</>
              )}
            </h1>
          </div>

          {sortedPending[0] && (
            <Link
              to={`/requests/${sortedPending[0].id}`}
              className="group inline-flex items-center gap-4 self-start rounded-full bg-white py-2 pl-6 pr-2 text-sm font-medium text-[#1b1b1a] transition-colors hover:bg-brand-500 hover:text-white lg:self-auto"
            >
              Traiter la plus ancienne
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b1b1a] text-white transition-transform duration-300 group-hover:rotate-45">
                <FiArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          )}
        </div>

        <div className="relative mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4">
          {[
            { label: statsCards[0].title, value: statsCards[0].value, icon: FiInbox },
            { label: 'En cours (total)', value: statsCards[1].value, icon: FiLayers },
            { label: 'Plus ancienne', value: pendingForMe.length ? `${oldest} j` : '—', icon: FiClock },
            { label: 'Types concernés', value: Object.keys(byType).length, icon: FiFileText },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-[#1b1b1a]/95 px-5 py-4">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-stone-500">
                <Icon className="h-3 w-3" /> {label}
              </p>
              <p className="mt-2 font-['Inter_Tight'] text-3xl font-extralight tracking-[-0.03em]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_320px]">
        {/* File d'attente */}
        <div>
          <div className="mb-4 flex items-end justify-between border-b border-[var(--line)] pb-3">
            <div>
              <span className="ui-eyebrow">File d’attente</span>
              <h2 className="mt-2 font-['Inter_Tight'] text-2xl font-light tracking-[-0.03em] text-[var(--ink)]">
                Demandes en attente de validation
              </h2>
            </div>
            <span className="text-xs text-[var(--muted)]">{pendingForMe.length} demande(s)</span>
          </div>

          {pendingForMe.length === 0 ? (
            <div className="ui-card ui-empty">
              <div className="ui-empty-icon">
                <FiCheckCircle className="h-6 w-6" />
              </div>
              <h3 className="ui-empty-title">Aucune demande en attente</h3>
              <p className="ui-empty-text">Toutes vos validations sont à jour</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPending.map((req, index) => {
                const meta = workflowMeta(req.workflowType);
                const WorkflowIcon = meta.icon;
                const days = daysWaiting(req);
                const level = urgency(days);
                return (
                  <Link
                    key={req.id}
                    to={`/requests/${req.id}`}
                    className="group relative flex flex-col gap-4 overflow-hidden rounded-[1.1rem] border border-[var(--line)] bg-[var(--surface)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_24px_44px_-22px_rgba(27,27,26,0.45)] sm:flex-row sm:items-center animate-fade-up"
                    style={{ animationDelay: `${Math.min(index, 9) * 50}ms` }}
                  >
                    <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: level.color }} />

                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#1b1b1a] text-white transition-colors duration-300 group-hover:bg-brand-500">
                        <WorkflowIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] tracking-wider text-[var(--muted)]">{req.reference}</p>
                        <h3 className="mt-0.5 truncate font-['Inter_Tight'] text-xl font-light tracking-[-0.02em] text-[var(--ink)]">
                          {meta.label}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                          <span className="flex items-center gap-1.5"><FiUser className="h-3 w-3" /> {req.creator?.fullName || 'N/A'}</span>
                          <span className="flex items-center gap-1.5"><FiCalendar className="h-3 w-3" /> {formatDate(req.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-5 sm:justify-end">
                      <div className="text-right">
                        <p className="font-['Inter_Tight'] text-2xl font-light tabular-nums leading-none text-[var(--ink)]">
                          {days}<span className="ml-0.5 text-sm text-[var(--muted)]">j</span>
                        </p>
                        <p className="mt-1 flex items-center justify-end gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: level.color }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: level.color }} />
                          {level.label}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] py-1.5 pl-4 pr-1.5 text-sm font-medium text-[var(--app-bg)] transition-colors group-hover:bg-brand-500 group-hover:text-white">
                        Traiter
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-bg)] text-[var(--ink)] transition-transform duration-300 group-hover:rotate-45">
                          <FiArrowUpRight className="h-4 w-4" />
                        </span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-5 xl:sticky xl:top-24">
          <div className="ui-card p-5">
            <p className="ui-stat-label">Par type de processus</p>
            {Object.keys(byType).length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">Aucune demande en attente.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {Object.entries(byType).map(([type, count]) => {
                  const meta = workflowMeta(type);
                  const TypeIcon = meta.icon;
                  const pct = Math.round((count / pendingForMe.length) * 100);
                  return (
                    <li key={type}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-[var(--ink)]">
                          <TypeIcon className="h-3.5 w-3.5 text-brand-500" /> {meta.label}
                        </span>
                        <span className="tabular-nums text-[var(--muted)]">{count}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
                        <div className="h-full rounded-full bg-[var(--ink)]" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="ui-card p-5">
            <p className="ui-stat-label">Légende des délais</p>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                ['Récent', 'moins de 3 jours', '#2f9e6b'],
                ['À traiter', '3 à 6 jours', '#e8591a'],
                ['Urgent', '7 jours et plus', '#d64545'],
              ].map(([label, desc, color]) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="h-6 w-1 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[var(--ink)]">{label}</span>
                  <span className="ml-auto text-xs text-[var(--muted)]">{desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            to="/requests"
            className="group flex items-center justify-between rounded-[1.1rem] border border-[var(--line)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--ink-2)]"
          >
            <div>
              <p className="ui-stat-label">Raccourci</p>
              <p className="mt-1 font-['Inter_Tight'] text-lg font-light text-[var(--ink)]">Mes propres demandes</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink)] transition-transform duration-300 group-hover:rotate-45">
              <FiArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ValidatorDashboard;
