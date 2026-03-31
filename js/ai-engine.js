// ============================================================
// AI Engine — Gemini API integration (Cloud-based fallback)
// ============================================================

import { getSetting } from './storage.js';

let isReady = false;

const callbacks = {
  onProgress: null,
  onReady: null,
  onError: null,
};

export function setCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

export function getStatus() {
  return { isLoading: false, isReady, currentModel: 'Gemini 1.5 Flash' };
}

// Check if API key is loaded
export async function checkApiKey() {
  const key = await getSetting('gemini_api_key');
  isReady = !!key;
  if (isReady && callbacks.onReady) {
    callbacks.onReady('Gemini 1.5 Flash');
  }
  return isReady;
}

export async function generateResponse(messages, onToken) {
  const apiKey = await getSetting('gemini_api_key');
  if (!apiKey) {
    throw new Error('API Key missing. Please set your Gemini API key in Settings.');
  }

  // Format messages for Gemini API
  let systemInstruction = null;
  const contents = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = { parts: [{ text: msg.content }] };
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  }

  const payload = { contents };
  if (systemInstruction) {
    payload.systemInstruction = systemInstruction;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}&alt=sse`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch from Gemini API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          if (!dataStr || dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (textChunk) {
              fullResponse += textChunk;
              if (onToken) onToken(fullResponse);
            }
          } catch (e) {
            console.error('Failed to parse stream chunk:', e);
          }
        }
      }
    }

    return fullResponse;
  } catch (err) {
    console.error('Generation error:', err);
    throw err;
  }
}

export async function generateCodeResponse(prompt, onToken) {
  const messages = [
    {
      role: 'system',
      content: 'You are an expert software developer and programming tutor. When asked to write code, provide clean, well-commented code with explanations. Use markdown code blocks with language identifiers. Be concise but thorough.',
    },
    { role: 'user', content: prompt },
  ];
  return generateResponse(messages, onToken);
}

export async function resetEngine() {
  // Not needed for stateless API
}

export function isModelReady() {
  return isReady;
}

