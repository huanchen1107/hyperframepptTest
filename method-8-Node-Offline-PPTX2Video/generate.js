const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const xml2js = require('xml2js');

const A1_PATH = path.resolve(__dirname, '../method-0-React-AI-PDF2Video/public/A1.pptx');
const B1_PATH = path.resolve(__dirname, '../method-0-React-AI-PDF2Video/public/B1.pptx');
const OUT_DIR = path.resolve(__dirname, 'output');

// EMU conversion: 1 inch = 914400 EMUs, 1 cm = 360000 EMUs.
// We will convert to percentages of slide width/height instead of pixels for scaling.

async function extractPptx(fileBuffer) {
  const zip = await JSZip.loadAsync(fileBuffer);
  return zip;
}

async function parseXml(xmlString) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xmlString, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Find a deeply nested property in object
function findNodes(obj, key) {
  let results = [];
  if (typeof obj !== 'object' || obj === null) return results;
  
  if (obj[key] !== undefined) {
    if (Array.isArray(obj[key])) {
      results = results.concat(obj[key]);
    } else {
      results.push(obj[key]);
    }
  }
  
  for (const prop in obj) {
    results = results.concat(findNodes(obj[prop], key));
  }
  return results;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  const assetsDir = path.join(OUT_DIR, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log("Loading A1.pptx...");
  const a1Zip = await extractPptx(fs.readFileSync(A1_PATH));
  console.log("Loading B1.pptx...");
  const b1Zip = await extractPptx(fs.readFileSync(B1_PATH));

  // Extract Slide Dimensions from A1
  const presXmlData = await a1Zip.file('ppt/presentation.xml').async('string');
  const presObj = await parseXml(presXmlData);
  const sldSz = presObj['p:presentation']['p:sldSz'][0]['$'];
  const slideWidthEmu = parseInt(sldSz.cx, 10);
  const slideHeightEmu = parseInt(sldSz.cy, 10);
  console.log(`Slide dimensions (EMU): ${slideWidthEmu} x ${slideHeightEmu}`);

  // Extract Background Images from B1
  console.log("Extracting background images from B1...");
  const mediaFiles = Object.keys(b1Zip.files).filter(f => f.startsWith('ppt/media/image') && f.endsWith('.png'));
  
  // Try to map images to slides logically. If sorted by name, image-1, image-2... wait, they might be image1.png, image2.png
  // Actually, B1 has image-1-1.png, image-2-1.png, etc based on the zip output. Let's just sort them.
  const bgImages = mediaFiles.sort((a, b) => {
    const numA = parseInt(a.match(/image-?(\d+)/)?.[1] || 0);
    const numB = parseInt(b.match(/image-?(\d+)/)?.[1] || 0);
    return numA - numB;
  });

  const slidesData = [];

  // Parse Slides in A1
  const slideFiles = Object.keys(a1Zip.files).filter(f => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'));
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)/)?.[1] || 0);
    const numB = parseInt(b.match(/slide(\d+)/)?.[1] || 0);
    return numA - numB;
  });

  console.log(`Found ${slideFiles.length} slides.`);

  for (let i = 0; i < slideFiles.length; i++) {
    const slidePath = slideFiles[i];
    const xmlData = await a1Zip.file(slidePath).async('string');
    const slideObj = await parseXml(xmlData);

    const shapes = findNodes(slideObj, 'p:sp');
    const textBlocks = [];

    for (const shape of shapes) {
      // Find text
      const tNodes = findNodes(shape, 'a:t');
      if (tNodes.length === 0) continue;
      
      const text = tNodes.map(t => typeof t === 'string' ? t : t._).join('').trim();
      if (!text) continue;

      // Find position & size
      const xfrm = findNodes(shape, 'a:xfrm')[0];
      if (!xfrm) continue;

      const off = xfrm['a:off'][0]['$'];
      const ext = xfrm['a:ext'][0]['$'];

      const x = parseInt(off.x, 10);
      const y = parseInt(off.y, 10);
      const cx = parseInt(ext.cx, 10);
      const cy = parseInt(ext.cy, 10);

      // Convert to percentages
      textBlocks.push({
        text,
        left: (x / slideWidthEmu) * 100,
        top: (y / slideHeightEmu) * 100,
        width: (cx / slideWidthEmu) * 100,
        height: (cy / slideHeightEmu) * 100
      });
    }

    // Save background image
    let bgFilename = `slide_${i + 1}_bg.png`;
    if (bgImages[i]) {
       const bgData = await b1Zip.file(bgImages[i]).async('nodebuffer');
       fs.writeFileSync(path.join(assetsDir, bgFilename), bgData);
    } else {
       console.warn(`No background image found for slide ${i+1}`);
    }

    slidesData.push({
      index: i + 1,
      bgFilename: `assets/${bgFilename}`,
      textBlocks,
      duration: 5,
      start: i * 5
    });
  }

  // Generate hyperframes bundle
  generateHyperframesFiles(slidesData, slideFiles.length * 5);
  console.log("Success! Render bundle saved to output directory.");
}

function generateHyperframesFiles(slides, totalDuration) {
  const hyperframesConfig = {
    version: "1.0",
    fps: 60,
    width: 1920,
    height: 1080,
    output: "render.mp4"
  };
  fs.writeFileSync(path.join(OUT_DIR, "hyperframes.json"), JSON.stringify(hyperframesConfig, null, 2));

  const pkg = {
    name: "pptx-render",
    private: true,
    type: "module",
    scripts: {
      render: "npx --yes hyperframes@latest render"
    }
  };
  fs.writeFileSync(path.join(OUT_DIR, "package.json"), JSON.stringify(pkg, null, 2));

  // Generate index.html
  const styleStr = `
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #fffdf6; color: #1b1b1f; font-family: cursive; }
    .root { position: relative; width: 1920px; height: 1080px; }
    .scene { position: absolute; inset: 0; background-size: contain; background-position: center; background-repeat: no-repeat; opacity: 0; }
    .text-block { position: absolute; font-family: cursive; font-weight: bold; font-size: 32px; border: 3px solid #1b1b1f; background: #fffdf6; padding: 10px; border-radius: 12px 18px 10px 16px; box-shadow: 5px 5px 0 rgba(27,27,31,0.13); display: flex; align-items: center; justify-content: center; text-align: center; }
  `;

  let scenesHTML = '';
  slides.forEach((slide, i) => {
    let blocksHTML = '';
    slide.textBlocks.forEach((b, j) => {
      blocksHTML += `<div class="text-block item" style="top: ${b.top}%; left: ${b.left}%; width: ${b.width}%; height: ${b.height}%;">${b.text}</div>\n`;
    });

    scenesHTML += `
      <section id="scene-${i}" class="scene" style="background-image: url('${slide.bgFilename}')" data-start="${slide.start}" data-duration="${slide.duration}">
        ${blocksHTML}
      </section>
    `;
  });

  const jsStr = `
    const tl = gsap.timeline();
    const slides = ${JSON.stringify(slides)};
    
    slides.forEach((slide, i) => {
      const scene = document.getElementById('scene-' + i);
      const items = scene.querySelectorAll('.item');
      
      tl.set(scene, { opacity: 1 }, slide.start);
      if(i > 0) tl.set(document.getElementById('scene-' + (i-1)), { opacity: 0 }, slide.start);
      
      if(items.length > 0) {
        tl.from(items, { opacity: 0, y: 30, rotation: () => Math.random() * 4 - 2, scale: 0.9, duration: 0.6, stagger: 0.2, ease: "back.out(1.5)" }, slide.start + 0.5);
      }
    });
  `;

  const html = `<!doctype html>
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

  fs.writeFileSync(path.join(OUT_DIR, "index.html"), html);
}

main().catch(console.error);
