import { createServer } from 'node:http';
import next from 'next';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { WebSocketServer } from 'ws';
import { getRequiredServerEnv } from '../config/serverEnv.ts';

const dev = !process.argv.includes('--production');
Reflect.set(process.env, 'NODE_ENV', dev ? 'development' : 'production');

const port = Number(process.env.PORT || 3001);
const hostname = process.env.HOSTNAME || '0.0.0.0';
const app = next({ dev, hostname, port });

async function startBackend() {
  await app.prepare();
  const handleRequest = app.getRequestHandler();
  const handleUpgrade = app.getUpgradeHandler();
  const server = createServer((request, response) => handleRequest(request, response));
  const liveServer = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    if (pathname === '/api/live') {
      liveServer.handleUpgrade(request, socket, head, (client) => {
        liveServer.emit('connection', client, request);
      });
      return;
    }
    handleUpgrade(request, socket, head);
  });

  liveServer.on('connection', async (client) => {
    try {
      const ai = new GoogleGenAI({
        apiKey: getRequiredServerEnv('GEMINI_API_KEY'),
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const sessionPromise = ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'You are the SankalpSetu Live Voice Assistant created for platform owner Danish Khan (khandanish0503@gmail.com). Speak concisely and warmly to help users find nearby hospitals, register blood donations, or divide fundraising repayments.',
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              client.send(JSON.stringify({ inputTranscript: content.inputTranscription.text }));
            }
            if (content?.outputTranscription?.text) {
              client.send(JSON.stringify({ outputTranscript: content.outputTranscription.text }));
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                client.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (content?.interrupted) client.send(JSON.stringify({ interrupted: true }));
          },
          onerror: (error: ErrorEvent) => {
            if (client.readyState === client.OPEN) {
              client.send(JSON.stringify({ error: error.message || 'Live API stream notice' }));
            }
          },
        },
      });
      const session = await sessionPromise;
      client.send(JSON.stringify({ status: 'connected', model: 'gemini-3.8-live' }));
      client.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (parsed.text) {
            session.sendRealtimeInput({ text: String(parsed.text) });
          }
        } catch {
          // Ignore malformed client frames.
        }
      });
      client.on('close', () => {
        try {
          session.close?.();
        } catch {
          // Ignore close errors.
        }
      });
    } catch (error) {
      if (client.readyState === client.OPEN) {
        client.send(
          JSON.stringify({
            status: 'fallback',
            outputTranscript:
              'Live Voice Session Ready (SankalpSetu • Danish Khan): Ask about nearby hospitals, blood donation receipts, or Monthly/Yearly return division.',
            error: error instanceof Error ? error.message : 'Live voice service unavailable',
          })
        );
      }
    }
  });

  server.listen(port, hostname, () => {
    console.log(`Next.js API backend listening on http://${hostname}:${port}`);
  });
}

startBackend().catch((error) => {
  console.error('Failed to start Next.js API backend:', error);
  process.exitCode = 1;
});
