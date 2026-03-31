from pyngrok import ngrok, conf
import sys

try:
    # Create tunnel to local server
    tunnel = ngrok.connect(8080, "http")
    public_url = tunnel.public_url
    
    print("=" * 50)
    print("  NeuroX is LIVE!")
    print("=" * 50)
    print()
    print("  Public URL: " + public_url)
    print()
    print("  Open this link on your phone!")
    print("  Works on any device with a browser.")
    print()
    print("=" * 50)
    print("  Press Ctrl+C to stop")
    print("=" * 50)
    
    # Keep running
    ngrok.get_tunnels()
    input("Press Enter to stop the tunnel...")
    
except Exception as e:
    print("Error: " + str(e))
    print()
    print("If ngrok needs an auth token, get one free at:")
    print("https://dashboard.ngrok.com/get-started/your-authtoken")
    print()
    print("Then run: python -c \"from pyngrok import ngrok; ngrok.set_auth_token('YOUR_TOKEN')\"")
    sys.exit(1)
finally:
    ngrok.kill()
