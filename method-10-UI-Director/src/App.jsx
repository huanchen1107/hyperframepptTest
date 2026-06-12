import { useState } from 'react';
import { Upload, Download, Wand2, Loader2, Key, CheckCircle2, FileText, Settings2, Plus, Trash2 } from 'lucide-react';
import { getApiKey, setApiKey as saveApiKey, generateStoryboard } from './services/ai';
import { exportHyperframesBundle } from './services/export';
import { extractPdfPages } from './services/pdf';

function App() {
  const [apiKey, setApiKey] = useState(getApiKey());
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(!getApiKey());
  
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBase64, setPdfBase64] = useState(null);
  const [pdfPages, setPdfPages] = useState([]);
  const [transcript, setTranscript] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [storyboard, setStoryboard] = useState(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [previewSize, setPreviewSize] = useState(3);

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

  const processPdfFile = async (file) => {
    setPdfFile(file);
    try {
      // 1. Read base64 for Gemini
      const reader = new FileReader();
      reader.onload = (event) => setPdfBase64(event.target.result);
      reader.readAsDataURL(file);

      // 2. Extract snapshots for UI Canvas
      const pages = await extractPdfPages(file);
      setPdfPages(pages);
    } catch (err) {
      console.error("Failed to process PDF", err);
      alert("Failed to read PDF file.");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) processPdfFile(file);
  };

  const loadDefaultProject = async () => {
    if (!apiKey) return alert("Please set Gemini API Key first.");
    
    try {
      setIsProcessing(true);
      const [pdfRes, txtRes] = await Promise.all([
        fetch('/A2Z.pdf'),
        fetch('/transcript.txt')
      ]);
      
      const txt = await txtRes.text();
      setTranscript(txt);

      const blob = await pdfRes.blob();
      const file = new File([blob], 'A2Z.pdf', { type: 'application/pdf' });
      await processPdfFile(file);
      
      // Wait a tiny bit for the base64 conversion to finish setting state
      // Instead of using state, we can convert it locally here to guarantee it
      const reader = new FileReader();
      reader.onload = async (event) => {
        const b64 = event.target.result;
        try {
          const result = await generateStoryboard(b64, txt);
          setStoryboard(result);
        } catch (err) {
          console.error(err);
          alert("Failed to auto-generate storyboard: " + err.message);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);

    } catch (e) {
      setIsProcessing(false);
      console.error("Failed to load defaults", e);
      alert("Failed to load default files.");
    }
  };

  const handleGenerate = async () => {
    if (!apiKey) return alert("Please set Gemini API Key first.");
    if (!pdfBase64) return alert("Please upload a PDF first.");
    
    setIsProcessing(true);
    try {
      const result = await generateStoryboard(pdfBase64, transcript);
      setStoryboard(result);
    } catch (err) {
      console.error(err);
      alert("Failed to generate storyboard: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateSlide = (slideIndex, field, value) => {
    setStoryboard(prev => {
      const newStoryboard = { ...prev };
      newStoryboard.slides[slideIndex][field] = value;
      return newStoryboard;
    });
  };

  const handleUpdateAnimation = (slideIndex, animIndex, field, value) => {
    setStoryboard(prev => {
      const newStoryboard = { ...prev };
      newStoryboard.slides[slideIndex].animations[animIndex][field] = value;
      return newStoryboard;
    });
  };

  const handleAddAnimation = (slideIndex) => {
    setStoryboard(prev => {
      const newStoryboard = { ...prev };
      if (!newStoryboard.slides[slideIndex].animations) newStoryboard.slides[slideIndex].animations = [];
      newStoryboard.slides[slideIndex].animations.push({ target: "New Object", start_time: 0, box_2d: [400, 400, 600, 600] });
      return newStoryboard;
    });
  };

  const handleRemoveAnimation = (slideIndex, animIndex) => {
    setStoryboard(prev => {
      const newStoryboard = { ...prev };
      newStoryboard.slides[slideIndex].animations.splice(animIndex, 1);
      return newStoryboard;
    });
  };

  const hasInputs = !!pdfFile;
  const hasStoryboard = !!storyboard;
  const activePageSnapshotUrl = pdfPages[activeSlideIndex]?.originalUrl;

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-black tracking-tight">AI Director <span className="text-indigo-600">UI</span></h1>
        </div>

        {/* Stepper UI */}
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
           <div className={`flex items-center gap-2 font-bold text-sm transition-colors ${hasInputs ? 'text-emerald-600' : 'text-indigo-600'}`}>
             <span className="w-6 h-6 rounded-full bg-current text-white flex items-center justify-center text-xs">
               {hasInputs ? <CheckCircle2 className="w-4 h-4" /> : '1'}
             </span>
             Ingestion
           </div>
           <div className="w-6 h-px bg-slate-300"></div>
           <div className={`flex items-center gap-2 font-bold text-sm transition-colors ${!hasInputs ? 'text-slate-400' : (hasStoryboard ? 'text-emerald-600' : 'text-indigo-600')}`}>
             <span className="w-6 h-6 rounded-full bg-current text-white flex items-center justify-center text-xs">
                {hasStoryboard ? <CheckCircle2 className="w-4 h-4" /> : '2'}
             </span>
             AI Storyboard
           </div>
           <div className="w-6 h-px bg-slate-300"></div>
           <div className={`flex items-center gap-2 font-bold text-sm transition-colors ${!hasStoryboard ? 'text-slate-400' : 'text-indigo-600'}`}>
             <span className="w-6 h-6 rounded-full bg-current text-white flex items-center justify-center text-xs">3</span>
             Review & Tweak
           </div>
           <div className="w-6 h-px bg-slate-300"></div>
           <div className={`flex items-center gap-2 font-bold text-sm transition-colors ${!hasStoryboard ? 'text-slate-400' : 'text-indigo-600'}`}>
             <span className="w-6 h-6 rounded-full bg-current text-white flex items-center justify-center text-xs">4</span>
             Export
           </div>
        </div>

        <div className="flex items-center gap-3">
          {showApiKeyPrompt ? (
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <Key className="w-4 h-4 text-slate-400 ml-2" />
              <input id="api-key-input" type="password" placeholder="Gemini API Key..." className="bg-transparent border-none outline-none text-sm px-2 py-1 w-48" onKeyDown={handleApiKeySubmit} />
              <button onClick={handleApiKeySubmit} className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-md font-bold">Save</button>
            </div>
          ) : (
            <button onClick={() => setShowApiKeyPrompt(true)} className="text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center gap-1 px-3">
              <Key className="w-3 h-3" /> API Key Set
            </button>
          )}

          <div className="w-px h-6 bg-slate-200 mx-2"></div>
          
          <button onClick={() => exportHyperframesBundle(storyboard)} disabled={!hasStoryboard} className={`px-4 py-2 rounded-lg font-bold shadow-sm transition flex items-center gap-2 text-sm ${hasStoryboard ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
            <Download className="w-4 h-4" /> Export Video Bundle
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Step 1 & 2: Input and Generate */}
        {!hasStoryboard && (
           <div className="flex-1 flex overflow-hidden bg-slate-50">
              
              {/* Left Side: Upload Controls */}
              <div className="flex-1 max-w-2xl border-r border-slate-200 bg-white p-8 overflow-y-auto shrink-0 shadow-sm z-10">
                 <h2 className="text-2xl font-black mb-6">Step 1: Upload Materials</h2>
                 
                 <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Presentation PDF</label>
                    <label className="border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="font-bold text-slate-600">{pdfFile ? pdfFile.name : "Click to select PDF"}</span>
                      <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                    </label>
                 </div>

                 <div className="mb-8">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Transcript / 逐字稿 (Optional)</label>
                    <textarea 
                      className="w-full h-40 border-2 border-slate-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none resize-none font-medium text-slate-700"
                      placeholder="Paste the dialogue script here. The AI will align it to the slides..."
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                    ></textarea>
                 </div>

                 <div className="pt-6 border-t border-slate-100">
                    <h2 className="text-2xl font-black mb-4">Step 2: AI Director</h2>
                    
                    {!pdfFile && (
                      <button 
                        onClick={loadDefaultProject}
                        className="w-full py-3 mb-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-2 transition"
                      >
                        Load Default Project (A2Z.pdf + Transcript)
                      </button>
                    )}

                    <button 
                      onClick={handleGenerate}
                      disabled={!pdfFile || isProcessing}
                      className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-3 transition shadow-lg ${(!pdfFile || isProcessing) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.02]'}`}
                    >
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Wand2 className="w-6 h-6" />}
                      {isProcessing ? "AI is generating storyboard..." : "Auto-Generate Storyboard"}
                    </button>
                 </div>
              </div>

              {/* Right Side: PDF Snapshots Preview */}
              <div className="flex-1 overflow-y-auto p-8 relative bg-slate-100/50">
                {pdfPages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                     <FileText className="w-16 h-16 mb-4 opacity-20" />
                     <p className="font-bold">PDF Previews will appear here</p>
                  </div>
                ) : (
                  <div className="w-full mx-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-black text-lg flex items-center gap-2 text-slate-700">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        Loaded Slides ({pdfPages.length})
                      </h3>
                      <div className="flex items-center gap-3">
                         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Size</span>
                         <input 
                           type="range" 
                           min="1" max="5" 
                           value={previewSize} 
                           onChange={(e) => setPreviewSize(Number(e.target.value))}
                           className="w-32 accent-indigo-600"
                         />
                      </div>
                    </div>
                    <div className={`grid gap-6 ${
                      previewSize === 1 ? 'grid-cols-1' :
                      previewSize === 2 ? 'grid-cols-2' :
                      previewSize === 3 ? 'grid-cols-3' :
                      previewSize === 4 ? 'grid-cols-4' : 'grid-cols-5'
                    }`}>
                      {pdfPages.map((page, i) => (
                        <div key={page.id} className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                           <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden mb-2">
                             <img src={page.originalUrl} alt={`Slide ${i + 1}`} className="w-full h-full object-contain" />
                           </div>
                           <div className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                             Slide {i + 1}
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
           </div>
        )}

        {/* Step 3: Interactive Storyboard Editor */}
        {hasStoryboard && (
          <>
            {/* Sidebar Slide List */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col overflow-hidden shrink-0">
              <div className="p-4 border-b border-slate-100 bg-slate-50 font-black text-sm uppercase tracking-widest text-slate-500 flex justify-between items-center shrink-0">
                 Timeline
                 <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">{storyboard.slides.length} Slides</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {storyboard.slides.map((slide, i) => (
                  <div 
                    key={i} 
                    onClick={() => setActiveSlideIndex(i)}
                    className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${activeSlideIndex === i ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                       <FileText className={`w-5 h-5 ${activeSlideIndex === i ? 'text-indigo-600' : 'text-slate-400'}`} />
                       <span className="font-black text-slate-700">Slide {slide.slide_index}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2">{slide.tts_script || "No narration"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Editor Canvas */}
            <div className="flex-1 overflow-y-auto bg-slate-100 relative flex flex-col">
               
               {/* Visial Snapshot Canvas */}
               {activePageSnapshotUrl && (
                 <div className="w-full bg-slate-900 border-b border-slate-800 p-8 flex items-center justify-center shrink-0">
                    <div 
                      className="relative w-full max-w-4xl aspect-video bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-700"
                      style={{
                        backgroundImage: `url(${activePageSnapshotUrl})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                       {/* Overlay Bounding Boxes */}
                       {(storyboard.slides[activeSlideIndex].animations || []).map((anim, j) => {
                         if (!anim.box_2d) return null;
                         const [ymin, xmin, ymax, xmax] = anim.box_2d;
                         const top = `${(ymin / 10)}%`;
                         const left = `${(xmin / 10)}%`;
                         const width = `${((xmax - xmin) / 10)}%`;
                         const height = `${((ymax - ymin) / 10)}%`;

                         return (
                           <div 
                             key={j}
                             className="absolute border-[3px] border-indigo-500 bg-indigo-500/20 flex items-start justify-start shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all hover:bg-indigo-500/30"
                             style={{ top, left, width, height }}
                           >
                              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shadow-lg border-2 border-white z-10 text-sm">
                                {j + 1}
                              </div>
                           </div>
                         );
                       })}
                    </div>
                 </div>
               )}

               <div className="p-8 max-w-4xl mx-auto space-y-8 w-full flex-1">
                  {/* TTS Editor */}
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-2"><Settings2 className="w-5 h-5 text-indigo-600"/> TTS Narration Script</h3>
                    <textarea 
                      className="w-full h-32 border-2 border-slate-200 rounded-xl p-4 text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none resize-none font-medium text-slate-700"
                      value={storyboard.slides[activeSlideIndex].tts_script || ''}
                      onChange={(e) => handleUpdateSlide(activeSlideIndex, 'tts_script', e.target.value)}
                    ></textarea>
                    
                    <div className="mt-4">
                       <label className="block text-sm font-bold text-slate-700 mb-2">Estimated Duration (seconds)</label>
                       <input 
                         type="number" 
                         className="border-2 border-slate-200 rounded-lg px-3 py-2 text-sm w-32"
                         value={storyboard.slides[activeSlideIndex].duration || 5}
                         onChange={(e) => handleUpdateSlide(activeSlideIndex, 'duration', parseFloat(e.target.value))}
                       />
                    </div>
                  </div>

                  {/* Animations Editor */}
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black flex items-center gap-2"><Wand2 className="w-5 h-5 text-indigo-600"/> Object Animations</h3>
                      <button onClick={() => handleAddAnimation(activeSlideIndex)} className="flex items-center gap-1 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition">
                        <Plus className="w-4 h-4"/> Add Object
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(storyboard.slides[activeSlideIndex].animations || []).map((anim, j) => (
                         <div key={j} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 shadow-md">
                               {j+1}
                            </div>
                            <div className="flex-1">
                               <input 
                                 type="text" 
                                 placeholder="Target Object Description"
                                 className="w-full bg-transparent border-none outline-none font-bold text-slate-700"
                                 value={anim.target || ''}
                                 onChange={(e) => handleUpdateAnimation(activeSlideIndex, j, 'target', e.target.value)}
                               />
                            </div>
                            <div className="flex items-center gap-2 shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                               <span className="text-xs font-bold text-slate-400">Start Time:</span>
                               <input 
                                 type="number" 
                                 step="0.1"
                                 className="w-16 border-none outline-none font-black text-slate-700 bg-transparent"
                                 value={anim.start_time || 0}
                                 onChange={(e) => handleUpdateAnimation(activeSlideIndex, j, 'start_time', parseFloat(e.target.value))}
                               />
                               <span className="text-xs font-bold text-slate-400">s</span>
                            </div>
                            <button onClick={() => handleRemoveAnimation(activeSlideIndex, j)} className="p-2 text-slate-400 hover:text-red-500 transition">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                         </div>
                      ))}
                      {(!storyboard.slides[activeSlideIndex].animations || storyboard.slides[activeSlideIndex].animations.length === 0) && (
                        <div className="text-center p-8 text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl">
                          No animations scheduled for this slide.
                        </div>
                      )}
                    </div>
                  </div>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
