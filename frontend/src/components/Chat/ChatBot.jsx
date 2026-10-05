import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSend, FiX, FiCopy, FiCheck, FiRefreshCw, FiSquare, FiMic } from 'react-icons/fi';
import api from '../services/api';
import { getFallbackReply } from './chatbotUtils';
import ChatMarkdown from './ChatMarkdown';
import AssistantAvatar from '../Assistant/AssistantAvatar';
import useSpeechRecognition from '../Assistant/useSpeechRecognition';
import { parseVoiceCommand } from '../Assistant/voiceCommands';

// Réponses qui font sourire l'avatar
const HAPPY_PATTERN = /(approuv[ée]e|✅|tout est à jour|à jour 👍|validée par)/i;

// Lecture vocale courte (confirmation des commandes vocales)
const speak = (text) => {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    // synthèse vocale indisponible
  }
};

const WELCOME_MESSAGE = {
  sender: 'bot',
  text: 'Bonjour ! Je peux vous aider sur les **demandes**, les **workflows**, les **statuts** et les **validations**.',
  welcome: true,
};

const SUGGESTIONS = ['Mes demandes en cours', 'Créer une demande', 'Que dois-je valider ?'];

const CONVERSATION_KEY = 'sotacib-assistant-conversation';
const HINT_KEY = 'sotacib-assistant-hint-seen';

const loadConversation = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CONVERSATION_KEY) || 'null');
    if (Array.isArray(saved) && saved.length) {
      // une réponse interrompue par un rechargement n'est plus "en cours"
      return saved.map((message) => ({ ...message, streaming: false }));
    }
  } catch (e) {
    // stockage indisponible
  }
  return [WELCOME_MESSAGE];
};

const hasSeenHint = () => {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch (e) {
    return true;
  }
};

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHint, setShowHint] = useState(() => !hasSeenHint());
  const [messages, setMessages] = useState(loadConversation);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [happy, setHappy] = useState(false);
  const [voiceBubble, setVoiceBubble] = useState(null);
  const panelRef = useRef(null);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const sendMessageRef = useRef(null);
  const navigate = useNavigate();

  // Commandes vocales : navigation directe ou question posée à l'assistant
  const handleVoiceResult = (spokenText) => {
    const command = parseVoiceCommand(spokenText);
    if (command.type === 'navigate') {
      setIsOpen(false);
      navigate(command.path);
      setVoiceBubble(`J’ouvre **${command.label}**`);
      speak(`J'ouvre ${command.label}`);
      setHappy(true);
      setTimeout(() => setHappy(false), 2500);
      setTimeout(() => setVoiceBubble(null), 2800);
    } else if (command.type === 'ask') {
      setVoiceBubble(null);
      setIsOpen(true);
      sendMessageRef.current?.(command.text);
    }
  };

  const voice = useSpeechRecognition({ onResult: handleVoiceResult });

  // Bulle « je vous écoute » avec la transcription en direct
  useEffect(() => {
    if (voice.listening) setVoiceBubble('listening');
    else if (voiceBubble === 'listening') setVoiceBubble(null);
  }, [voice.listening]);

  useEffect(() => {
    if (!voice.error) return undefined;
    setVoiceBubble(voice.error);
    const timer = setTimeout(() => { setVoiceBubble(null); voice.setError(null); }, 3500);
    return () => clearTimeout(timer);
  }, [voice.error]);

  const toggleVoice = () => {
    dismissHint();
    if (voice.listening) voice.stop();
    else voice.start();
  };

  // L'avatar sourit quand une réponse annonce une validation / tout est à jour
  const lastBot = [...messages].reverse().find((m) => m.sender === 'bot');
  const lastBotDone = lastBot && !lastBot.streaming && !lastBot.welcome ? lastBot.text : '';
  useEffect(() => {
    if (lastBotDone && HAPPY_PATTERN.test(lastBotDone)) {
      setHappy(true);
      const timer = setTimeout(() => setHappy(false), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lastBotDone]);

  const mood = voice.listening ? 'listening' : sending ? 'thinking' : happy ? 'happy' : 'idle';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Conserve la conversation pendant la session (changement de page)
  useEffect(() => {
    try {
      sessionStorage.setItem(CONVERSATION_KEY, JSON.stringify(messages));
    } catch (e) {
      // ignoré
    }
  }, [messages]);

  // Défilement automatique vers le dernier message
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Annule une réponse en cours si le composant est démonté
  useEffect(() => () => abortRef.current?.abort(), []);

  const dismissHint = () => {
    setShowHint(false);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch (e) {
      // ignoré
    }
  };

  const openPanel = () => {
    dismissHint();
    setIsOpen((prev) => !prev);
  };

  // Remplace le texte du dernier message (la réponse en cours de l'assistant)
  const updateLastBotMessage = (updater) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.sender === 'bot') {
        next[next.length - 1] = updater(last);
      }
      return next;
    });
  };

  // Affiche un texte connu d'avance mot par mot (réponse de secours)
  const typeText = async (text, signal) => {
    const parts = text.split(/(\s+)/);
    for (const part of parts) {
      if (signal.aborted) return;
      updateLastBotMessage((message) => ({ ...message, text: message.text + part }));
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMessage = { sender: 'user', text: trimmed };
    const conversation = [...messages.filter((m) => !m.welcome), userMessage];

    setMessages((prev) => [...prev, userMessage, { sender: 'bot', text: '', streaming: true }]);
    setInput('');
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const payloadMessages = conversation.map((message) => ({
      role: message.sender === 'user' ? 'user' : 'assistant',
      content: message.text,
    }));

    let received = '';
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api.defaults.baseURL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: payloadMessages, stream: true }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.delta) {
              received += event.delta;
              updateLastBotMessage((message) => ({ ...message, text: message.text + event.delta }));
            }
          } catch (e) {
            // ligne incomplète : ignorée
          }
        }
      }

      if (!received.trim()) {
        await typeText(getFallbackReply(trimmed), controller.signal);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('ChatBot API error:', err);
        if (!received.trim()) {
          await typeText(getFallbackReply(trimmed), controller.signal);
        }
      }
    } finally {
      updateLastBotMessage((message) => ({ ...message, streaming: false }));
      if (abortRef.current === controller) abortRef.current = null;
      setSending(false);
    }
  };

  sendMessageRef.current = sendMessage;

  const stopGeneration = () => {
    abortRef.current?.abort();
  };

  const newConversation = () => {
    abortRef.current?.abort();
    setMessages([WELCOME_MESSAGE]);
    setInput('');
    setSending(false);
    setCopiedIndex(null);
  };

  const copyMessage = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 1500);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const onlyWelcome = messages.length === 1 && messages[0].welcome;

  return (
    <div className="relative flex items-center gap-1.5" ref={panelRef}>
      {/* Commande vocale */}
      {voice.supported && (
        <button
          onClick={toggleVoice}
          className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-150 ${
            voice.listening
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--ink-2)] hover:text-[var(--ink)]'
          }`}
          title={voice.listening ? 'Arrêter l’écoute' : 'Commande vocale : « Ok SOTACIB, montre-moi mes validations »'}
          aria-label="Commande vocale"
        >
          {voice.listening && <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/40" />}
          <FiMic size={16} className="relative" />
        </button>
      )}

      {/* Avatar animé = bouton de l'assistant */}
      <button
        onClick={openPanel}
        className="relative rounded-full transition-transform duration-200 hover:scale-105"
        title="Assistant SOTACIB"
        aria-label="Ouvrir l'assistant SOTACIB"
      >
        <AssistantAvatar mood={mood} size={42} />
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
          {showHint && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />}
          <span className={`relative inline-flex h-3 w-3 rounded-full ring-2 ring-[var(--app-bg)] ${showHint ? 'bg-brand-500' : 'bg-emerald-400'}`} />
        </span>
      </button>

      {/* Bulle vocale : écoute en cours, confirmation ou erreur */}
      {voiceBubble && !isOpen && (
        <div className="absolute right-0 top-full z-50 mt-3 w-72 animate-scale-in rounded-2xl bg-[#1b1b1a] p-4 text-white shadow-2xl">
          <span className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 bg-[#1b1b1a]" />
          {voiceBubble === 'listening' ? (
            <>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-400">
                <span className="flex items-end gap-0.5">
                  <span className="h-2 w-0.5 animate-pulse rounded bg-brand-400" />
                  <span className="h-3 w-0.5 animate-pulse rounded bg-brand-400 [animation-delay:150ms]" />
                  <span className="h-2 w-0.5 animate-pulse rounded bg-brand-400 [animation-delay:300ms]" />
                </span>
                Je vous écoute…
              </p>
              <p className="mt-2 min-h-[1.5rem] font-['Inter_Tight'] text-lg font-light leading-snug">
                {voice.transcript || <span className="text-stone-500">« Montre-moi mes validations »</span>}
              </p>
              <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
                Ex. : « ouvre la demande 17 », « nouvelle demande », « statistiques », « où en est ma demande ? »
              </p>
            </>
          ) : (
            <div className="text-sm [&_strong]:text-brand-300"><ChatMarkdown text={voiceBubble} /></div>
          )}
        </div>
      )}

      {/* Info-bulle affichée la première fois */}
      {showHint && !isOpen && !voiceBubble && (
        <div className="absolute right-0 top-full z-50 mt-3 w-64 animate-scale-in rounded-2xl bg-[#1b1b1a] p-4 text-white shadow-2xl">
          <span className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 bg-[#1b1b1a]" />
          <div className="flex items-start gap-3">
            <AssistantAvatar mood="happy" size={36} className="flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Nouveau : l’assistant SOTACIB</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-400">Posez vos questions sur vos demandes, les workflows et les validations{voice.supported ? ', ou parlez-lui avec le micro 🎤' : ''}.</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={openPanel}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#1b1b1a] transition hover:bg-brand-500 hover:text-white"
                >
                  Essayer
                </button>
                <button
                  onClick={dismissHint}
                  className="rounded-full px-3 py-1.5 text-xs text-stone-400 transition hover:text-white"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 flex h-[560px] max-h-[calc(100vh-6rem)] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl shadow-slate-900/20 animate-scale-in">
          {/* En-tête */}
          <div className="relative flex items-center justify-between gap-3 overflow-hidden bg-[#1b1b1a] px-4 py-3.5 text-white">
            <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(232,89,26,0.45),transparent_65%)]" />
            <div className="relative flex min-w-0 items-center gap-3">
              <AssistantAvatar mood={mood} size={40} className="flex-shrink-0" />
              <div className="min-w-0">
                <p className="whitespace-nowrap text-sm font-semibold">Assistant SOTACIB</p>
                <p className="flex items-center gap-1.5 truncate text-[11px] text-stone-400">
                  <span className={`h-1.5 w-1.5 rounded-full ${sending ? 'animate-pulse bg-brand-400' : 'bg-emerald-400'}`} />
                  {sending ? 'En train d’écrire…' : 'Disponible pour vous aider'}
                </p>
              </div>
            </div>
            <div className="relative flex flex-shrink-0 items-center">
              <button
                onClick={newConversation}
                disabled={onlyWelcome}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-medium text-stone-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                title="Nouvelle conversation"
              >
                <FiRefreshCw size={13} />
                Nouvelle conversation
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                aria-label="Fermer"
              >
                <FiX size={17} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[var(--app-bg)] px-4 py-4">
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isBot = message.sender === 'bot';
                const isEmptyStreaming = isBot && message.streaming && !message.text;
                return (
                  <div key={`${message.sender}-${index}`} className={`group flex gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}>
                    {isBot && (
                      <AssistantAvatar
                        mood={message.streaming ? 'thinking' : 'idle'}
                        size={28}
                        animated={Boolean(message.streaming)}
                        className="mt-0.5 flex-shrink-0"
                      />
                    )}
                    <div className={`flex max-w-[85%] flex-col ${isBot ? 'items-start' : 'items-end'}`}>
                      <div
                        className={`px-3.5 py-2.5 text-sm leading-6 ${
                          isBot
                            ? 'rounded-2xl rounded-tl-md border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)]'
                            : 'rounded-2xl rounded-tr-md bg-[#1b1b1a] text-white'
                        }`}
                      >
                        {isEmptyStreaming ? (
                          <span className="flex items-center gap-1 py-1.5">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:120ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:240ms]" />
                          </span>
                        ) : isBot ? (
                          <>
                            <ChatMarkdown text={message.text} onNavigate={() => setIsOpen(false)} />
                            {message.streaming && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-brand-500" />}
                          </>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.text}</p>
                        )}
                      </div>

                      {isBot && !message.welcome && !message.streaming && message.text && (
                        <button
                          onClick={() => copyMessage(message.text, index)}
                          className="mt-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[var(--muted)] opacity-0 transition hover:text-[var(--ink)] focus:opacity-100 group-hover:opacity-100"
                          title="Copier la réponse"
                        >
                          {copiedIndex === index ? <FiCheck size={12} className="text-emerald-600" /> : <FiCopy size={12} />}
                          {copiedIndex === index ? 'Copié' : 'Copier'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Suggestions */}
              {onlyWelcome && (
                <div className="flex flex-wrap gap-2 pl-9">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--ink-2)] transition hover:border-brand-500 hover:bg-brand-500 hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Saisie */}
          <form onSubmit={handleSend} className="border-t border-[var(--line-soft)] bg-[var(--surface)] p-3">
            <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--app-bg)] py-1 pl-4 pr-1 transition focus-within:border-[var(--ink-2)]">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={voice.listening ? (voice.transcript || 'Je vous écoute…') : 'Écrire un message...'}
                className="flex-1 border-0 !bg-transparent py-1.5 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
              />
              {voice.supported && !sending && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                    voice.listening ? 'bg-brand-500 text-white' : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
                  }`}
                  title={voice.listening ? 'Arrêter l’écoute' : 'Dicter un message'}
                >
                  <FiMic size={15} />
                </button>
              )}
              {sending ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1b1b1a] text-white transition hover:bg-red-600"
                  title="Arrêter la réponse"
                >
                  <FiSquare size={13} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Envoyer"
                >
                  <FiSend size={15} />
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
