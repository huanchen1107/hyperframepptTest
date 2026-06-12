# Project Log & Method Restructuring

## 2026-06-12: Method Naming & Reorganization
All recent image/PPT to video approaches have been renamed and properly categorized to make it explicitly clear what each method does and how it functions.

### The Problem
Previously, folders like `image2video-app` and `nlm-pdf-pro-v2` were vaguely named and lacked clear prefixes associating them with the ongoing experiments in the workspace.

### The Solution
We adopted a unified `method-X-` naming convention. 

**Method 0: AI PDF-to-Video Workflow**
- **Folder**: `method-0-React-AI-PDF2Video`
- **What it does**: A modern React web app that allows users to upload a PDF presentation.
- **How it works**: Uses the Gemini 2.5 Flash API to intelligently process the PDF, extracting positional text blocks while generating clean, text-free background images. It outputs an Excalidraw-style GSAP animated video bundle.

**Method 8: Offline PPTX Parsing Workflow**
- **Folder**: `method-8-Node-Offline-PPTX2Video`
- **What it does**: A robust, offline Node.js pipeline for users who already have clean assets. 
- **How it works**: Completely bypasses the AI. It extracts raw XML coordinates (EMUs) directly from a text-only PowerPoint (`A1.pptx`), extracts high-res PNG backgrounds directly from a background-only PowerPoint (`B1.pptx`), and merges them into a `hyperframes` video project. Highly stable and fast.

**Method 8 Legacy: Original HTML Prototype**
- **Folder**: `method-8-Legacy-HTML-PDF-Prototype`
- **What it does**: The original, vanilla HTML/JS single-file script.
- **How it works**: This was the predecessor to Method 0, heavily reliant on a single `index.html` file using inline JS to call older Gemini experimental models. 

### Actions Taken
1. Fixed Vite cache/worker bugs in Method 0.
2. Built Method 8 from scratch using `xml2js` and `jszip` to parse OOXML.
3. Completely restructured folder names.
4. Cleaned up dangling `.vite` cache directories from live dev servers.
5. Updated hardcoded absolute paths in Method 8 to reflect the newly prefixed Method 0 directory structure.

## 2026-06-12 (Part 2): Method 10 "AI Director" Implementation

**Method 10: AI Director Pipeline & UI Dashboard**
- **Folders**: 
  - `method-10-A2Z-Hyperframe-Director` (Headless Python Script)
  - `method-10-UI-Director` (Interactive React Dashboard)
- **What it does**: Takes the target `A2Z.pdf` and a written transcript (`transcript.txt`) and utilizes Gemini AI to automatically generate a precisely timed `storyboard.json` (acting as the video director).

**Major UI/UX Features Built:**
1. **Interactive Numbered Pipeline**: Built a clean, Step 1 to Step 4 numbered stepper UI in React to guide the user from ingestion to final Hyperframes export.
2. **"Load Default Project" Automation**: Added a single-click automation button that instantly loads `A2Z.pdf` and the Mandarin transcript from the server, and immediately executes the AI Generation pipeline without requiring any manual file uploads.
3. **Visual Snapshot Overlays**: Integrated `pdf.js` to render actual visual snapshots of the PDF slides onto the UI canvas. 
4. **Numbered Bounding Boxes**: Updated the Gemini prompt to return accurate `box_2d` coordinates for every targeted animation object. The UI now visually overlays bold numbered badges (1, 2, 3...) directly on top of the slide snapshots, perfectly corresponding to the interactive animation timeline editor below.
