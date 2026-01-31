---
name: youtube-prep
category: content
description: Prepare YouTube uploads from raw footage
author: nixthe6th
version: 1.0.0
---

# YouTube Prep Skill

Automatically processes raw video files for YouTube upload.

## Triggers
- File dropped in watched folder
- Manual: `openclaw run content/youtube-prep --input <path>`

## Actions

### 1. Organize
- Renames files with date prefix (YYYY-MM-DD_*)
- Moves to structured folder (by month)
- Creates backup

### 2. Analyze
- Extracts video metadata (duration, resolution)
- Generates transcript (if audio present)
- Identifies key moments

### 3. Generate Content
- AI title suggestions (3 options)
- AI description with timestamps
- Tag recommendations
- Thumbnail frame suggestions

### 4. Output
- Creates upload package:
  ```
  {date}_{title}/
  ├── video.mp4
  ├── title.txt
  ├── description.txt
  ├── tags.txt
  ├── thumbnails/
  │   ├── option1.jpg
  │   ├── option2.jpg
  │   └── option3.jpg
  └── metadata.json
  ```

## Configuration

```json
{
  "input_folder": "~/Videos/Raw",
  "output_folder": "~/Videos/Ready",
  "ai_model": "kimi-k2.5",
  "thumbnail_frames": 3,
  "auto_upload": false
}
```

## Requires
- Node.js 16+
- ffmpeg (for video processing)
- AI API key (Moonshot/Kimi)
