import os
import sys
import json
import base64
import requests

API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODEL = "gemini-2.5-flash"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

def upload_to_gemini(file_path, mime_type):
    # For simplicity, we just base64 encode the PDF and send it directly inline
    with open(file_path, "rb") as f:
        data = f.read()
    return base64.b64encode(data).decode('utf-8')

def generate_storyboard(pdf_path, transcript_path):
    print(f"Reading PDF: {pdf_path}")
    pdf_b64 = upload_to_gemini(pdf_path, "application/pdf")
    
    transcript = ""
    if os.path.exists(transcript_path):
        with open(transcript_path, "r", encoding="utf-8") as f:
            transcript = f.read()
            
    print(f"Loaded transcript ({len(transcript)} chars). Generating storyboard...")
    
    prompt = """
You are a master video director.
Analyze the provided PDF presentation and the user's transcript (逐字稿).
Create a highly structured JSON storyboard.
For each slide in the PDF, map out:
1. The exact "tts_script" (the dialogue the AI voice will say).
2. A list of "animations" for the objects on the slide, with "target" (description of the object) and "start_time" (in seconds relative to the slide start).

Return ONLY valid JSON in this exact format:
{
  "slides": [
    {
      "slide_index": 1,
      "tts_script": "Welcome to A2Z...",
      "duration": 5.0,
      "animations": [
        { "target": "title text", "start_time": 0.5 },
        { "target": "first bullet point", "start_time": 2.0 }
      ]
    }
  ]
}
"""

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"text": f"Transcript:\n{transcript}"},
                {"inline_data": {"mime_type": "application/pdf", "data": pdf_b64}}
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    max_retries = 5
    base_delay = 2
    
    for attempt in range(max_retries):
        response = requests.post(URL, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            try:
                text_resp = result['candidates'][0]['content']['parts'][0]['text']
                storyboard = json.loads(text_resp)
                
                out_path = os.path.join(os.path.dirname(__file__), '../output/storyboard.json')
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(storyboard, f, indent=2, ensure_ascii=False)
                print(f"Storyboard saved to {out_path}")
                return
            except Exception as e:
                print("Failed to parse Gemini output:", e)
                print(result)
                return
                
        elif response.status_code in [429, 503]:
            delay = base_delay * (2 ** attempt)
            print(f"API Overloaded (Status {response.status_code}). Retrying in {delay} seconds...")
            import time
            time.sleep(delay)
        else:
            print("API Error:", response.text)
            sys.exit(1)
            
    print("Error: API permanently unavailable after retries.")
    sys.exit(1)

if __name__ == "__main__":
    pdf_file = os.path.join(os.path.dirname(__file__), '../../src/A2Z.pdf')
    transcript_file = os.path.join(os.path.dirname(__file__), '../inputs/transcript.txt')
    generate_storyboard(pdf_file, transcript_file)
