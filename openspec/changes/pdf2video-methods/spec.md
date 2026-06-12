# pdf2video: 7 Production Methods Specification

## Overview
This specification details the design and implementation logic for the 7 production methods defined in the `pdf2video` technical whitepaper. The goal is to establish standardized tooling combinations for converting lectures and PDFs into engaging videos.

## Method Specifications

### 1. Raw Video Highlight Editing (原錄影精剪法)
- **Goal**: Fast pacing, remove silent/boring parts.
- **Input**: Original `.mp4`
- **Output**: Short highlight recap.
- **Tools**: `ffmpeg` (via python script).
- **Logic**: Use an audio analysis script to detect volume threshold. Filter segments below the threshold, apply hard cuts.

### 2. Transcript-based Re-editing (逐字稿重剪法)
- **Goal**: Semantic chapter highlights.
- **Input**: Video + JSON transcript.
- **Output**: Chapterized highlight video.
- **Tools**: `Whisper/Gemini` (for JSON generation), `ffmpeg`.
- **Logic**: Parse `transcript_with_timestamps.json`. Retain segments with `keep_score > 0.8`. Export using `ffmpeg` concat demuxer.

### 3. Animation Remake + Original Clips (動畫重製＋原片段穿插)
- **Goal**: Formal teaching video maintaining teacher authenticity.
- **Input**: Transcript, original video clips, Storyboard YAML.
- **Output**: Formal educational video.
- **Tools**: TTS, `Hyperframe`, `ffmpeg`.
- **Logic**: Interleave `video_clip` scenes and `animated_slide` scenes based on YAML. Connect output using `ffmpeg`.

### 4. Direct Remake from Handout (講義直接重做法)
- **Goal**: High-control remake ignoring poor original video.
- **Input**: Long text markdown/PDF.
- **Output**: Script-driven animated tutorial.
- **Tools**: LLM, TTS, `open-design`.
- **Logic**: Extract markdown. `open-design` converts markdown into slide structures. TTS renders narration.

### 5. Excalidraw Slides to Video (Excalidraw 簡報轉影片)
- **Goal**: Whiteboard style explanation.
- **Input**: JSON specifications of Excalidraw designs.
- **Output**: Whiteboard animated video.
- **Tools**: `open-design`, `Hyperframe`.
- **Logic**: Use `open-design` to render SVGs/PNGs. Use `Hyperframe` to apply pan/zoom animations synchronized with TTS.

### 6. Text Removal + Object Animation (去文字＋分解物件動畫法)
- **Goal**: Step-by-step concept highlighting.
- **Input**: Segmented layer PNGs, clean background.
- **Output**: Animated slide transition.
- **Tools**: `Hyperframe`.
- **Logic**: Load layers individually. Apply `fade_in` and `draw` animations sequentially via `Hyperframe`.

### 7. Static Background + High-Quality Segmentation (靜態背景＋CVAT 手動切割法)
- **Goal**: Maximum quality and visual density.
- **Input**: Precision cutouts (simulating CVAT output), `storyboard_complex.yaml`.
- **Output**: Flagship educational content.
- **Tools**: `CVAT` (or SAM models), `Hyperframe`.
- **Logic**: Overlay high-quality transparent PNGs onto static background, with complex choreography (delay, scale, transition) handled by `Hyperframe`.

## Integration Boundaries
- **Open-Design**: Acts as the visual layout and SVG/PNG generation engine for Methods 4 and 5.
- **Hyperframe**: Acts as the choreography and animation rendering engine for Methods 5, 6, and 7.
- **Codex/Antigravity**: Used for parsing inputs and managing the pipeline glue logic across all scripts.
