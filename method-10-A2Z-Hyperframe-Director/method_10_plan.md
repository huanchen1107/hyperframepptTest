# End-to-End Architecture: A2Z PDF to Hyperframe Video

## The Ultimate Goal
Convert `src/A2Z.pdf` into a fully animated video. The AI must write a storyboard based on slide contents and user transcripts (逐字稿). This storyboard will precisely control object animations, AI voice (TTS), BGM, and captions, all rendered flawlessly via `hyperframes`.

## Reorganizing Existing Methods towards the Goal
You have successfully built isolated "Lego blocks" across multiple methods. We will organize our understanding of them based on what they contribute to the final goal:

### 1. Data Ingestion & Parsing
*   **`method-0-React-AI-PDF2Video`**: Proved we can use Gemini 2.5 Flash to extract text bounding boxes and clean backgrounds from a PDF.
*   **`method-8-Node-Offline-PPTX2Video`**: Proved we can parse XML offline for perfect text coordinates without AI, if we have a PPTX.
*   **`method-4-HandoutRemake`**: Showed how to structure raw text into a `handout.md` format.

### 2. Storyboarding & Logic
*   **`method-3-HyperframeOverlay`**: Explored using Python (`analyze_transcript.py`) to align video clips with a `storyboard.yaml`. This is the foundation for our AI Director.

### 3. Rendering & Animation
*   **`method-1-RawVideoHighlight`**: Explored video concatenation.
*   **`method-8-Node-Offline-PPTX2Video`**: Successfully generated a complete `hyperframes` HTML composition utilizing GSAP for object-level pop-in animations.

---

## Proposed Final Pipeline: `method-10-A2Z-Hyperframe-Director`

I propose creating a brand new, definitive pipeline folder named `method-10-A2Z-Hyperframe-Director` that fuses all these learnings together into a single, automated Python/Node script.

### Architecture Workflow

1.  **Input Phase (`/inputs`)**
    *   Place `A2Z.pdf` and an optional `transcript.txt` (逐字稿) in the input folder.
2.  **AI Storyboarding (`director.py`)**
    *   A Python script will read the PDF text and the transcript.
    *   It will call the **Gemini API** with a strict prompt: *"Act as a video director. Map the transcript to the slide content. Output a JSON storyboard detailing exact timestamps for when each text object should animate onto the screen, what the TTS script is, and the caption."*
    *   Output: `storyboard.json`
3.  **Asset Generation (`audio_gen.py`)**
    *   The script reads `storyboard.json` to generate TTS voice files and BGM tracks using an API (e.g., Google Cloud TTS or a mock placeholder if you don't have one set up yet).
4.  **Hyperframe Composer (`compose.js`)**
    *   Using the logic from **Method 8**, a Node.js script will take `storyboard.json` and generate an `index.html` file.
    *   It will write a dynamic GSAP timeline that exactly matches the timestamps dictated by the AI storyboard to control object entrance animations.
    *   It will generate `hyperframes.json` with the synchronized audio tracks.
5.  **Final Render**
    *   `npx hyperframes render` produces the final MP4.

## Open Questions

> [!IMPORTANT]
> 1. Do you want me to write the actual code for this **Method 10** pipeline right now, or just scaffold the folder structure and `README` first?
> 2. For the TTS (AI Voice), do you have a specific API you want to use (like OpenAI TTS, Google Cloud, or ElevenLabs), or should I just write a mock function that you can hook up later?
> 3. Does `A2Z.pdf` currently exist in your `/src` folder, or should I create a placeholder for it?

## Verification Plan
1. Create the `method-10` directory structure.
2. Consolidate the findings from methods 1, 3, 4, 0, and 8 into a master `README.md` map.
3. If approved, write the AI Storyboarding Python script and verify it outputs a valid JSON storyboard.
