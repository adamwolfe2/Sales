/**
 * Gemini Live API Integration for VendingPreneurs
 * Real-time audio streaming and objection detection
 */

const { BrowserWindow, ipcMain } = require('electron');
const { getSystemPrompt } = require('./prompts');

let messageBuffer = '';
let currentTranscription = '';
let systemAudioProc = null;
let isSessionActive = false;

function sendToRenderer(channel, data) {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    windows[0].webContents.send(channel, data);
  }
}

async function initializeGeminiSession(apiKey, geminiSessionRef) {
  if (isSessionActive) {
    console.log('Session already active');
    return false;
  }

  try {
    // Dynamic import for ESM module
    const { GoogleGenAI, Modality } = require('@google/genai');

    const client = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: { apiVersion: 'v1alpha' }
    });

    const systemPrompt = getSystemPrompt();

    sendToRenderer('status-update', 'Connecting to Gemini...');

    const session = await client.live.connect({
      model: 'gemini-2.5-flash-preview-native-audio-dialog',
      callbacks: {
        onopen: function() {
          isSessionActive = true;
          sendToRenderer('status-update', 'Connected - Listening...');
          sendToRenderer('session-connected', true);
        },
        onmessage: function(message) {
          // Handle input transcription (what the prospect/rep said)
          if (message.serverContent?.inputTranscription?.text) {
            const text = message.serverContent.inputTranscription.text;
            if (text.trim()) {
              currentTranscription += text;
              sendToRenderer('transcription-update', {
                type: 'input',
                text: currentTranscription
              });
            }
          }

          // Handle speaker diarization
          if (message.serverContent?.inputTranscription?.results) {
            const results = message.serverContent.inputTranscription.results;
            results.forEach(result => {
              if (result.transcript && result.speakerId !== undefined) {
                const speaker = result.speakerId === 1 ? 'REP' : 'PROSPECT';
                sendToRenderer('speaker-update', {
                  speaker,
                  text: result.transcript
                });
              }
            });
          }

          // Handle AI suggestions (output transcription)
          if (message.serverContent?.outputTranscription?.text) {
            const text = message.serverContent.outputTranscription.text;
            if (text.trim()) {
              const isNew = messageBuffer === '';
              messageBuffer += text;
              sendToRenderer(isNew ? 'new-suggestion' : 'update-suggestion', messageBuffer);
            }
          }

          // Generation complete
          if (message.serverContent?.generationComplete) {
            if (messageBuffer.trim()) {
              sendToRenderer('suggestion-complete', messageBuffer);
              // Analyze for objection patterns
              analyzeForObjections(currentTranscription);
            }
            messageBuffer = '';
            currentTranscription = '';
          }

          if (message.serverContent?.turnComplete) {
            sendToRenderer('status-update', 'Listening...');
          }
        },
        onerror: function(e) {
          console.error('Session error:', e.message);
          sendToRenderer('status-update', 'Error: ' + e.message);
          sendToRenderer('session-error', e.message);
        },
        onclose: function(e) {
          console.log('Session closed:', e?.reason || 'unknown');
          isSessionActive = false;
          sendToRenderer('status-update', 'Disconnected');
          sendToRenderer('session-connected', false);
        }
      },
      config: {
        responseModalities: [Modality.TEXT],
        outputAudioTranscription: {},
        inputAudioTranscription: {
          enableSpeakerDiarization: true,
          minSpeakerCount: 2,
          maxSpeakerCount: 2
        },
        contextWindowCompression: { slidingWindow: {} },
        speechConfig: { languageCode: 'en-US' },
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      }
    });

    geminiSessionRef.current = session;
    return true;

  } catch (error) {
    console.error('Failed to initialize Gemini:', error);
    sendToRenderer('status-update', 'Failed to connect');
    sendToRenderer('session-error', error.message);
    return false;
  }
}

function analyzeForObjections(transcription) {
  if (!transcription) return;

  const text = transcription.toLowerCase();

  // Common objection patterns to detect
  const objectionPatterns = [
    { pattern: /don'?t have (the )?(capital|funds|money)/i, id: 'price_no_capital', name: 'No Capital' },
    { pattern: /(expensive|more than|thought|expected)/i, id: 'sticker_shock', name: 'Sticker Shock' },
    { pattern: /(talk to|speak with|ask) (my )?(wife|husband|spouse|partner)/i, id: 'authority_spouse', name: 'Spouse Objection' },
    { pattern: /(not ready|start later|few months|next year)/i, id: 'timing_not_ready', name: 'Timing' },
    { pattern: /(think about|sleep on|research|get back)/i, id: 'think_about_it', name: 'Think About It' },
    { pattern: /(do it myself|figure.*out|don'?t need|on my own)/i, id: 'diy_myself', name: 'DIY' },
    { pattern: /(business pay|wait until|profitable first)/i, id: 'business_pay', name: 'Business Pay' },
    { pattern: /(how does|financing|payment plan|credit)/i, id: 'financing_how', name: 'Financing Questions' },
    { pattern: /(find locations|done for me|expect more)/i, id: 'price_expect_more', name: 'Expect More' },
    { pattern: /(business partner|consultant|advisor)/i, id: 'authority_partner', name: 'Partner/Consultant' }
  ];

  const detected = [];
  objectionPatterns.forEach(({ pattern, id, name }) => {
    if (pattern.test(text)) {
      detected.push({ id, name });
    }
  });

  if (detected.length > 0) {
    sendToRenderer('objections-detected', detected);
  }

  // Check for danger patterns
  if (detected.length >= 3) {
    sendToRenderer('danger-alert', {
      type: 'three_objections',
      message: '3+ objections detected - Win rate drops to 31%',
      action: 'Re-qualify: "On a scale of 1-10, how serious are you about starting in the next 90 days?"'
    });
  }

  // Check for dangerous combos
  const hasPrice = detected.some(d => d.id.includes('price'));
  const hasAuthority = detected.some(d => d.id.includes('authority'));
  if (hasPrice && hasAuthority) {
    sendToRenderer('danger-alert', {
      type: 'price_authority_combo',
      message: 'DANGER: Price + Authority combo detected - 18% win rate',
      action: '1. Address financing FIRST\n2. Schedule three-way call with spouse\n3. DO NOT send info and wait'
    });
  }
}

async function sendAudioToGemini(base64Data, geminiSessionRef) {
  if (!geminiSessionRef.current || !isSessionActive) return;

  try {
    await geminiSessionRef.current.sendRealtimeInput({
      audio: {
        data: base64Data,
        mimeType: 'audio/pcm;rate=24000'
      }
    });
  } catch (error) {
    console.error('Error sending audio:', error);
  }
}

async function closeSession(geminiSessionRef) {
  try {
    stopAudioCapture();
    if (geminiSessionRef.current) {
      await geminiSessionRef.current.close();
      geminiSessionRef.current = null;
    }
    isSessionActive = false;
    sendToRenderer('session-connected', false);
    sendToRenderer('status-update', 'Disconnected');
  } catch (error) {
    console.error('Error closing session:', error);
  }
}

function stopAudioCapture() {
  if (systemAudioProc) {
    systemAudioProc.kill('SIGTERM');
    systemAudioProc = null;
  }
}

function setupGeminiHandlers(geminiSessionRef, mainWindow) {
  ipcMain.handle('gemini-connect', async (event, apiKey) => {
    const success = await initializeGeminiSession(apiKey, geminiSessionRef);
    return { success };
  });

  ipcMain.handle('gemini-disconnect', async () => {
    await closeSession(geminiSessionRef);
    return { success: true };
  });

  ipcMain.handle('gemini-send-audio', async (event, { data, mimeType }) => {
    if (!geminiSessionRef.current || !isSessionActive) {
      return { success: false, error: 'No active session' };
    }

    try {
      await geminiSessionRef.current.sendRealtimeInput({
        audio: { data, mimeType }
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('gemini-send-text', async (event, text) => {
    if (!geminiSessionRef.current || !isSessionActive) {
      return { success: false, error: 'No active session' };
    }

    try {
      await geminiSessionRef.current.sendRealtimeInput({ text });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-session-status', () => {
    return { active: isSessionActive };
  });
}

module.exports = {
  initializeGeminiSession,
  sendAudioToGemini,
  closeSession,
  stopAudioCapture,
  setupGeminiHandlers,
  sendToRenderer
};
