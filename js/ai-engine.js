// ============================================================
// AI Engine — WebLLM integration with graceful fallback
// ============================================================

let engine = null;
let isLoading = false;
let isReady = false;
let currentModel = null;

const callbacks = {
  onProgress: null,
  onReady: null,
  onError: null,
};

export function setCallbacks(cbs) {
  Object.assign(callbacks, cbs);
}

export function getStatus() {
  return { isLoading, isReady, currentModel };
}

export async function loadModel(modelId, progressCallback) {
  if (isLoading) return;
  isLoading = true;
  isReady = false;

  try {
    // Dynamically import WebLLM from CDN
    const webllm = await import('@mlc-ai/web-llm');

    // Check WebGPU support
    if (!navigator.gpu) {
      throw new Error('WebGPU is not supported in this browser. Please use Chrome 113+ or Edge 113+.');
    }

    const progressCb = (report) => {
      if (progressCallback) {
        progressCallback({
          progress: report.progress || 0,
          text: report.text || 'Loading...',
        });
      }
    };

    // Create the MLCEngine
    engine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: progressCb,
    });

    currentModel = modelId;
    isReady = true;
    isLoading = false;

    if (callbacks.onReady) callbacks.onReady(modelId);
    return true;
  } catch (err) {
    isLoading = false;
    isReady = false;
    console.error('Failed to load model:', err);
    if (callbacks.onError) callbacks.onError(err.message);
    throw err;
  }
}

export async function generateResponse(messages, onToken) {
  if (!engine || !isReady) {
    throw new Error('Model not loaded. Please load a model in Settings first.');
  }

  try {
    const reply = await engine.chat.completions.create({
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });

    let fullResponse = '';
    for await (const chunk of reply) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullResponse += delta;
        if (onToken) onToken(fullResponse);
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
  if (engine) {
    try {
      await engine.resetChat();
    } catch (e) {
      // ignore
    }
  }
}

export function isModelReady() {
  return isReady;
}
