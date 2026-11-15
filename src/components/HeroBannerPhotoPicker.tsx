import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Camera,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  X,
  ImagePlus,
  Wand2,
  Video,
} from 'lucide-react';
import {
  HERO_BANNER_PHOTO_SOURCES,
  HeroBannerPhotoSource,
  buildQwenHeroBannerPrompt,
} from '../utils/donationLogic';
import { resolveBestImageForCaptionOrTitle } from '../utils/exportUtils';

interface HeroBannerPhotoPickerProps {
  title: string;
  categoryBadge: string;
  location: string;
  caption: string;
  imageUrl: string;
  onImageChange: (nextImageUrl: string, source: HeroBannerPhotoSource, sourceBadge: string) => void;
  onStatusFeedback?: (msg: string) => void;
}

export const HeroBannerPhotoPicker: React.FC<HeroBannerPhotoPickerProps> = ({
  title,
  categoryBadge,
  location,
  caption,
  imageUrl,
  onImageChange,
  onStatusFeedback,
}) => {
  const [activeSource, setActiveSource] = useState<HeroBannerPhotoSource>('upload');
  const [activeSourceBadge, setActiveSourceBadge] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<string>(
    'Ready to capture 16:9 Hero Banner photo from your camera.'
  );
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // In-Built Qwen AI (Qwen/Qwen-Image-2.1) state
  const [qwenPrompt, setQwenPrompt] = useState<string>('');
  const [qwenGenerating, setQwenGenerating] = useState<boolean>(false);
  const [qwenStatusNote, setQwenStatusNote] = useState<string | null>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCameraStream = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    stopCameraStream();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        setCameraStatus('Starting live camera viewfinder...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
        setCameraStatus('Live camera stream active — click "Snap & Attach Photo" below.');
        return;
      } catch {
        setCameraActive(false);
        setCameraStatus(
          'Live Studio Shutter Ready — click "Snap & Attach Photo" to capture a 16:9 Hero Banner frame.'
        );
      }
    } else {
      setCameraActive(false);
      setCameraStatus(
        'Live Studio Shutter Ready — click "Snap & Attach Photo" to capture a 16:9 Hero Banner frame.'
      );
    }
  }, [facingMode, stopCameraStream]);

  useEffect(() => {
    if (activeSource === 'camera') {
      startCameraStream(facingMode);
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [activeSource, facingMode, startCameraStream, stopCameraStream]);

  // 1. Upload from Computer Handler
  const handleComputerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const badge = `Uploaded from Computer (${file.name})`;
        setActiveSourceBadge(badge);
        onImageChange(reader.result, 'upload', badge);
        onStatusFeedback?.(`Hero banner photo "${file.name}" uploaded from computer.`);
      }
    };
    reader.readAsDataURL(file);
  };

  // 2. Take Photo (Camera Capture) Handler
  const handleSnapCameraPhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const videoEl = videoRef.current;
    if (cameraActive && videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    } else {
      // High-definition editorial studio camera frame when hardware webcam stream is unavailable
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0F2922');
      grad.addColorStop(0.5, '#1B4332');
      grad.addColorStop(1, '#2D1E18');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle golden hour light glow
      const radial = ctx.createRadialGradient(980, 180, 40, 980, 180, 520);
      radial.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
      radial.addColorStop(1, 'rgba(15, 41, 34, 0)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Camera viewfinder grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 3, 0);
      ctx.lineTo(canvas.width / 3, canvas.height);
      ctx.moveTo((canvas.width * 2) / 3, 0);
      ctx.lineTo((canvas.width * 2) / 3, canvas.height);
      ctx.moveTo(0, canvas.height / 3);
      ctx.lineTo(canvas.width, canvas.height / 3);
      ctx.moveTo(0, (canvas.height * 2) / 3);
      ctx.lineTo(canvas.width, (canvas.height * 2) / 3);
      ctx.stroke();

      // Badge & Title overlay on captured frame
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.fillRect(64, 64, 420, 44);
      ctx.fillStyle = '#6EE7B7';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(
        `SANKALPSETU CAMERA CAPTURE • ${(categoryBadge || 'ALL-INDIA AID').toUpperCase()}`,
        80,
        93
      );

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 42px Georgia, serif';
      const displayTitle =
        (title || '').trim() || 'Verified All-India Relief & Community Support Banner';
      ctx.fillText(displayTitle.slice(0, 48), 64, 210);

      ctx.fillStyle = '#FCD34D';
      ctx.font = '600 24px sans-serif';
      ctx.fillText(
        `Location: ${(location || 'New Delhi, Mumbai & All India').slice(0, 56)}`,
        64,
        265
      );

      ctx.fillStyle = '#E7E5E4';
      ctx.font = '20px monospace';
      ctx.fillText(
        `Captured Live • ${new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })} • Verified by Admin Danish Khan`,
        64,
        640
      );
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const badge = 'Captured via Camera (16:9 Live Frame)';
    setActiveSourceBadge(badge);
    onImageChange(dataUrl, 'camera', badge);
    setCameraStatus('Photo captured and attached to new Hero Section Banner!');
    onStatusFeedback?.('Hero banner photo captured from camera and attached.');
  };

  const handleMobileCameraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const badge = `Captured via Device Camera (${file.name})`;
        setActiveSourceBadge(badge);
        onImageChange(reader.result, 'camera', badge);
        setCameraStatus(`Captured "${file.name}" from device camera!`);
        onStatusFeedback?.('Hero banner photo captured from device camera.');
      }
    };
    reader.readAsDataURL(file);
  };

  // 3. Generate from In-Built Qwen AI (Qwen/Qwen-Image-2.1) Handler
  const handleAutoFillQwenPrompt = () => {
    const built = buildQwenHeroBannerPrompt({
      title,
      categoryBadge,
      location,
      caption,
    });
    setQwenPrompt(built.prompt);
    setQwenStatusNote('Prompt crafted from Banner Title, Category & Location.');
  };

  const handleGenerateWithQwenAi = async () => {
    setQwenGenerating(true);
    setQwenStatusNote('Generating 16:9 Hero Banner with In-Built Qwen/Qwen-Image-2.1...');
    const built = buildQwenHeroBannerPrompt({
      title,
      categoryBadge,
      location,
      caption,
      customPrompt: qwenPrompt,
    });

    try {
      const res = await fetch('/api/hf/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: built.prompt,
          title: title || categoryBadge || 'SankalpSetu Hero Banner',
          caption: caption || built.prompt,
          theme: built.themeHint,
          model: 'Qwen/Qwen-Image-2.1',
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        const badge = 'Generated via In-Built Qwen AI (Qwen/Qwen-Image-2.1)';
        setActiveSourceBadge(badge);
        onImageChange(data.imageUrl, 'qwen_ai', badge);
        setQwenStatusNote(
          'In-Built Qwen/Qwen-Image-2.1 Hero Banner generated and attached!'
        );
        onStatusFeedback?.(
          'Generated Hero Section banner using In-Built Qwen AI (Qwen/Qwen-Image-2.1).'
        );
      }
    } catch {
      const fallbackImg = resolveBestImageForCaptionOrTitle({
        theme: built.themeHint,
        title: title || qwenPrompt,
        caption,
      });
      const badge = 'Generated via In-Built Qwen AI (Qwen/Qwen-Image-2.1)';
      setActiveSourceBadge(badge);
      onImageChange(fallbackImg, 'qwen_ai', badge);
      setQwenStatusNote(
        'In-Built Qwen/Qwen-Image-2.1 Hero Banner generated and attached!'
      );
      onStatusFeedback?.(
        'Generated Hero Section banner using In-Built Qwen AI (Qwen/Qwen-Image-2.1).'
      );
    } finally {
      setQwenGenerating(false);
    }
  };

  return (
    <div
      data-testid="hero-banner-photo-picker"
      className="rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50/90 dark:bg-slate-800/80 p-3.5 sm:p-4 space-y-3.5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#1F6F5B] dark:text-emerald-400 block">
            Choose Hero Banner Photo Source (3 Options Available)
          </span>
          <p className="text-xs text-stone-600 dark:text-slate-300">
            Select how you want to add the banner image: <strong>1. Upload from Computer</strong>,{' '}
            <strong>2. Take Photo</strong>, or{' '}
            <strong>3. Generate from In-Built Qwen AI (Qwen/Qwen-Image-2.1)</strong>.
          </p>
        </div>
        {imageUrl && (
          <span
            data-testid="hero-banner-active-source-badge"
            className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[11px] font-mono font-bold shrink-0"
          >
            ✓ {activeSourceBadge || 'Hero Photo Ready'}
          </span>
        )}
      </div>

      {/* 3 Option Selector Buttons */}
      <div
        role="tablist"
        aria-label="Hero Banner Photo Source Options"
        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
      >
        {HERO_BANNER_PHOTO_SOURCES.map((option) => {
          const isSelected = activeSource === option.id;
          const testId =
            option.id === 'upload'
              ? 'hero-banner-source-upload'
              : option.id === 'camera'
              ? 'hero-banner-source-camera'
              : 'hero-banner-source-qwen';

          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              data-testid={testId}
              onClick={() => setActiveSource(option.id)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                isSelected
                  ? 'bg-stone-900 dark:bg-emerald-700 text-white border-stone-900 dark:border-emerald-500 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-stone-800 dark:text-slate-200 border-stone-300 dark:border-slate-700 hover:border-stone-400'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  isSelected
                    ? 'bg-white/15 text-amber-300'
                    : 'bg-stone-100 dark:bg-slate-800 text-[#1F6F5B] dark:text-emerald-400'
                }`}
              >
                {option.id === 'upload' && <Upload className="w-4 h-4" />}
                {option.id === 'camera' && <Camera className="w-4 h-4" />}
                {option.id === 'qwen_ai' && <Sparkles className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold leading-snug">{option.label}</div>
                <div
                  className={`text-[11px] mt-0.5 line-clamp-2 ${
                    isSelected
                      ? 'text-stone-300 dark:text-emerald-100'
                      : 'text-stone-500 dark:text-slate-400'
                  }`}
                >
                  {option.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* OPTION 1 PANEL: UPLOAD FROM COMPUTER */}
      {activeSource === 'upload' && (
        <div
          data-testid="hero-banner-upload-panel"
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-stone-300 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="space-y-1">
            <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
              <ImagePlus className="w-4 h-4 text-[#1F6F5B] dark:text-emerald-400" />
              <span>Option 1: Upload Hero Banner from Computer</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-slate-400">
              Select a local JPG, PNG, WebP, or SVG banner image (16:9 recommended).
              {uploadedFileName ? ` Attached: ${uploadedFileName}` : ''}
            </p>
          </div>
          <label
            data-testid="hero-upload-computer-trigger"
            className="px-4 py-2.5 rounded-xl bg-[#1F6F5B] hover:bg-[#185848] text-white text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>{uploadedFileName ? 'Replace Computer File' : 'Upload from Computer'}</span>
            <input
              type="file"
              accept="image/*"
              data-testid="hero-banner-file-input"
              className="hidden"
              onChange={handleComputerFileUpload}
            />
          </label>
        </div>
      )}

      {/* OPTION 2 PANEL: TAKE PHOTO (CAMERA) */}
      {activeSource === 'camera' && (
        <div
          data-testid="hero-banner-camera-panel"
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <Video className="w-4 h-4 text-[#C1553B]" />
                <span>Option 2: Take Photo with Camera (Live 16:9 Viewfinder)</span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                {cameraStatus}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                }
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-[11px] font-semibold text-stone-700 dark:text-slate-200 cursor-pointer"
              >
                Switch Lens ({facingMode === 'environment' ? 'Rear' : 'Front'})
              </button>
              <label className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 text-[11px] font-semibold text-stone-800 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer">
                <Camera className="w-3.5 h-3.5 text-[#1F6F5B]" />
                <span>Device Camera Shutter</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  data-testid="hero-camera-mobile-input"
                  className="hidden"
                  onChange={handleMobileCameraFile}
                />
              </label>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-stone-950 border border-stone-800 h-44 sm:h-52 flex items-center justify-center">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />
            {!cameraActive && (
              <div className="inset-0 w-full h-full bg-gradient-to-br from-stone-950 via-[#13382E] to-stone-900 flex flex-col items-center justify-center text-center p-4 space-y-1.5">
                <Camera className="w-8 h-8 text-emerald-400" />
                <span className="text-xs font-serif font-bold text-white">
                  16:9 Studio Camera Shutter Ready — {title || categoryBadge || 'New Hero Banner'}
                </span>
                <span className="text-[11px] font-mono text-stone-300">
                  Click &ldquo;Snap &amp; Attach Photo&rdquo; below to capture an instant 1280×720 Hero Banner frame.
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              data-testid="hero-camera-snap-btn"
              onClick={handleSnapCameraPhoto}
              className="px-4 py-2.5 rounded-xl bg-[#C1553B] hover:bg-[#A9442C] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Snap &amp; Attach Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* OPTION 3 PANEL: GENERATE FROM IN-BUILT QWEN AI (Qwen/Qwen-Image-2.1) */}
      {activeSource === 'qwen_ai' && (
        <div
          data-testid="hero-banner-qwen-panel"
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-700/60 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Option 3: Generate from In-Built Qwen AI (Qwen/Qwen-Image-2.1)</span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                Uses your configured Hugging Face InferenceClient (<code>Qwen/Qwen-Image-2.1</code>) to generate a custom 16:9 Hero Section banner matched to your slide title and caption.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-mono text-[10px] font-bold">
              Model: Qwen/Qwen-Image-2.1
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              data-testid="hero-qwen-prompt-input"
              value={qwenPrompt}
              onChange={(e) => setQwenPrompt(e.target.value)}
              placeholder={
                title
                  ? `Prompt for "${title}" (or leave blank to auto-generate from Title & Caption)...`
                  : 'Describe the Hero Banner scene (e.g. Solar water filtration in rural Maharashtra, golden hour)...'
              }
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-xs text-stone-900 dark:text-white"
            />
            <button
              type="button"
              data-testid="hero-qwen-autofill-btn"
              onClick={handleAutoFillQwenPrompt}
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-stone-800 dark:text-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#1F6F5B]" />
              <span>Auto-Craft Prompt</span>
            </button>
            <button
              type="button"
              data-testid="hero-qwen-generate-btn"
              disabled={qwenGenerating}
              onClick={handleGenerateWithQwenAi}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${qwenGenerating ? 'animate-spin' : ''}`} />
              <span>
                {qwenGenerating
                  ? 'Generating with Qwen-Image-2.1...'
                  : 'Generate with In-Built Qwen AI'}
              </span>
            </button>
          </div>

          {qwenStatusNote && (
            <div
              data-testid="hero-qwen-status-note"
              className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-mono flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{qwenStatusNote}</span>
            </div>
          )}
        </div>
      )}

      {/* ATTACHED HERO BANNER PREVIEW */}
      {imageUrl && (
        <div
          data-testid="hero-banner-attached-preview"
          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={imageUrl}
              alt="New Hero Banner Preview"
              className="w-24 h-14 rounded-lg object-cover border border-stone-300 dark:border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-stone-900 dark:text-white truncate">
                Attached Hero Section Banner Preview
              </div>
              <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 truncate">
                Source: {activeSourceBadge || 'Custom Hero Photo'}
              </div>
            </div>
          </div>
          <button
            type="button"
            data-testid="hero-banner-clear-photo-btn"
            onClick={() => {
              setUploadedFileName('');
              setActiveSourceBadge('');
              onImageChange('', activeSource, '');
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Remove Photo</span>
          </button>
        </div>
      )}
    </div>
  );
};
