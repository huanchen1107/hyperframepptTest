import JSZip from 'jszip';

export async function exportHyperframesBundle(storyboard, pdfPages = [], bgPdfPages = []) {
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
    .scene { position: absolute; inset: 0; background-color: #fffdf6; opacity: 0; }
    .bg-img { position: absolute; width: 100%; height: 100%; object-fit: contain; }
    .anim-obj { position: absolute; opacity: 0; overflow: hidden; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); }
    .anim-obj img { position: absolute; max-width: none; }
    .caption { position: absolute; bottom: 50px; left: 100px; right: 100px; font-size: 40px; font-weight: 900; color: white; -webkit-text-stroke: 2px black; text-align: center; opacity: 0; z-index: 10; }
  `;

  let scenesHTML = '';
  let jsTimelineStr = 'const tl = gsap.timeline();\n';
  let totalDuration = 0;

  slides.forEach((slide, i) => {
    let objectsHTML = '';
    const startTime = totalDuration;
    
    // Add images to zip
    const fgDataUrl = pdfPages[i]?.originalUrl;
    const bgDataUrl = bgPdfPages[i]?.originalUrl || fgDataUrl;
    
    if (fgDataUrl) {
      const base64Data = fgDataUrl.split(',')[1];
      zip.file(`images/fg_${i}.png`, base64Data, {base64: true});
    }
    if (bgDataUrl) {
      const base64Data = bgDataUrl.split(',')[1];
      zip.file(`images/bg_${i}.png`, base64Data, {base64: true});
      objectsHTML += `<img src="images/bg_${i}.png" class="bg-img" />\n`;
    }

    jsTimelineStr += `tl.set('#scene-${i}', { opacity: 1 }, ${startTime});\n`;
    if (i > 0) jsTimelineStr += `tl.set('#scene-${i-1}', { opacity: 0 }, ${startTime});\n`;

    if (slide.tts_script) {
      objectsHTML += `<div class="caption" id="caption-${i}">${slide.tts_script}</div>\n`;
      jsTimelineStr += `tl.to('#caption-${i}', { opacity: 1, duration: 0.5 }, ${startTime + 0.1});\n`;
    }

    (slide.animations || []).forEach((anim, j) => {
      const [ymin, xmin, ymax, xmax] = anim.box_2d || [0,0,0,0];
      const w_pct = (xmax - xmin) / 10;
      const h_pct = (ymax - ymin) / 10;
      const left_pct = xmin / 10;
      const top_pct = ymin / 10;
      
      const boxStyle = `top: ${top_pct}%; left: ${left_pct}%; width: ${w_pct}%; height: ${h_pct}%;`;
      const imgStyle = `width: ${100 / (w_pct / 100)}%; height: ${100 / (h_pct / 100)}%; left: -${left_pct / (w_pct / 100)}%; top: -${top_pct / (h_pct / 100)}%;`;
      
      objectsHTML += `<div class="anim-obj" id="obj-${i}-${j}" style="${boxStyle}">
        <img src="images/fg_${i}.png" style="${imgStyle}" />
      </div>\n`;
      
      const absTime = startTime + anim.start_time;
      const type = anim.type || 'slide_up';
      if (type === 'fade') {
        jsTimelineStr += `tl.fromTo('#obj-${i}-${j}', { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out" }, ${absTime});\n`;
      } else if (type === 'pop') {
        jsTimelineStr += `tl.fromTo('#obj-${i}-${j}', { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(2)" }, ${absTime});\n`;
      } else if (type === 'slide_right') {
        jsTimelineStr += `tl.fromTo('#obj-${i}-${j}', { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 0.8, ease: "power3.out" }, ${absTime});\n`;
      } else if (type === 'none') {
        jsTimelineStr += `tl.set('#obj-${i}-${j}', { opacity: 1 }, ${absTime});\n`;
      } else {
        jsTimelineStr += `tl.fromTo('#obj-${i}-${j}', { opacity: 0, y: 50, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.5)" }, ${absTime});\n`;
      }
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
