import os
import json
import subprocess

SLIDES_JSON = "slides.json"
OUTPUT_VIDEO = "slideshow_video.mp4"

def escape_text(text):
    return text.replace(":", "\\:").replace("'", "\\'")

def render_slide(slide):
    output_file = f"{slide['id']}.mp4"
    duration = slide['duration']
    title = escape_text(slide['title'])
    
    body_text = "\\n\\n".join([f"- {escape_text(p)}" for p in slide['body']])
    
    font_path = "/System/Library/Fonts/Helvetica.ttc"
    if not os.path.exists(font_path):
        font_path = ""
    font_arg = f":fontfile={font_path}" if font_path else ""

    # Create a solid background and overlay title and body text
    filter_complex = (
        f"color=c=#1e1e2e:s=1280x720:d={duration} [bg]; "
        f"[bg]drawtext=text='{title}'{font_arg}:fontcolor=white:fontsize=64:x=(w-text_w)/2:y=100 [v1]; "
        f"[v1]drawtext=text='{body_text}'{font_arg}:fontcolor=#cdd6f4:fontsize=40:x=150:y=250"
    )

    print(f" -> Rendering {output_file} ({duration}s)...")
    cmd = [
        "ffmpeg", "-y", "-f", "lavfi", "-i", "nullsrc=s=1280x720:d=1", # Dummy input to make lavfi work with filter_complex
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", # Silent audio track
        "-filter_complex", filter_complex,
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast", "-c:a", "aac",
        output_file
    ]
    
    process = subprocess.run(cmd, stderr=subprocess.PIPE, universal_newlines=True)
    if process.returncode != 0:
        print(f"Error rendering {output_file}:\n{process.stderr}")
    return output_file

def main():
    if not os.path.exists(SLIDES_JSON):
        print(f"Error: {SLIDES_JSON} not found.")
        return
        
    with open(SLIDES_JSON, 'r') as f:
        slides = json.load(f)
        
    print(f"Loaded {len(slides)} slides. Rendering individual clips...")
    
    slide_files = []
    for slide in slides:
        output_file = render_slide(slide)
        slide_files.append(output_file)
        
    # Create concat.txt
    concat_file = "concat.txt"
    with open(concat_file, "w") as f:
        for sf in slide_files:
            f.write(f"file '{sf}'\n")
            
    print("Concatenating into final slideshow video...")
    concat_cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", concat_file,
        "-c", "copy",
        OUTPUT_VIDEO
    ]
    subprocess.run(concat_cmd, stderr=subprocess.PIPE)
    
    print(f"Success! Final presentation saved to {OUTPUT_VIDEO}")

if __name__ == "__main__":
    main()
