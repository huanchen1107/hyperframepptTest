import JSZip from 'jszip';

export async function exportHyperframesBundle(storyboard) {
  if (!storyboard || !storyboard.slides) {
    alert("No storyboard available to export!");
    return;
  }

  const zip = new JSZip();
  const slides = storyboard.slides;

  // 1. Generate index.html with GSAP timeline
  const styleStr = `
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #fffdf6; color: #1b1b1f; font-family: sans-serif; }
    .root { position: relative; width: 1920px; height: 1080px; }
    .scene { position: absolute; inset: 0; background-color: #fffdf6; opacity: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px; }
    .anim-obj { font-size: 48px; font-weight: bold; margin: 20px 0; padding: 20px; border-radius: 12px; background: #e2e8f0; text-align: center; width: 100%; opacity: 0; }
    .caption { position: absolute; bottom: 50px; left: 100px; right: 100px; font-size: 40px; font-weight: 900; color: white; -webkit-text-stroke: 2px black; text-align: center; opacity: 0; z-index: 10; }
  `;

  let scenesHTML = '';
  let jsTimelineStr = 'const tl = gsap.timeline();\n';
  let totalDuration = 0;

  slides.forEach((slide, i) => {
    let objectsHTML = '';
    const startTime = totalDuration;

    jsTimelineStr += `tl.set('#scene-${i}', { opacity: 1 }, ${startTime});\n`;
    if (i > 0) jsTimelineStr += `tl.set('#scene-${i-1}', { opacity: 0 }, ${startTime});\n`;

    if (slide.tts_script) {
      objectsHTML += `<div class="caption" id="caption-${i}">${slide.tts_script}</div>\n`;
      jsTimelineStr += `tl.to('#caption-${i}', { opacity: 1, duration: 0.5 }, ${startTime + 0.1});\n`;
    }

    (slide.animations || []).forEach((anim, j) => {
      objectsHTML += `<div class="anim-obj" id="obj-${i}-${j}">${anim.target}</div>\n`;
      const absTime = startTime + anim.start_time;
      jsTimelineStr += `tl.fromTo('#obj-${i}-${j}', { opacity: 0, y: 50, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.5)" }, ${absTime});\n`;
    });

    scenesHTML += `<div id="scene-${i}" class="scene">\n${objectsHTML}</div>\n`;
    totalDuration += slide.duration || 5;
  });

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <style>${styleStr}</style>
</head>
<body>
  <div id="root" class="root" data-composition-id="main" data-start="0" data-duration="${totalDuration}" data-width="1920" data-height="1080">
    ${scenesHTML}
  </div>
  <script>${jsTimelineStr}</script>
</body>
</html>`;

  zip.file('index.html', html);

  // 2. Generate hyperframes.json audio config
  const hyperframesConfig = {
    version: "1.0",
    fps: 60,
    width: 1920,
    height: 1080,
    output: "render.mp4",
    audio: []
  };

  let currTime = 0;
  slides.forEach((slide, i) => {
    const dur = slide.duration || 5;
    hyperframesConfig.audio.push({
      file: `assets/tts_slide_${i+1}.mp3`,
      start: currTime,
      volume: 1.0
    });
    currTime += dur;
  });

  zip.file('hyperframes.json', JSON.stringify(hyperframesConfig, null, 2));

  // 3. Create dummy package.json
  const pkg = {
    name: "method-10-director",
    private: true,
    scripts: { "render": "npx --yes hyperframes@latest render" }
  };
  zip.file('package.json', JSON.stringify(pkg, null, 2));

  // 4. Download zip
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'method10-hyperframes-bundle.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
