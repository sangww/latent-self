# Modernized autogen.py - For separate PC usage
# Posts to demo.sangww.net art installation

import openai
import requests
from base64 import b64decode
from time import gmtime, strftime
import time
import schedule
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration from environment variables
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:3000")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your-openai-api-key-here")
SWARMUI_URL = os.getenv("SWARMUI_URL", "http://127.0.0.1:7801")
INTERVAL_MINUTES = int(os.getenv("AUTOGEN_INTERVAL_MINUTES", "1440"))
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# Set up the OpenAI API client
client = openai.OpenAI(api_key=OPENAI_API_KEY)

# Define your prompt - Enhanced for Chroma style and better imagination
instruction = """Create a 100-word Chroma prompt describing a man in a speculative world. Please be detailed and creative about some or all of the following:

- World-building (fictional, surreal, absurd, strange, alternative retro, or futuristic, or anything) 
- Clear speculative or surreal element. This element should be detailed visually and materially.
- Consider a wide range of age (15-70), outfit, action

Use descriptive sentences than broken words. Ensure to describe the photography elements in a way that is consistent with photorealistic image. Keep the balance between familiarity and imagination. The photo could be a bit photogenic and bold in composition and color. Ensure the photo describes not only the person but also the speculative context, but keep focus on the person at least medium shot. Overall, use analog aesthetic in its photography style.

Only include the prompt in your response.

The person is Korean man but this has nothing to do with the story, just start the prompt with 'Korean man'. but don't emphasize any other Korean elements in the prompt.
"""

class SwarmUIRequest():
    def __init__(self, prompt):
        # SwarmUI API configuration for Chroma model
        self.url = f"{SWARMUI_URL}/API/GenerateText2Image"
        self.body = {
            "images": 1,
            "session_id": "",  # Will be set by getSession()
            "donotsave": True,
            "prompt": prompt,
            "negativeprompt": "lowres, blurry, cgi",
            "model": "chroma/chroma-unlocked-v48-detail-calibrated.safetensors",  # Your Chroma model
            "width": 896,
            "height": 1152,
            "cfgscale": 3.3,
            "steps": 15,
            "seed": -1,
            "sampler": "er_sde",  # ER-SDE-Solver sampler
            "scheduler": "beta",  # Beta scheduler
            "samplersigmamax": 9.7,  # Sampler Sigma Max
            "clipstopatlayer": -2,  # CLIP Stop At Layer
            "automaticvae": True  # Automatic VAE
        }
        self.session_id = None

    def getSession(self):
        """Get a new session ID from SwarmUI"""
        try:
            # Use POST request (as confirmed by debug script)
            response = requests.post(f"{SWARMUI_URL}/API/GetNewSession", json={}, timeout=10)
            response.raise_for_status()
            data = response.json()
            self.session_id = data["session_id"]
            self.body["session_id"] = self.session_id
            print(f"✅ Got session ID: {self.session_id}")
            return True
        except requests.exceptions.RequestException as e:
            print(f"Error getting SwarmUI session: {e}")
            return False

    def sendRequest(self):
        try:
            # Get session if we don't have one
            if not self.session_id:
                if not self.getSession():
                    return None
            
            r = requests.post(self.url, json=self.body, timeout=120)
            r.raise_for_status()
            result = r.json()
            
            # Check for session errors
            if "error_id" in result and result["error_id"] == "invalid_session_id":
                print("Session invalid, getting new session...")
                if self.getSession():
                    # Retry with new session
                    r = requests.post(self.url, json=self.body, timeout=120)
                    r.raise_for_status()
                    result = r.json()
                else:
                    return None
            
            # Check for other errors
            if "error" in result:
                print(f"SwarmUI API error: {result['error']}")
                return None
                
            return result
        except requests.exceptions.RequestException as e:
            print(f"Error making request to SwarmUI: {e}")
            return None


def dream():
    print(f"🎨 Starting image generation at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Get SD prompt using OpenAI 4o-mini
        response = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": "You are a creative AI that generates image generation prompts. You have a great sense of design fiction, so please not be bound and be creative in writing something that is provocative but strangely everyday."},
                {"role": "user", "content": instruction}
            ],
        )

        # Format prompt
        prompt = response.choices[0].message.content.strip()
        if not prompt.endswith('.'):
            prompt = prompt + '.'
        
        # Add LoRA tags and photography specs to the end of the prompt
        lora_tags = "<lora:chroma/sangww_000003750> <lora:chroma/Hyper-Chroma-low-step-LoRA:0.4>"
        photography_specs = ""
        prompt = prompt + "\n" + photography_specs + " " + lora_tags
        
        print(f"📝 Generated prompt: {prompt}")

        # Format timestamp
        t = strftime("%Y-%m-%d-%H%M%S", gmtime())

        # Generate image using SwarmUI
        print("🖼️ Generating image with SwarmUI...")
        js = SwarmUIRequest(prompt).sendRequest()
        
        if js is None or 'images' not in js or not js['images']:
            print("❌ Failed to generate image")
            return
            
        img = js['images'][0]

        # Ensure local db directory exists
        os.makedirs('db', exist_ok=True)

        # Save prompt locally
        with open(f'db/{t}.txt', 'w', encoding='utf-8') as txt:
            txt.write(prompt)
        
        # Generate Twitter-style story
        print("📱 Generating Twitter story...")
        try:
            story_response = client.chat.completions.create(
                model="gpt-5-mini",
                messages=[
                    {"role": "system", "content": "You help create a short, casual, single-point post for a photo upload. The image prompt provided by user is overly descriptive. Keep the post first-person, personal, not too descriptive, in twitter length. Do not include 3rd person descriptors--like you won't call your reality 'retro-futuristic' even if the prompt has it. You should write it from the perspective of the person in the photo. For instance, people see the photo, so you won't need to reference all the details in the prompt. Rather describe the monologue of the person in the photo. You can opt to include 1 or 2 hashtags at the end, or also none."},
                    {"role": "user", "content": f"Image prompt: {prompt}"}
                ],
            )
            
            story = story_response.choices[0].message.content.strip()
            print(f"📱 Generated story: {story}")
            
            # Save story locally
            with open(f'db/{t}_story.txt', 'w', encoding='utf-8') as story_file:
                story_file.write(story)
            
            print(f"✅ Story saved: db/{t}_story.txt")
            
        except Exception as story_error:
            print(f"⚠️ Story generation failed: {story_error}")
            story = "Story generation failed"

        # Save image with proper base64 handling
        try:
            # Clean and decode base64
            base64_string = img
            if base64_string.startswith('data:image'):
                base64_string = base64_string.split(',')[1]
            
            # Add padding if needed
            missing_padding = len(base64_string) % 4
            if missing_padding:
                base64_string += '=' * (4 - missing_padding)
            
            image_data = b64decode(base64_string)
            
            # Save image locally
            with open(f'db/{t}.png', "wb") as png:
                png.write(image_data)
                
        except Exception as decode_error:
            print(f"❌ Base64 decode error: {decode_error}")
            return

        print(f"💾 Saved image: gen/{t}.png")

        # Post to art installation server
        try:
            # Prepare image data for upload
            image_data = {
                'filename': f'{t}.png',
                'prompt': prompt,
                'timestamp': datetime.now().isoformat(),
                'type': 'generated'
            }
            
            # Upload image file
            with open(f'db/{t}.png', 'rb') as img_file:
                files = {'image': img_file}
                data = image_data
                
                server_response = requests.post(f'{SERVER_URL}/api/upload', 
                    files=files,
                    data=data,
                    timeout=30
                )
            
            if server_response.status_code == 200:
                print(f"✅ Successfully uploaded to server: {SERVER_URL}")
            else:
                print(f"⚠️ Server response: {server_response.status_code}")
                print(f"Response: {server_response.text}")
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Could not post to server: {e}")
            print(f"Server URL: {SERVER_URL}")

        print(f"🎉 Generation complete: {t}")
        
    except Exception as e:
        print(f"❌ Error in dream(): {e}")
        import traceback
        traceback.print_exc()


# Schedule and run
if __name__ == "__main__":
    print("🚀 Starting Latent Sheep autogen...")
    print(f"🌐 Server URL: {SERVER_URL}")
    print(f"🔑 OpenAI API Key: {'✅ Set' if OPENAI_API_KEY != 'your-openai-api-key-here' else '❌ Not set'}")
    print("⏰ Running every 5 minutes...")
    
    # Test connection to server
    try:
        test_response = requests.get(f"{SERVER_URL}/api/posts", timeout=10)
        if test_response.status_code == 200:
            print("✅ Successfully connected to art installation server")
        else:
            print(f"⚠️ Server responded with status: {test_response.status_code}")
    except requests.exceptions.RequestException as e:
            print(f"❌ Cannot connect to server: {e}")
        print("Make sure the server is running and accessible")
    
    # Run once immediately for testing
    dream()
    
    # Schedule regular runs
    schedule.every(INTERVAL_MINUTES).minutes.do(dream)

    while True:
        schedule.run_pending()
        time.sleep(1)