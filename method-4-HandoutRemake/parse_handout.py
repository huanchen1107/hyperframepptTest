import os
import json
import re

HANDOUT_FILE = "handout.md"
SLIDES_JSON = "slides.json"

def parse_markdown(filepath):
    print(f"Parsing markdown from {filepath}...")
    with open(filepath, 'r') as f:
        content = f.read()
        
    slides = []
    
    # Split by headers
    sections = re.split(r'\n(?=# )|\n(?=## )', content)
    
    for idx, section in enumerate(sections):
        if not section.strip():
            continue
            
        lines = section.strip().split('\n')
        title = lines[0].replace('# ', '').replace('## ', '').strip()
        body_points = []
        
        for line in lines[1:]:
            line = line.strip()
            if line.startswith('- '):
                body_points.append(line.replace('- ', '').strip())
            elif line:
                body_points.append(line)
                
        # Estimate duration: base 3s + 1.5s per body point
        duration = 3.0 + (len(body_points) * 1.5)
        
        slides.append({
            "id": f"slide_{idx+1:03d}",
            "title": title,
            "body": body_points,
            "duration": duration
        })
        
    return slides

def main():
    if not os.path.exists(HANDOUT_FILE):
        print(f"Error: {HANDOUT_FILE} not found.")
        return
        
    slides = parse_markdown(HANDOUT_FILE)
    
    with open(SLIDES_JSON, 'w') as f:
        json.dump(slides, f, indent=4)
        
    print(f"Parsed {len(slides)} slides and saved to {SLIDES_JSON}")

if __name__ == "__main__":
    main()
