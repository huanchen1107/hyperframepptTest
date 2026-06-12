import os
import subprocess
import yaml

def render_scene(scene):
    video_file = scene['output_video']
    text = scene['text_card']
    # Escape special characters for ffmpeg filter
    escaped_text = text.replace(":", "\\\\:").replace("'", "\\\\'")
    event_time = scene['event_timestamp']
    output_file = f"rendered_{video_file}"
    
    if not os.path.exists(video_file):
        print(f" [Skip] {video_file} not found.")
        return

    print(f" -> Rendering Scene: {scene['title']}...")
    
    # ffmpeg complex filter to draw a semi-transparent box and text overlay
    # starting at event_time and ending 5 seconds later
    start_time = float(event_time)
    end_time = start_time + 5.0
    
    # Ensure a font path for Chinese characters on macOS
    font_path = "/System/Library/Fonts/PingFang.ttc"
    if not os.path.exists(font_path):
        # Fallback to English generic if PingFang isn't found
        font_path = "" 
        
    font_arg = f":fontfile={font_path}" if font_path else ""
    
    filter_complex = (
        f"drawbox=y=ih-150:color=black@0.6:width=iw:height=100:t=fill"
        f":enable='between(t,{start_time},{end_time})', "
        f"drawtext=text='{escaped_text}'{font_arg}:fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-120"
        f":enable='between(t,{start_time},{end_time})'"
    )

    cmd = [
        "ffmpeg", "-y", "-i", video_file,
        "-vf", filter_complex,
        "-c:v", "libx264", "-preset", "fast", "-c:a", "copy",
        output_file
    ]
    
    subprocess.run(cmd, stderr=subprocess.PIPE)
    print(f"    Saved as {output_file}")

def main():
    print("Reading Storyboard YAML...")
    if not os.path.exists("storyboard.yaml"):
        print("Error: storyboard.yaml not found.")
        return
        
    with open("storyboard.yaml", "r") as f:
        data = yaml.safe_load(f)
        
    scenes = data.get("scenes", [])
    print(f"Found {len(scenes)} scenes to render.\n")
    
    for scene in scenes:
        render_scene(scene)
        
    print("\nHyperframe overlay rendering complete!")

if __name__ == "__main__":
    main()
