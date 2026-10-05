import { useCallback, useEffect, useRef, useState } from 'react';

// Reconnaissance vocale du navigateur (Web Speech API, disponible dans Edge et Chrome).
const getRecognitionClass = () =>
  (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;

const ERROR_MESSAGES = {
  'not-allowed': 'Accès au micro refusé. Autorisez le micro dans votre navigateur.',
  'service-not-allowed': 'Accès au micro refusé. Autorisez le micro dans votre navigateur.',
  'no-speech': "Je n'ai rien entendu. Réessayez.",
  'audio-capture': 'Aucun micro détecté.',
  network: 'La reconnaissance vocale nécessite une connexion Internet.',
};

const useSpeechRecognition = ({ lang = 'fr-FR', onResult } = {}) => {
  const RecognitionClass = getRecognitionClass();
  const supported = Boolean(RecognitionClass);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const start = useCallback(() => {
    if (!RecognitionClass || listening) return;
    const recognition = new RecognitionClass();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    let finalText = '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      setTranscript((finalText + interim).trim());
    };
    recognition.onerror = (event) => {
      if (event.error !== 'aborted') setError(ERROR_MESSAGES[event.error] || 'La reconnaissance vocale a échoué.');
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (finalText.trim()) onResultRef.current?.(finalText.trim());
    };

    setError(null);
    setTranscript('');
    setListening(true);
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setListening(false);
      setError('Impossible de démarrer le micro.');
    }
  }, [RecognitionClass, lang, listening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { supported, listening, transcript, error, start, stop, setError };
};

export default useSpeechRecognition;
