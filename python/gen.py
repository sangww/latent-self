# Single Image Generation Test
# Tests SwarmUI integration without server dependency

import openai
import requests
from base64 import b64decode
from time import gmtime, strftime
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration from environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your-openai-api-key-here")
SWARMUI_URL = os.getenv("SWARMUI_URL", "http://127.0.0.1:7801")
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:3000")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# Set up the OpenAI API client
client = openai.OpenAI(api_key=OPENAI_API_KEY)

# Define your prompt - Enhanced for Chroma style and better imagination
instruction = """Create a 100-word Chroma prompt for image generation.

The goal is to produce photographic capture of a man in a speculative, fictional world. Consider an social-media photo style, however, with a strong visual statement.

Please consider unique settings, not too boring. Feel free to permute with [wildlife nature, back to the future, science fiction technology, etc.] but not limited to these. Be creative in adding a unique technological fiction element--don't be modest! Add a clear technology, object or background that add focus to the setting.
Select style or outfit or age range (15-70), action or pose, weather and time of day.
Select artistic style. Get inspiration from cinematic masters, like Wes Anderson, Steven Spielberg, Black Mirror, etc.

Combine these choices into a succinct, cohesive, photorealistic description in analog photography style. Keep focus on the person at medium shot or closeup, but the person does not need to face the camera.

Exclude setting elements around: terrarium, hologram, globe, bio-luminescent, bird, fish, chinese, camera, cigarette, watch.

Only include the prompt in your response. The person is Korean man but this has nothing to do with the story, just start the prompt with 'Korean man'. but don't emphasize any other Korean elements in the prompt.
"""

"""Create a 100-word Chroma prompt for image generation. Please be detailed and creative about the following:

Select exactly one setting from the list, or create your own: [science fiction, extreme environments, retro 60s or 70s household, robotic urbanity, post-industrial serenity, neo-modern minimalistic, cyborgs and androids, extraterrestrial, non-carbon nature, post-apocalyptic, etc.].  
Select exactly one world element, speculative or fantastical, specific and visually clear and interesting.
Select exactly one occupation or outfit or age range (15-70), or create your own].  
Select exactly one action or composition.
Select exactly one artistic style, like minimalism, retro, maximalism, surrealism, or others. Get inspiration from cinematic masters, like Wes Anderson, Tarkovsky, James Cameron, Quentin Tarantino, Steven Spielberg, Ridley Scott, Black Mirror, etc.

Combine these choices into a succinct, cohesive, photorealistic description in analog photography style. Keep the balance between familiarity and imagination. The photo could be a bit bold in composition and color. Keep focus on the person at medium shot or closeup, but the person does not need to face the camera.

Exclude topics around: terrarium, hologram, bio-luminescent, bird, fish, brass, watch, compass.

Only include the prompt in your response. The person is Korean man but this has nothing to do with the story, just start the prompt with 'Korean man'. but don't emphasize any other Korean elements in the prompt.
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
            "negativeprompt": "lowres, blurry, cgi, china",
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
        """Send the request to SwarmUI and return the result"""
        try:
            if not self.session_id:
                if not self.getSession():
                    return None
            
            r = requests.post(self.url, json=self.body, timeout=120)
            r.raise_for_status()
            result = r.json()
            
            # Handle session invalidation
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

def upload_to_server(image_path, prompt, story, timestamp):
    """Upload image and metadata to Next.js API"""
    try:
        url = f"{SERVER_URL}/api/upload"
        
        # Read the image file
        with open(image_path, "rb") as f:
            # Use just ".png" extension so server only uses timestamp
            files = {"image": (".png", f, "image/png")}
            data = {
                "timestamp": timestamp,
                "prompt": prompt,
                "story": story,
                "type": "autogen"
            }
            
            # Make the upload request
            response = requests.post(url, files=files, data=data, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            print(f"✅ Upload successful: {result.get('id', 'unknown')}")
            return True
            
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Upload failed: {e}")
        return False
    except Exception as e:
        print(f"⚠️ Upload error: {e}")
        return False

def generate_single_image():
    """Generate a single test image"""
    print("🎨 Single Image Generation Test")
    print("=" * 50)
    
    try:
        # Get SD prompt using OpenAI 4o-mini
        print("🤖 Generating prompt with OpenAI...")
        response = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": "Your role is to help generates image generation prompts. You have a great sense of design fiction, focused on provocative but strangely everyday elements."},
                {"role": "system", "content": instruction}
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
        
        if js is None:
            print("❌ Image generation failed")
            return False
        
        # Decode and save image
        print("💾 Saving image...")
        try:
            # Get the base64 string and clean it
            base64_string = js["images"][0]
            print(f"📊 Base64 length: {len(base64_string)}")
            
            # Remove any data URL prefix if present
            if base64_string.startswith('data:image'):
                base64_string = base64_string.split(',')[1]
            
            # Add padding if needed
            missing_padding = len(base64_string) % 4
            if missing_padding:
                base64_string += '=' * (4 - missing_padding)
            
            image_data = b64decode(base64_string)
            print(f"✅ Successfully decoded {len(image_data)} bytes")
            
        except Exception as decode_error:
            print(f"❌ Base64 decode error: {decode_error}")
            print(f"📊 Raw base64 (first 100 chars): {base64_string[:100]}...")
            return False
        
        # Create local db directory if it doesn't exist
        os.makedirs("db", exist_ok=True)
        
        # Save image locally
        filename = f"db/{t}.png"
        with open(filename, "wb") as f:
            f.write(image_data)
        
        # Save prompt locally
        prompt_filename = f"db/{t}.txt"
        with open(prompt_filename, "w", encoding="utf-8") as f:
            f.write(prompt)
        
        # Generate Twitter-style story
        print("📱 Generating Twitter story...")
        try:
            story_response = client.chat.completions.create(
                model="gpt-5-mini",
                messages=[
                    {"role": "system", "content": "You help create a short, casual, single-point writing for social media photo post. Keep the post first-person, personal, not too descriptive, in twitter length. Do not include 3rd person descriptors--like you won't call your reality 'retro-futuristic' even if the prompt has it. You should write it from the perspective of the person in the photo. For instance, people see the photo, so you won't need to reference all the details in the prompt. Rather describe the monologue of the person in the photo. You can opt to include 1 or 2 hashtags at the end, or also none."},
                    {"role": "user", "content": f"Image prompt: {prompt}"}
                ],
            )
            
            story = story_response.choices[0].message.content.strip()
            print(f"📱 Generated story: {story}")
            
            # Save story locally
            story_filename = f"db/{t}_story.txt"
            with open(story_filename, "w", encoding="utf-8") as f:
                f.write(story)
            
            print(f"✅ Story saved: {story_filename}")
            
        except Exception as story_error:
            print(f"⚠️ Story generation failed: {story_error}")
            story = "Story generation failed"
        
        print(f"✅ Image saved: {filename}")
        print(f"✅ Prompt saved: {prompt_filename}")
        print(f"📊 Image size: {len(image_data)} bytes")
        
        # Upload to Next.js API if available
        print("📤 Uploading to Next.js server...")
        upload_success = upload_to_server(filename, prompt, story, t)
        
        if upload_success:
            print("✅ Successfully uploaded to Next.js server")
        else:
            print("⚠️ Failed to upload to Next.js server (this is optional)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if DEBUG:
            import traceback
            traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 SwarmUI Single Image Generation Test")
    print("Testing Chroma model with ER-SDE-Solver and Beta scheduler")
    print()
    
    success = generate_single_image()
    
    if success:
        print("\n🎉 Test PASSED!")
        print("💡 Your SwarmUI configuration is working correctly")
        print("🚀 Ready to use autogen.py for production!")
    else:
        print("\n❌ Test FAILED!")
        print("💡 Check your SwarmUI configuration and connectivity")
