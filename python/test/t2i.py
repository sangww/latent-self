# Debug SwarmUI Request
# Test the exact payload from gen.py to see what's causing the 500 error

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SWARMUI_URL = os.getenv("SWARMUI_URL", "http://127.0.0.1:7801")

def debug_swarmui_request():
    """Debug the exact request that's failing in gen.py"""
    
    print("🔍 Debug SwarmUI Request")
    print("=" * 40)
    
    # Get a session first
    print("🎫 Getting session...")
    try:
        session_response = requests.post(f"{SWARMUI_URL}/API/GetNewSession", json={}, timeout=10)
        if session_response.status_code != 200:
            print(f"❌ Session creation failed: {session_response.status_code}")
            return False
        
        session_data = session_response.json()
        session_id = session_data.get("session_id")
        print(f"✅ Session created: {session_id}")
        
    except Exception as e:
        print(f"❌ Session error: {e}")
        return False
    
    # Test with the exact payload from gen.py
    test_prompt = "A mysterious man in a Victorian steampunk laboratory, wearing brass goggles and a leather apron, surrounded by glowing crystals and mechanical contraptions, cinematic lighting, Chroma style, highly detailed. <lora:chroma/sangww_000003500> <lora:chroma/Hyper-Chroma-low-step-LoRA:0.4>, canon 50mm f1.2 lens, sharp focus and depth of field, analog textural photo."
    
    payload = {
        "images": 1,
        "session_id": session_id,
        "donotsave": True,
        "prompt": test_prompt,
        "negativeprompt": "lowres, blurry, cgi",
        "model": "chroma/chroma-unlocked-v48-detail-calibrated.safetensors",
        "width": 896,
        "height": 1152,
        "cfgscale": 3.5,
        "steps": 13,
        "seed": -1,
        "sampler": "er_sde",
        "scheduler": "beta"
    }
    
    print(f"\n📝 Test prompt: {test_prompt}")
    print(f"\n📊 Payload: {json.dumps(payload, indent=2)}")
    
    # Try the request
    print(f"\n🎨 Testing image generation...")
    try:
        response = requests.post(f"{SWARMUI_URL}/API/GenerateText2Image", json=payload, timeout=120)
        print(f"📊 Response status: {response.status_code}")
        print(f"📊 Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ Image generation successful!")
            result = response.json()
            print(f"📊 Response keys: {list(result.keys())}")
            if "images" in result:
                print(f"📊 Generated {len(result['images'])} image(s)")
            return True
        else:
            print(f"❌ Image generation failed: {response.status_code}")
            print(f"📊 Response text: {response.text[:500]}...")
            return False
            
    except Exception as e:
        print(f"❌ Request error: {e}")
        return False

def test_simplified_payload():
    """Test with a simplified payload to isolate the issue"""
    
    print("\n🔍 Testing Simplified Payload")
    print("=" * 40)
    
    # Get session
    try:
        session_response = requests.post(f"{SWARMUI_URL}/API/GetNewSession", json={}, timeout=10)
        session_data = session_response.json()
        session_id = session_data.get("session_id")
        print(f"✅ Session: {session_id}")
    except Exception as e:
        print(f"❌ Session error: {e}")
        return False
    
    # Test with minimal payload
    simple_payload = {
        "images": 1,
        "session_id": session_id,
        "donotsave": True,
        "prompt": "a simple test image",
        "negativeprompt": "",
        "model": "chroma/chroma-unlocked-v48-detail-calibrated.safetensors",
        "width": 512,
        "height": 512,
        "cfgscale": 7.5,
        "steps": 1,
        "seed": -1,
        "sampler": "euler",
        "scheduler": "normal"
    }
    
    print(f"\n📊 Simple payload: {json.dumps(simple_payload, indent=2)}")
    
    try:
        response = requests.post(f"{SWARMUI_URL}/API/GenerateText2Image", json=simple_payload, timeout=120)
        print(f"📊 Response status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Simple payload works!")
            return True
        else:
            print(f"❌ Simple payload failed: {response.status_code}")
            print(f"📊 Response: {response.text[:200]}...")
            return False
            
    except Exception as e:
        print(f"❌ Simple payload error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 SwarmUI Debug Tool")
    print("Testing the exact payload from gen.py")
    print()
    
    # Test the exact payload
    success1 = debug_swarmui_request()
    
    # Test simplified payload
    success2 = test_simplified_payload()
    
    print(f"\n📊 Results:")
    print(f"   Exact payload: {'✅ PASS' if success1 else '❌ FAIL'}")
    print(f"   Simple payload: {'✅ PASS' if success2 else '❌ FAIL'}")
    
    if not success1 and success2:
        print("\n💡 The issue is likely with specific parameters in the exact payload")
        print("   Possible causes:")
        print("   - Model name: chroma/chroma-unlocked-v48-detail-calibrated.safetensors")
        print("   - Sampler: er_sde")
        print("   - Scheduler: beta")
        print("   - Dimensions: 896x1152")
        print("   - LoRA tags in prompt")
    elif not success1 and not success2:
        print("\n💡 SwarmUI is having general issues")
    else:
        print("\n🎉 Everything is working!")
