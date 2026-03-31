// ============================================================
// Voice Module — Speech-to-Text & Text-to-Speech
// ============================================================

import { showToast } from './ui.js';

let recognition = null;
let isListening = false;
let currentUtterance = null;
let isSpeaking = false;

// Check support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesis = window.speechSynthesis;

export function isVoiceInputSupported() {
  return !!SpeechRecognition;
}

export function isVoiceOutputSupported() {
  return !!speechSynthesis;
}

export function initVoice() {
  if (!SpeechRecognition) {
    console.warn('Speech Recognition not supported');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.lang = 'en-US';
}

export function startListening(onResult, onEnd, onInterim) {
  if (!recognition) {
    showToast('Voice input not supported in this browser', 'error');
    return;
  }

  if (isListening) {
    stopListening();
    return;
  }

  isListening = true;
  let finalTranscript = '';

  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    if (onInterim && interimTranscript) onInterim(interimTranscript);
    if (finalTranscript && onResult) onResult(finalTranscript);
  };

  recognition.onerror = (event) => {
    isListening = false;
    if (event.error === 'no-speech') {
      showToast('No speech detected. Try again.', 'info');
    } else if (event.error === 'not-allowed') {
      showToast('Microphone access denied. Check permissions.', 'error');
    } else {
      showToast('Voice error: ' + event.error, 'error');
    }
    if (onEnd) onEnd();
  };

  recognition.onend = () => {
    isListening = false;
    if (onEnd) onEnd();
  };

  try {
    recognition.start();
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);
  } catch (e) {
    isListening = false;
    showToast('Could not start voice input', 'error');
    if (onEnd) onEnd();
  }
}

export function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
    isListening = false;
  }
}

export function getIsListening() {
  return isListening;
}

// Text-to-Speech
export function speakText(text, onEnd) {
  if (!speechSynthesis) {
    showToast('Text-to-speech not supported', 'error');
    return;
  }

  // Stop any current speech
  stopSpeaking();

  // Clean text — remove markdown syntax
  const cleanText = text
    .replace(/```[\s\S]*?```/g, 'code block omitted')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6} /gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~]/g, '')
    .trim();

  if (!cleanText) return;

  currentUtterance = new SpeechSynthesisUtterance(cleanText);
  currentUtterance.rate = 1.0;
  currentUtterance.pitch = 1.0;
  currentUtterance.volume = 1.0;

  // Try to find a good voice
  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(v =>
    v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Microsoft')
  ) || voices.find(v => v.lang.startsWith('en'));
  
  if (preferredVoice) {
    currentUtterance.voice = preferredVoice;
  }

  currentUtterance.onstart = () => {
    isSpeaking = true;
  };

  currentUtterance.onend = () => {
    isSpeaking = false;
    if (onEnd) onEnd();
  };

  currentUtterance.onerror = () => {
    isSpeaking = false;
    if (onEnd) onEnd();
  };

  speechSynthesis.speak(currentUtterance);
  if (navigator.vibrate) navigator.vibrate(30);
}

export function stopSpeaking() {
  if (speechSynthesis) {
    speechSynthesis.cancel();
    isSpeaking = false;
  }
}

export function getIsSpeaking() {
  return isSpeaking;
}
