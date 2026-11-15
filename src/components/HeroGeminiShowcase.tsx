import React, { useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { resolveBestImageForCaptionOrTitle } from '../utils/exportUtils';

interface HeroGeminiShowcaseProps {
  slideId?: string;
  theme: string;
  title?: string;
  caption?: string;
  customImageUrl?: string | null;
  onImageGenerated?: (slideId: string, dataUrl: string) => void;
  onCustomImageGenerated?: (theme: string, dataUrl: string) => void;
  showGeneratorButton?: boolean;
}

const DEFAULT_PROMPTS: Record<string, string> = {
  freelancer:
    'Cinematic wide-angle documentary photograph of an Indian software developer and freelancer building a web application on dual monitors in a sunlit studio, golden hour natural light, Leica 35mm editorial photography',
  personal:
    'Warm documentary editorial photograph of an urban Indian family and small shop owner reviewing verified micro-funding documents together in a sunlit courtyard, golden hour natural light',
  blood_camp:
    'High-contrast documentary editorial photograph of a modern Indian hospital blood donation and medical camp, certified doctors in white coats with modern diagnostic equipment, warm natural lighting',
  water:
    'Cinematic golden-hour documentary photograph of a solar-powered clean drinking water filtration station in an Indian village, villagers and engineers inspecting clean water taps, photorealistic',
  education:
    'Cinematic golden-hour photograph of students and mentors in a modern digital literacy and STEM computer lab in India, laptops on wooden desks, warm sunlight streaming through windows',
};

export const HeroGeminiShowcase: React.FC<HeroGeminiShowcaseProps> = ({
  slideId,
  theme,
  title = 'SankalpSetu Impact Showcase',
  caption = '',
  customImageUrl,
  onImageGenerated,
  onCustomImageGenerated,
  showGeneratorButton = true,
}) => {
  const [generating, setGenerating] = useState(false);
  const [promptInput, setPromptInput] = useState(
    title && title !== 'SankalpSetu Impact Showcase'
      ? `${title} — ${caption || DEFAULT_PROMPTS[theme] || DEFAULT_PROMPTS.freelancer}`
      : DEFAULT_PROMPTS[theme] || DEFAULT_PROMPTS.freelancer
  );
  const [showPromptBox, setShowPromptBox] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const resolvedImageSrc = resolveBestImageForCaptionOrTitle({
    theme,
    title,
    caption,
    customImageUrl,
  });

  const notifyGenerated = (dataUrl: string) => {
    if (onCustomImageGenerated) {
      onCustomImageGenerated(theme, dataUrl);
    }
    if (onImageGenerated && slideId) {
      onImageGenerated(slideId, dataUrl);
    }
  };

  const handleGenerateFromHuggingFace = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setGenerating(true);
    setStatusNote('Generating with Qwen/Qwen-Image-2.1...');
    try {
      const res = await fetch('/api/hf/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput || title,
          title,
          caption,
          theme,
          model: 'Qwen/Qwen-Image-2.1',
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        notifyGenerated(data.imageUrl);
        setStatusNote(
          data.model === 'Qwen/Qwen-Image-2.1'
            ? 'Qwen-Image-2.1 HD Photo applied!'
            : 'Best Caption-Matched HD Photo applied!'
        );
      }
    } catch {
      const bestFallback = resolveBestImageForCaptionOrTitle({
        theme,
        title: promptInput || title,
        caption,
      });
      notifyGenerated(bestFallback);
      setStatusNote('Best Caption-Matched HD Photo applied!');
    } finally {
      setGenerating(false);
      setTimeout(() => setStatusNote(null), 4000);
    }
  };

  return (
    <div className="w-full h-full relative select-none overflow-hidden bg-slate-950">
      <img
        src={resolvedImageSrc}
        alt={title}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center transition-transform duration-700"
      />

      {/* Admin-Only Interactive Qwen-Image-2.1 Hero Studio Control */}
      {showGeneratorButton && (
        <div className="absolute bottom-3.5 right-3.5 z-20 flex flex-col items-end gap-2">
          {statusNote && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/90 text-emerald-200 border border-emerald-500/40 text-[11px] font-mono flex items-center gap-1.5 shadow-lg backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{statusNote}</span>
            </div>
          )}

          {showPromptBox && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-3 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-white/20 shadow-2xl w-72 sm:w-80 space-y-2"
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-amber-300">
                <span>Qwen/Qwen-Image-2.1 Hero Studio</span>
                <button
                  type="button"
                  onClick={() => setShowPromptBox(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Describe cover photo or title..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleGenerateFromHuggingFace}
                disabled={generating}
                className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Generating with Qwen-Image-2.1...' : 'Generate Best Photo by Title'}
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPromptBox((prev) => !prev);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900/95 text-amber-300 border border-white/20 backdrop-blur-md text-[11px] font-mono font-semibold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
              title="Generate Hero Photo via Hugging Face Qwen-Image-2.1"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{customImageUrl ? 'Update Hero Photo' : 'Qwen-Image-2.1 Studio'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
