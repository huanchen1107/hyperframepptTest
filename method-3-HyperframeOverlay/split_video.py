import os
import subprocess
import yaml

INPUT_VIDEO = "../method-1-RawVideoHighlight/output_highlight.mp4"

def split_video(input_file):
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found. Cannot split video.")
        return []

    print("Reading Storyboard YAML to determine chapter boundaries...")
    with open("storyboard.yaml", "r") as f:
        data = yaml.safe_load(f)
        
    scenes = data.get("scenes", [])
    output_files = []
    
    for scene in scenes:
        start_time = scene['video_start']
        duration = scene['video_duration']
        output_file = scene['output_video']
        output_files.append(output_file)
        
        print(f" -> Extracting {scene['title']} (Start: {start_time:.2f}s, Duration: {duration:.2f}s)...")
        cmd = [
            "ffmpeg", "-y", "-ss", str(start_time), "-t", str(duration),
            "-i", input_file, 
            "-c:v", "libx264", "-preset", "fast", "-c:a", "aac",
            output_file
        ]
        subprocess.run(cmd, stderr=subprocess.PIPE)
        
    print("Splitting complete!")
    return output_files

if __name__ == "__main__":
    split_video(INPUT_VIDEO)
