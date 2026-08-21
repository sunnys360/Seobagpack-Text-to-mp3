/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Download, Settings, RefreshCw, AudioLines, FileAudio, CheckCircle2, AlertCircle, Backpack, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const VOICES = [
  'Kore (Premium AI)', 
  'Puck (Premium AI)', 
  'Charon (Premium AI)', 
  'Fenrir (Premium AI)', 
  'Zephyr (Premium AI)', 
  'Aoede (Premium AI)',
  'Anna (Free Model - English)',
  'Aarav (Free Model - Hindi)',
  'Amelie (Free Model - French)',
  'Carmen (Free Model - Spanish)'
];
const LANGUAGES = [
  { value: 'auto', label: 'Auto Detect (Default)' },
  { value: 'English', label: 'English' },
  { value: 'Hindi', label: 'Hindi (हिंदी)' },
  { value: 'Punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { value: 'Malay', label: 'Malaysian / Malay' },
];
const SPEEDS = [
  { value: 0.5, label: '0.5x Slow' },
  { value: 0.75, label: '0.75x' },
  { value: 1.0, label: '1.0x Normal' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x Fast' },
  { value: 2.0, label: '2.0x Very Fast' },
];

export default function App() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('auto');
  const [voice, setVoice] = useState('Anna (Free Model - English)');
  const [speed, setSpeed] = useState('1.0');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const wordsCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charsCount = text.length;

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handlePreviewVoice = async () => {
    setIsPreviewing(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Hi, I am ${voice}, your chosen AI voice for SEObagpack.`,
          language: 'English',
          voice,
          speed: '1.0'
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate preview.');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play();
    } catch (err: any) {
      setError('Preview failed: ' + (err.message || 'Error'));
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter some text to generate audio.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    
    try {
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          language,
          voice,
          speed
        })
      });
      
      if (!response.ok) {
        let errText = 'Failed to generate audio.';
        try {
          const errBody = await response.json();
          if (errBody.error) errText = errBody.error;
        } catch(e) {
          errText = `HTTP Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errText);
      }
      
      // Get the audio file as a Blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voice-generation-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  const handleReset = () => {
    setText('');
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      <header className="flex items-center justify-between px-8 h-16 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-sm">
            <Backpack className="w-4 h-4" />
          </div>
          <span className="text-xl font-bold tracking-tight text-black">SEObagpack</span>
        </div>
        <nav className="hidden sm:flex gap-8 text-sm font-medium text-slate-500 items-center">
          <span className="hover:text-black cursor-pointer">Free Text to MP3</span>
          <span className="hover:text-black cursor-pointer">AI Voices</span>
          <span className="hover:text-black cursor-pointer">Text to Speech Player</span>
          <button className="bg-black text-white px-4 py-1.5 rounded-full text-xs font-semibold">Premium SEO Tools</button>
        </nav>
      </header>

      <main className="flex-1 w-full max-w-[1200px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Input Area */}
        <div className="flex-[2] flex flex-col gap-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col gap-2 mb-2">
            <h1 className="text-2xl font-bold text-slate-800">Free Text to MP3 Generator</h1>
            <p className="text-sm text-slate-500">Convert your text to natural-sounding MP3 audio using advanced Gemini and ChatGPT AI Voices.</p>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Input Text</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">{charsCount} chars</span>
              <button onClick={handleReset} className="text-xs text-indigo-600 font-medium hover:underline">Clear All</button>
            </div>
          </div>
          
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter or paste your text here..."
            disabled={isGenerating}
            className="flex-1 w-full min-h-[300px] bg-slate-50 rounded-xl p-6 text-lg leading-relaxed text-slate-700 border-none focus:ring-2 focus:ring-indigo-100 resize-none outline-none disabled:opacity-50"
          />
          
          {error && (
            <div className="text-red-600 text-sm flex items-center gap-2 font-medium bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-4">
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">
                {language === 'auto' ? 'Auto-Detect' : language}
              </span>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !text.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <span>Generate Audio</span>
                  <Play className="w-4 h-4 fill-current" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Settings and Results */}
        <div className="flex-1 flex flex-col gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Voice Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Language</label>
                <div className="relative">
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isGenerating}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Voice Profile</label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <select 
                      value={voice}
                      onChange={(e) => setVoice(e.target.value)}
                      disabled={isGenerating || isPreviewing}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                    >
                      {VOICES.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                  <button
                    onClick={handlePreviewVoice}
                    disabled={isPreviewing || isGenerating}
                    title="Preview Voice"
                    className="flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
                  >
                    {isPreviewing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Speaking Speed</label>
                <div className="relative">
                  <select 
                    value={speed}
                    onChange={(e) => setSpeed(e.target.value)}
                    disabled={isGenerating}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                  >
                    {SPEEDS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <AnimatePresence>
            {audioUrl && (
              <motion.section 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 min-h-[220px] bg-indigo-900 rounded-2xl p-6 text-white overflow-hidden relative shadow-lg flex flex-col"
              >
                <div className="relative z-10 h-full flex flex-col">
                  <h3 className="text-sm font-semibold mb-4 opacity-80">Last Generated</h3>
                  <div className="flex-1 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                      <FileAudio className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-lg font-medium mb-4">Generated Audio</p>
                    
                    <audio 
                      ref={audioRef}
                      controls 
                      src={audioUrl} 
                      className="w-full h-10 outline-none rounded-lg opacity-90"
                      autoPlay
                    />
                  </div>
                  <div className="mt-4 flex gap-2 w-full">
                    <button
                      onClick={handleDownload}
                      className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download MP3
                    </button>
                  </div>
                </div>
                <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
      
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col gap-1">
            <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Backpack className="w-5 h-5 text-black" /> SEObagpack.com
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              Quality + Strategy = Results. The ultimate free text to speech with Gemini and AI Voices converter. Make your content accessible, engaging, and professional with our online Text to Speech Player.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} SEObagpack. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

