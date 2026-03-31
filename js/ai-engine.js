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
  const contents = [];
  let systemText = '';

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemText += msg.content + '\n\n';
    } else {
      let text = msg.content;
      if (systemText && (msg.role === 'user' || msg.role === 'user')) {
        text = systemText + text;
        systemText = ''; // prepend to first message only
      }
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: text }]
      });
    }
  }

  const payload = { contents };
  let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${apiKey}&alt=sse`;

  try {
    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Auto-discover models if 404 Not Found (Regional/GCP restrictions)
    if (response.status === 404) {
      console.warn('gemini-pro not found, querying ListModels API...');
      const listReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (listReq.ok) {
        const listData = await listReq.json();
        const fallback = listData.models.find(m => m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('gemini'));
        
        if (fallback) {
          const fallbackName = fallback.name.split('/')[1]; // Strip "models/"
          console.log('Auto-fallback to: ' + fallbackName);
          url = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackName}:streamGenerateContent?key=${apiKey}&alt=sse`;
          
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
      }
    }

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

