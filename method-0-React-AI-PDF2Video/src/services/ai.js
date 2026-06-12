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
  const delays = [2000, 4000, 8000, 10000]; // Longer delays for high demand
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
 * Uses Gemini OCR to segment text into bounding boxes
 */
export async function segmentSlideText(base64Image) {
  if (!API_KEY) throw new Error("API Key not set");
  
  // Extract base64 part if it has data URI scheme
  const b64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  const prompt = `Please identify all text in this image. Return a JSON ARRAY, where each object contains: text, box_2d [ymin, xmin, ymax, xmax], font_size, is_bold, align, color. Coordinates should be proportional on a 0-1000 scale. Use "paragraph recognition mode" to combine text contents that visually belong to the same paragraph.`;

  const payload = {
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: b64 } }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            text: { type: "STRING" },
            box_2d: { type: "ARRAY", items: { type: "NUMBER" } },
            font_size: { type: "NUMBER" },
            is_bold: { type: "BOOLEAN" },
            align: { type: "STRING" },
            color: { type: "STRING" }
          },
          required: ["text", "box_2d"]
        }
      }
    }
  };

  const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_OCR}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return textResult ? JSON.parse(textResult) : [];
}

/**
 * Uses Gemini Image to remove text and output a clean background
 */
export async function cleanSlideBackground(base64Image) {
  if (!API_KEY) throw new Error("API Key not set");
  
  const b64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const prompt = "Please remove all main text from this image and output a clean background version. Fill gaps naturally with background texture or context.";
  
  const payload = {
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: b64 } }] }],
    generationConfig: { responseModalities: ['IMAGE'] }
  };

  const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_IMAGE}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const outputB64 = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
  if (!outputB64) throw new Error("Failed to generate image");
  
  return `data:image/png;base64,${outputB64}`;
}
