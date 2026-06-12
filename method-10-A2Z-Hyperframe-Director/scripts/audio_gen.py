import os
import json

def generate_mock_audio():
    storyboard_path = os.path.join(os.path.dirname(__file__), '../output/storyboard.json')
    if not os.path.exists(storyboard_path):
        print("Error: storyboard.json not found. Run director.py first.")
        return

    with open(storyboard_path, 'r', encoding='utf-8') as f:
        storyboard = json.load(f)

    out_dir = os.path.join(os.path.dirname(__file__), '../output/assets')
    os.makedirs(out_dir, exist_ok=True)

    hyperframes_config = {
        "version": "1.0",
        "fps": 60,
        "width": 1920,
        "height": 1080,
        "output": "render.mp4",
        "audio": []
    }

    current_time = 0.0
    for slide in storyboard.get("slides", []):
        tts_text = slide.get("tts_script", "")
        duration = slide.get("duration", 5.0)
        
        # MOCK TTS: In a real scenario, call Google TTS API here and save to out_dir
        audio_filename = f"tts_slide_{slide['slide_index']}.mp3"
        print(f"Mocking TTS generation for slide {slide['slide_index']}: '{tts_text[:30]}...' -> {audio_filename}")
        
        # We add the audio to the hyperframes config
        hyperframes_config["audio"].append({
            "file": f"assets/{audio_filename}",
            "start": current_time,
            "volume": 1.0
        })
        
        # Also generate a caption file (SRT) entry if needed, or we just rely on HTML text
        current_time += duration

    # Add background music
    print("Adding background music track...")
    hyperframes_config["audio"].append({
        "file": "assets/bgm.mp3",
        "start": 0,
        "volume": 0.1,
        "loop": True
    })

    conf_path = os.path.join(os.path.dirname(__file__), '../output/hyperframes.json')
    with open(conf_path, 'w', encoding='utf-8') as f:
        json.dump(hyperframes_config, f, indent=2)
    
    print(f"Generated hyperframes.json audio config at {conf_path}")

if __name__ == "__main__":
    generate_mock_audio()
