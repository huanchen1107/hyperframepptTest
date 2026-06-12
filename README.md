# HyperFrame PPT Test

Storyboard-driven HyperFrames conversion of a 16-slide SMC x DRL presentation.

## Contents

- `conversation1-hyperframes/`: editable HyperFrames composition, slides,
  narration, captions, and project configuration.
- `conversation1-excalidraw-html/`: fully reinterpreted native HTML composition
  with Excalidraw-style diagrams, animated captions, and 16 narration tracks.
- `deliverables/conversation1-storyboard.md`: slide-by-slide visual and
  animation analysis.
- `deliverables/conversation1-storyboard-animated.mp4`: final narrated,
  captioned, animated video stored with Git LFS.
- `deliverables/conversation1-excalidraw-narrated-final.mp4`: final native HTML
  Excalidraw-style video with synchronized professional Mandarin narration.

## Validate

```powershell
cd conversation1-hyperframes
npm run check

cd ../conversation1-excalidraw-html
npm run check
```

## Exploration Methods

This workspace also contains several experimental pipelines (`method-*`) for converting slides and documents into animated videos. They are clearly prefixed to demonstrate what they do and how they work.

### Method 0: Web AI PDF-to-Video
- **Path:** `method-0-React-AI-PDF2Video/`
- **What it does:** A modern React web app that allows users to upload a PDF presentation.
- **How it works:** Uses the Gemini 2.5 Flash API to intelligently process the PDF, extracting positional text blocks while generating clean, text-free background images. It outputs an Excalidraw-style GSAP animated video bundle.

### Method 1: Raw Video Highlight
- **Path:** `method-1-RawVideoHighlight/`
- **What it does:** Raw video highlight exploration.

### Method 3: Hyperframe Overlay
- **Path:** `method-3-HyperframeOverlay/`
- **What it does:** Experimental overlay technique for Hyperframes.

### Method 4: Handout Remake
- **Path:** `method-4-HandoutRemake/`
- **What it does:** Techniques for remaking document handouts.

### Method 8: Node Offline PPTX-to-Video
- **Path:** `method-8-Node-Offline-PPTX2Video/`
- **What it does:** A robust, offline Node.js pipeline for users who already have clean assets. 
- **How it works:** Completely bypasses the AI. It extracts raw XML coordinates (EMUs) directly from a text-only PowerPoint (`A1.pptx`), extracts high-res PNG backgrounds directly from a background-only PowerPoint (`B1.pptx`), and merges them into a `hyperframes` video project. Highly stable and fast.

### Method 8 Legacy: HTML PDF Prototype
- **Path:** `method-8-Legacy-HTML-PDF-Prototype/`
- **What it does:** The original, vanilla HTML/JS single-file script.
- **How it works:** This was the predecessor to Method 0, heavily reliant on a single `index.html` file using inline JS to call older Gemini experimental models.
