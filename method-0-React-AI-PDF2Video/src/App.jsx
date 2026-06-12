import { useState, useEffect } from 'react';
import { Upload, Play, Download, Image as ImageIcon, Type, LayoutTemplate, Key, Loader2, Sparkles, Wand2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { extractPdfPages } from './services/pdf';
import { getApiKey, setApiKey as saveApiKey, segmentSlideText, cleanSlideBackground } from './services/ai';
import { exportHyperframesBundle } from './services/export';

function App() {
  const [apiKey, setApiKey] = useState(getApiKey());
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(!getApiKey());
  const [slides, setSlides] = useState([]);
  const [activeSlideId, setActiveSlideId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeSlide = slides.find(s => s.id === activeSlideId);
  const isAnySlideReady = slides.some(s => s.status === 'ready');
  const allSlidesReady = slides.length > 0 && slides.every(s => s.status === 'ready');

  const handleApiKeySubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      const val = document.getElementById('api-key-input').value;
      if (val) {
        saveApiKey(val);
        setApiKey(val);
        setShowApiKeyPrompt(false);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    e.target.value = null;

    try {
      console.log("File selected:", file.name, "Size:", file.size);
      setIsProcessing(true);
      const extractedPages = await extractPdfPages(file);
      console.log("Extracted pages:", extractedPages);
      setSlides(extractedPages);
      if (extractedPages.length > 0) setActiveSlideId(extractedPages[0].id);
    } catch (err) {
      console.error("PDF Load Error", err);
      alert("Failed to load PDF: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const processSlideWithAI = async (slideId) => {
    if (!apiKey) return alert("Please set Gemini API Key first.");
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;

    try {
      setSlides(prev => prev.map(s => s.id === slideId ? { ...s, status: 'processing' } : s));
      
      const textBlocks = await segmentSlideText(slide.originalUrl);
      const cleanBgUrl = await cleanSlideBackground(slide.originalUrl);

      setSlides(prev => prev.map(s => s.id === slideId ? {
        ...s,
        textBlocks,
        cleanBackgroundUrl: cleanBgUrl,
        status: 'ready'
      } : s));
    } catch (err) {
      console.error("AI Processing Error", err);
      alert("AI Processing Failed: " + err.message);
      setSlides(prev => prev.map(s => s.id === slideId ? { ...s, status: 'error' } : s));
    }
  };

  const updateCaption = (slideId, newCaption) => {
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, caption: newCaption } : s));
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-black tracking-tight">Image2Video <span className="text-blue-600">Pro</span></h1>
        </div>

        {/* Stepper UI */}
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
           <div className={`flex items-center gap-2 font-bold text-sm transition-colors ${slides.length > 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
             <span className="w-6 h-6 rounded-full bg-current text-white flex items-center justify-center text-xs">
               {slides.length > 0 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
             </span>
             Import
           </div>
           <div className="w-6 h-px bg-slate-300"></div>
           <div className={`flex items-center gap-2 font-bold text-sm transition-colors ${slides.length === 0 ? 'text-slate-400' : (allSlidesReady ? 'text-emerald-600' : 'text-blue-600')}`}>
             <span className="w-6 h-6 rounded-full bg-current text-white flex items-center justify-center text-xs">
                {allSlidesReady ? <CheckCircle2 className="w-4 h-4" /> : '2'}
             </span>
             AI Segmentation
           </div>
           <div className="w-6 h-px bg-slate-300"></div>
           <div className={`flex items-center gap-2 font-bold text-sm transition-colors ${!isAnySlideReady ? 'text-slate-400' : 'text-blue-600'}`}>
             <span className="w-6 h-6 rounded-full bg-current text-white flex items-center justify-center text-xs">3</span>
             Narration
           </div>
           <div className="w-6 h-px bg-slate-300"></div>
           <div className={`flex items-center gap-2 font-bold text-sm transition-colors ${!isAnySlideReady ? 'text-slate-400' : 'text-blue-600'}`}>
             <span className="w-6 h-6 rounded-full bg-current text-white flex items-center justify-center text-xs">4</span>
             Export
           </div>
        </div>

        <div className="flex items-center gap-3">
          {showApiKeyPrompt ? (
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <Key className="w-4 h-4 text-slate-400 ml-2" />
              <input 
                id="api-key-input"
                type="password" 
                placeholder="Gemini API Key..." 
                className="bg-transparent border-none outline-none text-sm px-2 py-1 w-48"
                onKeyDown={handleApiKeySubmit}
              />
              <button onClick={handleApiKeySubmit} className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-md font-bold">Save</button>
            </div>
          ) : (
            <button onClick={() => setShowApiKeyPrompt(true)} className="text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center gap-1 px-3">
              <Key className="w-3 h-3" /> API Key Set
            </button>
          )}

          <div className="w-px h-6 bg-slate-200 mx-2"></div>

          <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold cursor-pointer transition flex items-center gap-2 text-sm border border-slate-200">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isProcessing ? "Loading..." : (slides.length > 0 ? "Upload New PDF" : "Upload PDF")}
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
          </label>
          
          <button 
            onClick={() => exportHyperframesBundle(slides)} 
            disabled={!isAnySlideReady}
            className={`px-4 py-2 rounded-lg font-bold shadow-sm transition flex items-center gap-2 text-sm ${isAnySlideReady ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          >
            <Download className="w-4 h-4" />
            Export Bundle
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Step 1: Upload Placeholder */}
        {slides.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                 <span className="text-3xl font-black">1</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight mb-4">Let's get started</h2>
              <p className="text-slate-500 font-medium mb-8">Upload a PDF presentation to begin the Magic Video conversion.</p>
              
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black shadow-lg cursor-pointer transition transform hover:scale-105 flex items-center gap-3 text-lg">
                {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                {isProcessing ? "Processing PDF..." : "Select PDF File"}
                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
              </label>
           </div>
        ) : (
          <>
            {/* Storyboard Sidebar */}
            <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                 <span className="font-black text-sm uppercase tracking-widest text-slate-500">Storyboard</span>
                 <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-md">{slides.length} Slides</span>
              </div>
              <div className="p-4 flex-1 space-y-4">
                {slides.map((slide, i) => (
                  <div 
                    key={slide.id} 
                    onClick={() => setActiveSlideId(slide.id)}
                    className={`relative p-2 rounded-xl cursor-pointer border-2 transition-all ${activeSlideId === slide.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                  >
                    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative shadow-sm border border-slate-200">
                      <img src={slide.originalUrl} className="w-full h-full object-contain" />
                      {slide.status === 'processing' && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                          <span className="text-[10px] font-black tracking-widest uppercase text-blue-600">AI Magic...</span>
                        </div>
                      )}
                      {slide.status === 'ready' && (
                        <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1.5 rounded-md shadow-sm">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex justify-between items-center px-1">
                      <span className="text-xs font-black text-slate-500">Slide {slide.index}</span>
                      {slide.status === 'pending' && (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded">Needs Process</span>
                      )}
                      {slide.status === 'ready' && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Ready</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden relative">
              {!activeSlide ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <LayoutTemplate className="w-16 h-16 mb-4 opacity-50" />
                  <p className="font-bold text-lg">Select a slide to start editing</p>
                </div>
              ) : (
                <>
                  {/* Step 2: Excalidraw Style Canvas Preview */}
                  <div className="flex-1 p-8 flex flex-col items-center justify-center overflow-auto relative min-h-0">
                    
                    {activeSlide.status === 'pending' && (
                       <div className="mb-4 flex items-center gap-3 bg-blue-100 text-blue-800 px-6 py-3 rounded-full">
                          <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black">2</span>
                          <span className="font-bold">Run AI Segmentation to separate text and background</span>
                       </div>
                    )}

                    {/* 16:9 Canvas */}
                    <div 
                      className="w-full max-w-4xl aspect-video shadow-2xl rounded-xl border border-slate-200 relative overflow-hidden bg-white shrink-0 transition-all"
                      style={{
                        backgroundImage: activeSlide.cleanBackgroundUrl ? `url(${activeSlide.cleanBackgroundUrl})` : `url(${activeSlide.originalUrl})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      {/* Overlay extracted text blocks if ready */}
                      {activeSlide.status === 'ready' && activeSlide.textBlocks?.map((block, idx) => {
                        const [ymin, xmin, ymax, xmax] = block.box_2d;
                        const top = `${(ymin / 10)}%`;
                        const left = `${(xmin / 10)}%`;
                        const width = `${((xmax - xmin) / 10)}%`;
                        const height = `${((ymax - ymin) / 10)}%`;

                        return (
                          <div 
                            key={idx}
                            className="absolute border-2 border-dashed border-blue-400 bg-blue-400/10 hover:bg-blue-400/20 cursor-move flex items-center justify-center transition-colors"
                            style={{ top, left, width, height }}
                            title={block.text}
                          >
                             <span className="opacity-0 hover:opacity-100 text-xs font-black text-blue-800 absolute -top-6 left-0 whitespace-nowrap bg-blue-100 px-2 py-1 rounded shadow-md z-10 transition-opacity">
                               {block.text}
                             </span>
                          </div>
                        );
                      })}
                      
                      {activeSlide.status === 'pending' && (
                        <div className="absolute inset-0 bg-slate-900/10 flex flex-col items-center justify-center backdrop-blur-[2px]">
                          <button 
                            onClick={() => processSlideWithAI(activeSlide.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xl px-8 py-4 rounded-2xl shadow-xl flex items-center gap-3 transition transform hover:scale-105 hover:shadow-2xl ring-4 ring-blue-600/30"
                          >
                            <Wand2 className="w-6 h-6" />
                            Auto-Process with Gemini
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Step 3: Audio / Caption Editor Panel */}
                  {activeSlide.status === 'ready' && (
                    <div className="h-56 shrink-0 bg-white border-t border-slate-200 p-6 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
                      <div className="font-black text-sm uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs">3</span>
                        Narration & Captions
                      </div>
                      <div className="flex-1 flex gap-6">
                        <div className="w-1/2 flex flex-col gap-2">
                          <textarea 
                            className="flex-1 border-2 border-slate-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none font-medium text-slate-700 transition"
                            placeholder="Type the narration script for this slide here. The video timing will automatically adjust based on length."
                            value={activeSlide.caption}
                            onChange={(e) => updateCaption(activeSlide.id, e.target.value)}
                          ></textarea>
                        </div>
                        <div className="w-1/2 flex flex-col gap-2">
                          <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center justify-center flex-col gap-3 transition hover:bg-slate-100">
                            <button className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold shadow-md transition text-sm flex items-center gap-2">
                              <Play className="w-4 h-4" /> Generate Audio Track
                            </button>
                            <span className="text-xs font-bold text-slate-400">Powered by Text-to-Speech</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
