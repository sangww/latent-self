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
instruction = """Create a detailed 100-word Chroma prompt describing a Korean man in a speculative scenario. The person is Korean but the context and environment are not necessarily Korea.

Be specific about:
- Universe/world (past, future, retro, etc.) 
- One speculative element to be clearly included in the context.
- Age, appearance, outfit, action or pose
- Environment, lighting, background, situation

Think of Chroma-style photorealistic image. Please ensure to include familiarity. Do not embelish but use succinct descriptions. Keep speculative elements to one or two, to keep the balance between realism and imagination. 

Include compositional description to mainly focus on the upper body of the person from closeup, but the person may not be facing the camera. Explain the photography elements in that regard. 

Overall, create an analog retro aesthetic in its photography style.

Only include the prompt in your response.
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
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a creative AI that generates Stable Diffusion prompts. Focus on Chroma-style photorealistic aesthetic."},
                {"role": "user", "content": instruction}
            ],
            temperature=0.8,
            max_tokens=150,
        )

        # Format prompt
        prompt = response.choices[0].message.content.strip()
        if not prompt.endswith('.'):
            prompt = prompt + '.'
        
        # Add LoRA tags and photography specs to the end of the prompt
        lora_tags = "<lora:chroma/sangww_000003750> <lora:chroma/Hyper-Chroma-low-step-LoRA:0.4>"
        photography_specs = "macro intimate portraiture closeup, canon 50mm f1.2 lens, sharp focus and depth of field, analog textural photo."
        prompt = prompt + "\n\n" + photography_specs + ", " + lora_tags
        
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
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a social media writer who creates a short, casual, single-point story for a photo post. The prompt is overly descriptive, where the twitter post should be anecdoctal and coming from a personal voice by the person in the photo. Keep it short, twitter length."},
                    {"role": "user", "content": f"Create a casual Twitter-style story based on this image prompt: {prompt}"}
                ],
                temperature=0.7,
                max_tokens=100,
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