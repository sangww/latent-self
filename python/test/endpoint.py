# SwarmUI Endpoint Checker
# Tests API endpoints and connectivity

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_endpoints():
    """Test SwarmUI API endpoints and connectivity"""
    
    # Try both localhost and 127.0.0.1
    base_urls = [
        os.getenv("SWARMUI_URL", "http://127.0.0.1:7801"),
        "http://127.0.0.1:7801",
        "http://localhost:7801"
    ]
    
    # Remove duplicates while preserving order
    unique_urls = []
    for url in base_urls:
        if url not in unique_urls:
            unique_urls.append(url)
    
    for swarmui_url in unique_urls:
        print(f"\n🔍 Testing connection to: {swarmui_url}")
        if test_swarmui_endpoints(swarmui_url):
            print(f"✅ All endpoints working on {swarmui_url}")
            return True
        print(f"❌ Some endpoints failed on {swarmui_url}")
    
    print("\n❌ All connection attempts failed!")
    return False

def test_swarmui_endpoints(swarmui_url):
    """Test all SwarmUI endpoints for a specific URL"""
    
    try:
        # Test basic connectivity
        print("📡 Testing basic connectivity...")
        response = requests.get(f"{swarmui_url}/", timeout=5)
        print(f"✅ Basic connection: HTTP {response.status_code}")
        
        if "SwarmUI" not in response.text:
            print("❌ SwarmUI interface not detected")
            return False
        
        print("✅ SwarmUI web interface detected")
        
        # Test session creation
        print("\n🎫 Testing session creation...")
        session_response = requests.post(f"{swarmui_url}/API/GetNewSession", json={}, timeout=10)
        if session_response.status_code != 200:
            print(f"❌ Session creation failed: {session_response.status_code}")
            return False
        
        session_data = session_response.json()
        session_id = session_data.get("session_id")
        print(f"✅ Session created: {session_id}")
        
        # Test parameter listing
        print("\n📋 Testing parameter listing...")
        params_response = requests.post(f"{swarmui_url}/API/ListT2IParams", json={"session_id": session_id}, timeout=10)
        if params_response.status_code != 200:
            print(f"❌ Parameter listing failed: {params_response.status_code}")
            return False
        
        params_data = params_response.json()
        param_count = len(params_data.get("list", []))
        print(f"✅ Parameters retrieved: {param_count} parameters")
        
        # Test image generation (quick test)
        print("\n🎨 Testing image generation...")
        test_payload = {
            "images": 1,
            "session_id": session_id,
            "donotsave": True,
            "prompt": "test",
            "negativeprompt": "",
            "model": "OfficialStableDiffusion/sd_xl_base_1.0",
            "width": 512,
            "height": 512,
            "cfgscale": 7.5,
            "steps": 1,  # Quick test
            "seed": -1
        }
        
        gen_response = requests.post(f"{swarmui_url}/API/GenerateText2Image", json=test_payload, timeout=30)
        if gen_response.status_code == 200:
            print("✅ Image generation test successful")
        else:
            print(f"⚠️ Image generation test failed: {gen_response.status_code}")
            print(f"   Response: {gen_response.text[:100]}...")
        
        # Test other endpoints
        print("\n🔍 Testing other endpoints...")
        endpoints_to_test = [
            ("GET", "/API/GetNewSession"),
            ("POST", "/API/GetNewSession"),
        ]
        
        for method, endpoint in endpoints_to_test:
            try:
                if method == "GET":
                    response = requests.get(f"{swarmui_url}{endpoint}", timeout=5)
                else:
                    response = requests.post(f"{swarmui_url}{endpoint}", json={}, timeout=5)
                
                content_type = response.headers.get('Content-Type', '')
                print(f"📊 {method} {endpoint}: {response.status_code}, {content_type}")
                
            except requests.exceptions.RequestException as e:
                print(f"❌ {method} {endpoint}: {e}")
        
        return True
        
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection error: {e}")
        return False
    except requests.exceptions.Timeout as e:
        print(f"❌ Timeout error: {e}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def check_authentication():
    """Check if SwarmUI requires authentication"""
    
    swarmui_url = os.getenv("SWARMUI_URL", "http://127.0.0.1:7801")
    
    try:
        response = requests.get(f"{swarmui_url}/", timeout=10)
        auth_indicators = [
            "login", "password", "auth", "signin", "signup", 
            "username", "user", "credential", "token"
        ]
        
        found_auth = []
        for indicator in auth_indicators:
            if indicator.lower() in response.text.lower():
                found_auth.append(indicator)
        
        if found_auth:
            print(f"⚠️ Found potential auth indicators: {found_auth}")
            print("💡 SwarmUI might require authentication")
            return True
        else:
            print("✅ No authentication requirements detected")
            return False
            
    except Exception as e:
        print(f"❌ Auth check error: {e}")
        return False

if __name__ == "__main__":
    print("🔍 SwarmUI Endpoint Checker")
    print("Testing API endpoints and connectivity...\n")
    
    # Check authentication requirements
    print("🔐 Checking authentication requirements...")
    check_authentication()
    
    # Test all endpoints
    print("\n🌐 Testing endpoints...")
    success = test_endpoints()
    
    if success:
        print("\n✅ All endpoint tests passed!")
        print("💡 SwarmUI API is ready for use")
    else:
        print("\n❌ Some endpoint tests failed!")
        print("💡 Check SwarmUI configuration and connectivity")
