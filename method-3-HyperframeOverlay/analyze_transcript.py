import os
import json
import yaml

TRANSCRIPT_FILE = "../test_workspace/transcript/transcript_with_timestamps.json"
STORYBOARD_FILE = "storyboard.yaml"

def analyze_transcript(file_path):
    print(f"Reading transcript from {file_path}...")
    with open(file_path, 'r') as f:
        transcript = json.load(f)

    # Group into chapters by 'topic'
    chapters = []
    current_topic = None
    current_chapter = None

    for seg in transcript:
        if seg['topic'] != current_topic:
            if current_chapter:
                chapters.append(current_chapter)
            current_topic = seg['topic']
            current_chapter = {
                "title": current_topic,
                "start": seg['start'],
                "end": seg['end'],
                "segments": [seg]
            }
        else:
            current_chapter['end'] = seg['end']
            current_chapter['segments'].append(seg)
            
    if current_chapter:
        chapters.append(current_chapter)

    print(f"Detected {len(chapters)} chapters from semantic topics.")

    # Generate Storyboard Scenes
    scenes = []
    for i, chap in enumerate(chapters):
        # Extract the "highlight" (segment with highest keep_score)
        highlight_seg = max(chap['segments'], key=lambda x: x['keep_score'])
        
        # event_timestamp is relative to the start of the chapter clip
        relative_event_time = highlight_seg['start'] - chap['start']
        
        # Transparent text card format requested by user
        text_card = f"【重點 {i+1}】 {chap['title']}: {highlight_seg['text'][:20]}..."
        
        scene = {
            "id": f"scene_{i+1:03d}",
            "title": f"Chapter {i+1}: {chap['title']}",
            "video_start": chap['start'],
            "video_duration": chap['end'] - chap['start'],
            "event_timestamp": relative_event_time,
            "text_card": text_card,
            "output_video": f"clip_{i+1:03d}.mp4"
        }
        scenes.append(scene)

    storyboard = {
        "project": "pdf2video-transcript-analysis",
        "scenes": scenes
    }

    with open(STORYBOARD_FILE, "w") as f:
        yaml.dump(storyboard, f, allow_unicode=True, sort_keys=False)
        
    print(f"Storyboard generated and saved to {STORYBOARD_FILE}")

if __name__ == "__main__":
    if not os.path.exists(TRANSCRIPT_FILE):
        print(f"Error: Transcript {TRANSCRIPT_FILE} not found.")
    else:
        analyze_transcript(TRANSCRIPT_FILE)
