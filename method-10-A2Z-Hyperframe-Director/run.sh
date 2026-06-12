#!/bin/bash
set -e

echo "======================================"
echo " Starting AI Director Pipeline (M10)"
echo "======================================"

cd "$(dirname "$0")"

# 1. AI Storyboard Generation
echo "Step 1: Analyzing PDF & Transcript..."
python3 scripts/director.py

# 2. Audio Generation
echo "Step 2: Generating Audio & Hyperframes Config..."
python3 scripts/audio_gen.py

# 3. Composition
echo "Step 3: Composing GSAP Timeline..."
node scripts/compose.js

echo "======================================"
echo " Pipeline Complete!"
echo " Navigate to output/ and run:"
echo " npx hyperframes render"
echo "======================================"
