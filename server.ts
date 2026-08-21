import express from 'express';
import { GoogleGenAI, Modality } from '@google/genai';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as googleTTS from 'google-tts-api';

// If using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.post('/api/generate-audio', async (req, res) => {
  try {
    const { text, language, voice, speed } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Check if voice is a Free Model
    if (voice && voice.includes('Free Model')) {
      let langCode = 'en';
      if (voice.includes('Hindi')) langCode = 'hi';
      else if (voice.includes('Spanish')) langCode = 'es';
      else if (voice.includes('French')) langCode = 'fr';
      
      const numericSpeed = parseFloat(speed || '1.0');
      
      try {
        const results = await googleTTS.getAllAudioBase64(text, {
          lang: langCode,
          slow: numericSpeed < 1.0,
          host: 'https://translate.google.com',
          splitPunct: ',.?'
        });
        
        const buffers = results.map(r => Buffer.from(r.base64, 'base64'));
        const finalBuffer = Buffer.concat(buffers);
        
        res.setHeader('Content-Type', 'audio/mp3');
        return res.send(finalBuffer);
      } catch (freeErr: any) {
        throw new Error('Free Model TTS Error: ' + freeErr.message);
      }
    }
    
    let instruction = `Read the following text aloud exactly as written, naturally and fluently`;
    if (language && language !== 'auto') {
      instruction += ` in ${language}`;
    }
    instruction += `. Do not modify, summarize, or translate the text. Speak only the text:\n\n${text}`;
    
    const cleanVoiceName = voice ? voice.split(' ')[0] : 'Kore';
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: instruction }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: cleanVoiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio returned from Gemini.");
    }

    const pcmBuffer = Buffer.from(base64Audio, 'base64');
    
    // We want to stream the mp3 directly to the response
    res.setHeader('Content-Type', 'audio/mp3');
    // Using attachment to allow download if desired, but we can just serve it inline
    // res.setHeader('Content-Disposition', 'attachment; filename="generated-audio.mp3"');
    
    // We could apply speed using filter: '-filter:a', `atempo=${speed}` but let's test if atempo is needed. 
    // Usually atempo works between 0.5 and 2.0.
    const args = [
      '-f', 's16le',
      '-ar', '24000',
      '-ac', '1',
      '-i', 'pipe:0',
      '-b:a', '128k'
    ];
    
    const numericSpeed = parseFloat(speed || '1.0');
    if (numericSpeed !== 1.0 && numericSpeed >= 0.5 && numericSpeed <= 2.0) {
      args.push('-filter:a', `atempo=${numericSpeed}`);
    }
    
    args.push('-f', 'mp3', 'pipe:1');
    
    const ffmpeg = spawn('ffmpeg', args);
    
    ffmpeg.stdout.pipe(res);
    
    ffmpeg.stderr.on('data', (d) => {
      // console.error(d.toString());
    });
    
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
         console.error('ffmpeg exited with code ' + code);
      }
    });
    
    ffmpeg.stdin.write(pcmBuffer);
    ffmpeg.stdin.end();

  } catch (err: any) {
    console.error('TTS Error:', err);
    // Note: if headers are already sent by ffmpeg, this might fail, but usually ffmpeg errors before stdout.
    if (!res.headersSent) {
      const errMsg = err.message || '';
      if (errMsg.includes('429') || errMsg.includes('quota')) {
        return res.status(429).json({ error: 'Premium AI quota exceeded. Please select a "Free Model" from the Voice Profile list instead.' });
      }
      res.status(500).json({ error: errMsg || 'Failed to generate audio' });
    }
  }
});

async function startServer() {
  if (!isProd) {
    const vite = await import('vite');
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

startServer();
