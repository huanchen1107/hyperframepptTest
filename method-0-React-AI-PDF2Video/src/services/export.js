import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Generates an Excalidraw-styled HTML bundle for hyperframes rendering
 * @param {Array} slides - The storyboard slides state
 */
export async function exportHyperframesBundle(slides) {
  const zip = new JSZip();

  // 1. Generate hyperframes.json
  const hyperframesConfig = {
    "version": "1.0",
    "fps": 60,
    "width": 1920,
    "height": 1080,
    "output": "render.mp4"
  };
  zip.file("hyperframes.json", JSON.stringify(hyperframesConfig, null, 2));

  // 2. Generate package.json for convenience
  const pkg = {
    "name": "image2video-render",
    "private": true,
    "type": "module",
    "scripts": {
      "render": "npx --yes hyperframes@latest render"
    }
  };
  zip.file("package.json", JSON.stringify(pkg, null, 2));

  // 3. Save images and backgrounds to zip, replacing data URLs with file paths
  const assetsFolder = zip.folder("assets");
  let totalDuration = 0;
  
  const processedSlides = slides.map((slide, index) => {
    let bgFilename = `assets/slide_${index}_bg.png`;
    
    // Convert base64 to blob/binary and add to zip
    const bgBase64 = slide.cleanBackgroundUrl || slide.originalUrl;
    const base64Data = bgBase64.split(',')[1];
    assetsFolder.file(`slide_${index}_bg.png`, base64Data, {base64: true});

    // Dummy audio generation using Web Speech Synthesis offline is not easily possible in pure JS without backend
    // So we will just allocate 10 seconds per slide if no audio exists.
    // In a real scenario, we'd record TTS to a Blob and save it here.
    const duration = slide.caption ? Math.max(5, slide.caption.length * 0.1) : 5; 
    const start = totalDuration;
    totalDuration += duration;

    return {
      index,
      bgFilename,
      textBlocks: slide.textBlocks || [],
      caption: slide.caption || "",
      start,
      duration
    };
  });

  // 4. Generate the index.html with GSAP animations
  const htmlContent = generateHTML(processedSlides, totalDuration);
  zip.file("index.html", htmlContent);

  // Download the zip
  const blob = await zip.generateAsync({type:"blob"});
  saveAs(blob, "image2video-export.zip");
}

function generateHTML(slides, totalDuration) {
  const styleStr = `
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #fffdf6; color: #1b1b1f; font-family: cursive; }
    .root { position: relative; width: 1920px; height: 1080px; }
    .scene { position: absolute; inset: 0; background-size: contain; background-position: center; background-repeat: no-repeat; opacity: 0; }
    .text-block { position: absolute; font-family: cursive; font-weight: bold; font-size: 24px; border: 3px solid #1b1b1f; background: #fffdf6; padding: 10px; border-radius: 12px 18px 10px 16px; box-shadow: 5px 5px 0 rgba(27,27,31,0.13); }
    .caption-box { position: absolute; bottom: 40px; left: 100px; right: 100px; background: rgba(255,253,246,0.95); border: 4px solid #1b1b1f; padding: 20px 30px; font-size: 42px; text-align: center; border-radius: 12px; box-shadow: 7px 7px 0 rgba(27,27,31,0.18); opacity: 0; }
  `;

  let scenesHTML = '';
  slides.forEach((slide, i) => {
    let blocksHTML = '';
    slide.textBlocks.forEach((b, j) => {
      const [ymin, xmin, ymax, xmax] = b.box_2d;
      const top = `${ymin / 10}%`;
      const left = `${xmin / 10}%`;
      blocksHTML += `<div class="text-block item" style="top: ${top}; left: ${left};">${b.text}</div>\n`;
    });

    scenesHTML += `
      <section id="scene-${i}" class="scene" style="background-image: url('${slide.bgFilename}')" data-start="${slide.start}" data-duration="${slide.duration}">
        ${blocksHTML}
        ${slide.caption ? `<div class="caption-box">${slide.caption}</div>` : ''}
      </section>
    `;
  });

  const jsStr = `
    const tl = gsap.timeline();
    const slides = ${JSON.stringify(slides)};
    
    slides.forEach((slide, i) => {
      const scene = document.getElementById('scene-' + i);
      const items = scene.querySelectorAll('.item');
      const caption = scene.querySelector('.caption-box');
      
      tl.set(scene, { opacity: 1 }, slide.start);
      if(i > 0) tl.set(document.getElementById('scene-' + (i-1)), { opacity: 0 }, slide.start);
      
      if(items.length > 0) {
        tl.from(items, { opacity: 0, y: 30, rotation: 2, scale: 0.9, duration: 0.6, stagger: 0.2, ease: "back.out(1.5)" }, slide.start + 0.5);
      }
      if(caption) {
        tl.to(caption, { opacity: 1, y: -10, duration: 0.5 }, slide.start + 0.2);
        tl.to(caption, { opacity: 0, duration: 0.3 }, slide.start + slide.duration - 0.5);
      }
    });
  `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <style>${styleStr}</style>
</head>
<body>
  <div id="root" class="root" data-composition-id="main" data-start="0" data-duration="${totalDuration}" data-width="1920" data-height="1080">
    ${scenesHTML}
  </div>
  <script>${jsStr}</script>
</body>
</html>`;
}
