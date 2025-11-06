#!/usr/bin/env python3
"""
postedit.py - Edit and improve existing story posts

This script takes a story file location, reads the existing story,
generates an improved version while maintaining hashtags, directly edits the file,
and creates an audit file for review.
"""

import openai
import os
import sys
import re
import base64
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration from environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your-openai-api-key-here")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# Set up the OpenAI API client
client = openai.OpenAI(api_key=OPENAI_API_KEY)


def extract_timestamp_from_filename(filename):
    """Extract timestamp from filename like '2025-10-26-215555_story.txt'"""
    # Match pattern: YYYY-MM-DD-HHMMSS
    match = re.search(r'(\d{4}-\d{2}-\d{2}-\d{6})', filename)
    if match:
        return match.group(1)
    return None


def extract_hashtags(text):
    """Extract hashtags from text"""
    hashtags = re.findall(r'#\w+', text)
    return hashtags


def clean_response_text(text):
    """Remove markdown formatting and code blocks, keep only plain text"""
    if not text:
        return ""
    
    # Remove markdown code blocks (```text or ```)
    text = re.sub(r'```[a-z]*\n?', '', text)
    
    # Remove markdown bold/italic formatting
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # **bold**
    text = re.sub(r'\*([^*]+)\*', r'\1', text)      # *italic*
    text = re.sub(r'__([^_]+)__', r'\1', text)      # __bold__
    text = re.sub(r'_([^_]+)_', r'\1', text)        # _italic_
    
    # Remove markdown links but keep text
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    
    # Remove any remaining markdown headers
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    
    # Strip whitespace and newlines
    text = text.strip()
    
    return text


def read_story_file(story_path):
    """Read the story file and return its content"""
    try:
        with open(story_path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    except Exception as e:
        print(f"❌ Error reading story file: {e}")
        return None


def find_image_file(story_path, timestamp):
    """Find the corresponding image file"""
    story_dir = os.path.dirname(story_path)
    image_path = os.path.join(story_dir, f"{timestamp}.png")
    
    if os.path.exists(image_path):
        return image_path
    
    # Try alternative paths
    # If story is in nextjs/db, try relative to python directory
    if 'nextjs/db' in story_path:
        alt_path = os.path.join('..', 'nextjs', 'db', f"{timestamp}.png")
        if os.path.exists(alt_path):
            return os.path.abspath(alt_path)
    
    return None






def generate_improved_story(original_story, hashtags, image_path=None):
    """Generate an improved version of the story using OpenAI"""
    hashtags_text = ' '.join(hashtags) if hashtags else ''
    
    system_prompt = """You help create a short twitter length story. Use the original just for information, totally rewrite it. The original may not be related to the image. Focus on the image, and create a new story from the image as a first person account, in a fictional world. Make it as short as possible whenever you can--sometimes much shorter than the original.
    
    Don't say awkward things like "brass watch" like even in fictional world they won't describe it that way. Perhaps, just give strange technology a name instead. Don't use terms like "cradle" or overly poetic sounding words. Keep it more of an average person's writing.
    
    Return only the new story content. Do not include any markdown formatting, code blocks, quotes, or other formatting. Just the raw text."""

    # Build user prompt with image if available
    user_content = []
    
    text_prompt = f"""Here is the original story (that may be incorrect): {original_story}

{f'Keep these hashtags at the end: {hashtags_text}' if hashtags else 'You can opt to include 1 or 2 hashtags at the end, or also none.'}
"""
    
    if image_path:
        # Include image in the request
        user_content.append({
            "type": "text",
            "text": text_prompt
        })
        # Add the image
        with open(image_path, 'rb') as image_file:
            image_data = base64.b64encode(image_file.read()).decode('utf-8')
            user_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{image_data}"
                }
            })
    else:
        user_content.append({
            "type": "text",
            "text": text_prompt
        })

    try:
        if image_path:
            print("🤖 Generating improved story with OpenAI (including image analysis)...")
        else:
            print("🤖 Generating improved story with OpenAI...")
        
        response = client.chat.completions.create(
            model="gpt-4o-mini" if image_path else "gpt-5-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
        )
        
        raw_story = response.choices[0].message.content
        improved_story = clean_response_text(raw_story)
        print(f"✅ Generated improved story: {improved_story}")
        return improved_story
        
    except Exception as e:
        print(f"❌ Error generating improved story: {e}")
        if DEBUG:
            import traceback
            traceback.print_exc()
        return None


def has_story_file(txt_path, timestamp):
    """Check if a _story.txt file already exists for this .txt file"""
    txt_dir = os.path.dirname(txt_path)
    story_path = os.path.join(txt_dir, f"{timestamp}_story.txt")
    return os.path.exists(story_path)


def find_story_files(directory):
    """Find all .txt files (without _story) that are missing corresponding _story.txt files"""
    txt_files = []
    
    if not os.path.isdir(directory):
        return txt_files
    
    # Find all .txt files that don't have _story in the name
    for filename in os.listdir(directory):
        if filename.endswith('.txt') and '_story' not in filename:
            txt_path = os.path.join(directory, filename)
            timestamp = extract_timestamp_from_filename(filename)
            
            if timestamp:
                # Check if _story.txt file exists
                if not has_story_file(txt_path, timestamp):
                    txt_files.append(txt_path)
                else:
                    print(f"⏭️  Skipping {filename} (_story.txt file already exists)")
    
    return sorted(txt_files)


def process_story_file(txt_path):
    """Process a .txt file and create the corresponding _story.txt file"""
    print(f"\n{'='*60}")
    print(f"📖 Processing file: {txt_path}")
    print(f"{'='*60}")
    
    # Extract timestamp from filename
    filename = os.path.basename(txt_path)
    timestamp = extract_timestamp_from_filename(filename)
    
    if not timestamp:
        print(f"❌ Could not extract timestamp from filename: {filename}")
        print("Expected format: YYYY-MM-DD-HHMMSS.txt")
        return False
    
    print(f"📅 Extracted timestamp: {timestamp}")
    
    # Read original story from .txt file
    original_story = read_story_file(txt_path)
    if not original_story:
        return False
    
    print(f"📝 Original story: {original_story}")
    
    # Extract hashtags
    hashtags = extract_hashtags(original_story)
    if hashtags:
        print(f"🏷️  Found hashtags: {', '.join(hashtags)}")
    else:
        print("🏷️  No hashtags found")
    
    # Find image file
    image_path = find_image_file(txt_path, timestamp)
    
    if image_path:
        print(f"🖼️  Found image: {image_path}")
    else:
        print(f"⚠️  Image file not found for timestamp: {timestamp}")
        print(f"   Expected: {os.path.join(os.path.dirname(txt_path), f'{timestamp}.png')}")
        print("   Continuing without image context...")
    
    # Generate improved story (includes image in request if available)
    improved_story = generate_improved_story(original_story, hashtags, image_path)
    if not improved_story:
        return False
    
    # Create the _story.txt file
    story_dir = os.path.dirname(txt_path)
    story_path = os.path.join(story_dir, f"{timestamp}_story.txt")
    
    try:
        with open(story_path, 'w', encoding='utf-8') as f:
            f.write(improved_story)
            f.write("\n")
        print(f"✅ Created _story.txt file: {os.path.basename(story_path)}")
    except Exception as e:
        print(f"❌ Error creating _story.txt file: {e}")
        return False
    
    print(f"✅ Post edit complete for: {os.path.basename(txt_path)}")
    print(f"   📝 Created: {os.path.basename(story_path)}")
    print(f"   📄 Original unchanged: {os.path.basename(txt_path)}")
    return True


def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python postedit.py <txt_file_path>")
        print("  python postedit.py --all <directory_path>")
        print("\nExamples:")
        print("  python postedit.py ../nextjs/db/2025-10-26-215555.txt")
        print("  python postedit.py --all ../nextjs/db")
        print("\nNote: Processes .txt files (without _story) and creates _story.txt files")
        sys.exit(1)
    
    # Check if processing all files in a directory
    if sys.argv[1] == '--all' or sys.argv[1] == '-a':
        if len(sys.argv) < 3:
            print("❌ Error: Directory path required with --all option")
            print("Usage: python postedit.py --all <directory_path>")
            sys.exit(1)
        
        directory = sys.argv[2]
        
        # Resolve path
        if not os.path.isabs(directory):
            # Try relative to current directory first
            if not os.path.exists(directory):
                # Try relative to script directory
                script_dir = os.path.dirname(os.path.abspath(__file__))
                directory = os.path.join(script_dir, directory)
        
        directory = os.path.abspath(directory)
        
        if not os.path.isdir(directory):
            print(f"❌ Directory not found: {directory}")
            sys.exit(1)
        
        print(f"📁 Processing all .txt files in: {directory}")
        print(f"⏭️  Skipping files that already have _story.txt files\n")
        
        # Find all .txt files without corresponding _story.txt files
        txt_files = find_story_files(directory)
        
        if not txt_files:
            print("✅ No .txt files found to process (all have _story.txt files or no .txt files found)")
            sys.exit(0)
        
        print(f"📋 Found {len(txt_files)} .txt file(s) to process\n")
        
        # Process each file
        success_count = 0
        fail_count = 0
        
        for i, txt_path in enumerate(txt_files, 1):
            print(f"\n[{i}/{len(txt_files)}]")
            if process_story_file(txt_path):
                success_count += 1
            else:
                fail_count += 1
                print(f"⚠️  Failed to process: {txt_path}")
        
        # Summary
        print(f"\n{'='*60}")
        print(f"📊 Processing Summary")
        print(f"{'='*60}")
        print(f"✅ Successfully processed: {success_count}")
        print(f"❌ Failed: {fail_count}")
        print(f"📁 Total files: {len(txt_files)}")
        
        if fail_count > 0:
            sys.exit(1)
    
    else:
        # Process single file
        txt_path = sys.argv[1]
        
        # Resolve path
        if not os.path.isabs(txt_path):
            # Try relative to current directory first
            if not os.path.exists(txt_path):
                # Try relative to script directory
                script_dir = os.path.dirname(os.path.abspath(__file__))
                txt_path = os.path.join(script_dir, txt_path)
        
        txt_path = os.path.abspath(txt_path)
        
        if not os.path.exists(txt_path):
            print(f"❌ File not found: {txt_path}")
            sys.exit(1)
        
        # Check if it's a .txt file (not _story.txt)
        if txt_path.endswith('_story.txt'):
            print(f"❌ Error: This script processes .txt files (without _story), not _story.txt files")
            print(f"   Please provide a .txt file like: {os.path.basename(txt_path).replace('_story.txt', '.txt')}")
            sys.exit(1)
        
        if not txt_path.endswith('.txt'):
            print(f"❌ Error: File must be a .txt file")
            sys.exit(1)
        
        # Check if _story.txt already exists
        filename = os.path.basename(txt_path)
        timestamp = extract_timestamp_from_filename(filename)
        if timestamp and has_story_file(txt_path, timestamp):
            print(f"⚠️  Warning: _story.txt file already exists for this .txt file")
            print(f"   Skipping to avoid overwriting existing _story.txt")
            sys.exit(0)
        
        success = process_story_file(txt_path)
        
        if success:
            print(f"\n🎉 Post edit complete!")
        else:
            print(f"\n❌ Post edit failed")
            sys.exit(1)


if __name__ == "__main__":
    main()

