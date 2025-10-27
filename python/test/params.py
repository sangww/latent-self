# SwarmUI Parameter Explorer
# Gets key parameters for image generation

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_swarmui_params():
    """Get SwarmUI parameters and extract key ones for image generation"""
    
    swarmui_url = os.getenv("SWARMUI_URL", "http://127.0.0.1:7801")
    
    try:
        # Get session
        session_response = requests.post(f"{swarmui_url}/API/GetNewSession", json={}, timeout=10)
        if session_response.status_code != 200:
            print(f"❌ Failed to get session: {session_response.status_code}")
            return
            
        session_data = session_response.json()
        session_id = session_data.get("session_id")
        print(f"✅ Got session ID: {session_id}")
        
        # Get parameters
        params_response = requests.post(f"{swarmui_url}/API/ListT2IParams", json={"session_id": session_id}, timeout=10)
        if params_response.status_code != 200:
            print(f"❌ Failed to get parameters: {params_response.status_code}")
            return
            
        data = params_response.json()
        params_list = data.get("list", [])
        models = data.get("models", {})
        
        print(f"\n📊 Found {len(params_list)} total parameters")
        print(f"📊 Available models: {list(models.keys())}")
        
        # Extract key parameters for image generation
        key_params = {}
        important_params = [
            "sampler", "scheduler", "model", "cfgscale", "steps", "seed",
            "width", "height", "batch_size", "batch_count", "prompt", "negativeprompt"
        ]
        
        print(f"\n🔍 Looking for key parameters: {important_params}")
        
        for param in params_list:
            param_id = param.get("id", "").lower()
            param_name = param.get("name", "")
            
            for important in important_params:
                if important.lower() in param_id or important.lower() in param_name.lower():
                    key_params[important] = {
                        "id": param.get("id"),
                        "name": param.get("name"),
                        "type": param.get("type"),
                        "default": param.get("default"),
                        "values": param.get("values"),
                        "min": param.get("min"),
                        "max": param.get("max")
                    }
                    print(f"✅ Found {important}: {param.get('name')} (id: {param.get('id')})")
                    break
        
        print(f"\n🎯 Key parameters found: {len(key_params)}")
        
        # Show ALL sampler and scheduler options
        print(f"\n🎨 ALL Sampler parameters found:")
        sampler_params = [p for p in params_list if "sampler" in p.get("id", "").lower() or "sampler" in p.get("name", "").lower()]
        for param in sampler_params:
            print(f"   📊 {param.get('name')} (id: {param.get('id')})")
            if param.get("values"):
                print(f"      Options: {param['values']}")
            else:
                print(f"      Default: {param.get('default', 'Unknown')}")
        
        print(f"\n⏰ ALL Scheduler parameters found:")
        scheduler_params = [p for p in params_list if "scheduler" in p.get("id", "").lower() or "scheduler" in p.get("name", "").lower()]
        for param in scheduler_params:
            print(f"   📊 {param.get('name')} (id: {param.get('id')})")
            if param.get("values"):
                print(f"      Options: {param['values']}")
            else:
                print(f"      Default: {param.get('default', 'Unknown')}")
        
        # Show available models
        print(f"\n🤖 Available models:")
        for model_type, model_list in models.items():
            print(f"   {model_type}:")
            for model in model_list[:5]:  # Show first 5 models
                print(f"     - {model}")
            if len(model_list) > 5:
                print(f"     ... and {len(model_list) - 5} more")
        
        return key_params, models
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None, None

if __name__ == "__main__":
    print("🔍 SwarmUI Parameter Explorer")
    print("Getting key parameters for image generation...\n")
    
    params, models = get_swarmui_params()
    
    if params:
        print(f"\n✅ Successfully extracted {len(params)} key parameters!")
        print("💡 Use these parameter IDs in your API calls")
    else:
        print("\n❌ Failed to extract parameters")
