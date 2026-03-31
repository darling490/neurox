import urllib.request, json, os

zippath = r'c:\Users\Hemanth Kumar\.antigravity\offline-ai\deploy.zip'

with open(zippath, 'rb') as f:
    data = f.read()

req = urllib.request.Request(
    'https://api.netlify.com/api/v1/sites',
    data=data,
    headers={'Content-Type': 'application/zip'},
    method='POST'
)

try:
    resp = urllib.request.urlopen(req, timeout=60)
    result = json.loads(resp.read().decode())
    subdomain = result.get('subdomain', 'unknown')
    site_url = result.get('ssl_url', result.get('url', ''))
    print('SUCCESS!')
    print('URL: ' + site_url)
    print('Subdomain: ' + subdomain)
    print('Full URL: https://' + subdomain + '.netlify.app')
except Exception as e:
    print('Error: ' + str(e))
    if hasattr(e, 'read'):
        print(e.read().decode())
