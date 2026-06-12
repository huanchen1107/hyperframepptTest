import os
import subprocess
import re

INPUT_VIDEO = "source1-antigravity-openspec.mp4"
OUTPUT_VIDEO = "output_highlight.mp4"
CONCAT_FILE = "concat.txt"

def get_video_duration(filename):
    cmd = ["ffmpeg", "-i", filename]
    process = subprocess.run(cmd, stderr=subprocess.PIPE, universal_newlines=True)
    match = re.search(r"Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})", process.stderr)
    if match:
        h, m, s = match.groups()
        return float(h) * 3600 + float(m) * 60 + float(s)
    return 0.0

def detect_silence(filename, noise="-30dB", duration="0.5"):
    print(f"Running silence detection on {filename}...")
    cmd = [
        "ffmpeg", "-i", filename, 
        "-af", f"silencedetect=noise={noise}:d={duration}", 
        "-f", "null", "-"
    ]
    process = subprocess.run(cmd, stderr=subprocess.PIPE, universal_newlines=True)
    
    silences = []
    current_start = None
    
    for line in process.stderr.split('\n'):
        if "silence_start" in line:
            match = re.search(r"silence_start: ([\d\.]+)", line)
            if match:
                current_start = float(match.group(1))
        elif "silence_end" in line:
            match = re.search(r"silence_end: ([\d\.]+)", line)
            if match and current_start is not None:
                current_end = float(match.group(1))
                silences.append((current_start, current_end))
                current_start = None
                
    return silences

def calculate_keep_segments(silences, total_duration):
    keep_segments = []
    current_time = 0.0
    
    for start, end in silences:
        if start > current_time:
            keep_segments.append((current_time, start))
        current_time = end
        
    if current_time < total_duration:
        keep_segments.append((current_time, total_duration))
        
    return keep_segments

def generate_concat_file(segments, output_txt, video_file):
    with open(output_txt, 'w') as f:
        for start, end in segments:
            f.write(f"file '{video_file}'\n")
            f.write(f"inpoint {start:.3f}\n")
            f.write(f"outpoint {end:.3f}\n")
    print(f"Generated {output_txt} with {len(segments)} segments to keep.")

def concat_video(concat_txt, output_filename):
    print("Concatenating and trimming video segments...")
    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", 
        "-i", concat_txt, 
        "-c:v", "libx264", "-preset", "fast", "-crf", "23", 
        "-c:a", "aac", "-b:a", "128k",
        output_filename
    ]
    subprocess.run(cmd, stderr=subprocess.PIPE)
    print(f"Highlight video saved to {output_filename}")

def main():
    if not os.path.exists(INPUT_VIDEO):
        print(f"Error: {INPUT_VIDEO} not found in the current directory.")
        return

    total_duration = get_video_duration(INPUT_VIDEO)
    if total_duration == 0:
        print("Error: Could not determine video duration.")
        return
        
    print(f"Total Video Duration: {total_duration:.2f}s")
    
    silences = detect_silence(INPUT_VIDEO, noise="-30dB", duration="0.5")
    print(f"Detected {len(silences)} silent segments.")
    
    keep_segments = calculate_keep_segments(silences, total_duration)
    
    # Filter out very tiny segments (less than 0.5s) to avoid glitched rapid cuts
    keep_segments = [(s, e) for s, e in keep_segments if (e - s) > 0.5]
    
    if not keep_segments:
        print("No audio detected to keep!")
        return
        
    generate_concat_file(keep_segments, CONCAT_FILE, INPUT_VIDEO)
    concat_video(CONCAT_FILE, OUTPUT_VIDEO)
    
if __name__ == "__main__":
    main()
