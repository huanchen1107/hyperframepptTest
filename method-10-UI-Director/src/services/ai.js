// You will need to provide your API key in the UI or environment variable
const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
let API_KEY = localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY;

export const setApiKey = (key) => {
  API_KEY = key;
  localStorage.setItem('gemini_api_key', key);
};

export const getApiKey = () => API_KEY;

const MODEL_OCR = "gemini-2.5-flash";
const MODEL_IMAGE = "gemini-2.5-flash-image";

const wait = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(url, options, maxRetries = 4) {
  const delays = [5000, 15000, 30000, 60000]; // Massive delays to survive 2 RPM free tier limits
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        const json = await response.json();
        // If response is OK but missing candidates, log it
        if (!json.candidates) console.warn("API OK but no candidates returned:", json);
        return json;
      }
      
      if (response.status === 429 || response.status === 503) { 
        if (i === maxRetries - 1) throw new Error(`API permanently unavailable after retries (Status ${response.status}). Please try again later.`);
        console.warn(`API Overloaded (Status ${response.status}). Retrying in ${delays[i]/1000} seconds...`);
        await wait(delays[i]); 
        continue; 
      }
      
      const errorJson = await response.json();
      throw new Error(errorJson.error?.message || `HTTP ${response.status}`);
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      console.warn("Network/API error, retrying...", e.message);
      await wait(delays[i]);
    }
  }
  throw new Error("Failed to fetch from API after all retries.");
}

/**
 * Method 10: Generates a JSON Storyboard from a PDF File + Transcript
 */
export async function generateStoryboard(pdfData, transcript, isDebugMode = false) {
  if (!API_KEY) throw new Error("API Key not set");

  const b64Parts = Array.isArray(pdfData) 
    ? pdfData.map(b64 => ({ inlineData: { mimeType: "image/jpeg", data: b64.includes(',') ? b64.split(',')[1] : b64 } }))
    : [{ inlineData: { mimeType: "application/pdf", data: pdfData.includes(',') ? pdfData.split(',')[1] : pdfData } }];

const prompt = `You are a master video director.
Analyze the provided PDF presentation and the user's transcript (逐字稿).
Create a highly structured JSON storyboard.
${isDebugMode ? "CRITICAL DEBUG OVERRIDE: YOU MUST ONLY PROCESS THE FIRST 3 SLIDES OF THIS PDF! DO NOT CREATE ANY JSON ENTRIES FOR SLIDES BEYOND SLIDE 3. STOP AFTER THE 3RD SLIDE." : ""}
For each slide in the PDF, map out:
1. The exact "tts_script" (the dialogue the AI voice will say).
2. A list of "animations" for the objects on the slide, with "target" (description of the object) and "start_time" (in seconds relative to the slide start).
3. For each animation, include a "box_2d" array [ymin, xmin, ymax, xmax] mapping the bounding box of the target object proportionally on a 0-1000 scale.

Return ONLY valid JSON in this exact format:
{
  "slides": [
    {
      "slide_index": 1,
      "tts_script": "Welcome to A2Z...",
      "duration": 5.0,
      "animations": [
        { "target": "title text", "start_time": 0.5, "box_2d": [100, 100, 200, 900] },
        { "target": "first bullet point", "start_time": 2.0, "box_2d": [300, 100, 350, 900] }
      ]
    }
  ]
}`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { text: "Transcript:\n" + transcript },
        ...b64Parts
      ]
    }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_OCR}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResult) throw new Error("API returned no valid text.");
  return JSON.parse(textResult);
}

export async function generateSingleSlideStoryboard(imageBase64, slideIndex, transcript) {
  if (!API_KEY) throw new Error("API Key not set.");

  const b64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const prompt = `You are a master video director.
Analyze the provided presentation slide image. If a transcript is provided, extract the dialogue specific to this slide.
Create a highly structured JSON storyboard.
Map out:
1. The exact "tts_script" (the dialogue the AI voice will say).
2. A list of "animations" for the objects on the slide, with "target" (description of the object) and "start_time" (in seconds relative to the slide start).
3. For each animation, include a "box_2d" array [ymin, xmin, ymax, xmax] mapping the bounding box of the target object proportionally on a 0-1000 scale.

Return ONLY valid JSON in this exact format:
{
  "slide_index": ${slideIndex},
  "tts_script": "Welcome to A2Z...",
  "duration": 5.0,
  "animations": [
    { "target": "title text", "start_time": 0.5, "box_2d": [100, 100, 200, 900] },
    { "target": "first bullet point", "start_time": 2.0, "box_2d": [300, 100, 350, 900] }
  ]
}`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { text: "Global Transcript:\n" + transcript },
        { inlineData: { mimeType: "image/jpeg", data: b64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json"
    }
  };

  const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_OCR}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResult) throw new Error("API returned no valid text.");
  return JSON.parse(textResult);
}

export async function regenerateSlideStoryboard(imageBase64, currentSlideData, userFeedback) {
  if (!API_KEY) throw new Error("API Key not set.");

  const b64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const prompt = `You are a master video director.
I am providing you with an image of a single presentation slide, the current JSON storyboard data for this slide, and feedback from the user.
Please adjust the storyboard JSON based on the user's feedback. You may modify the "tts_script", the "duration", or add/edit/remove objects in the "animations" array.

User Feedback:
"${userFeedback}"

Current Storyboard JSON for this slide:
${JSON.stringify(currentSlideData, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "slide_index": ${currentSlideData.slide_index},
  "tts_script": "...",
  "duration": 5.0,
  "animations": [
    { "target": "title text", "start_time": 0.5, "box_2d": [100, 100, 200, 900] }
  ]
}`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: "image/png", data: b64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json"
    }
  };

  const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_OCR}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResult) throw new Error("API returned no valid text.");
  return JSON.parse(textResult);
}
