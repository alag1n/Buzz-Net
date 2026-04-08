import urllib.request
import base64

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, Content-Type',
}

def handler(event, context):
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}
    
    params = event.get('queryStringParameters', {})
    path = params.get('path', '')
    size = params.get('size', 'w500')
    
    if not path:
        return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': 'Missing path'}
    
    # If it's already a full URL, use it directly
    if path.startswith('http'):
        url = path
    else:
        url = f'https://media.themoviedb.org/t/p/{size}/{path.lstrip("/")}'
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=30) as response:
            data = response.read()
            content_type = response.headers.get('Content-Type', 'image/jpeg')
        
        return {
            'statusCode': 200,
            'headers': {**CORS_HEADERS, 'Content-Type': content_type, 'Cache-Control': 'public, max-age=86400'},
            'body': base64.b64encode(data).decode('utf-8'),
            'isBase64Encoded': True
        }
    except Exception as e:
        # Return placeholder
        placeholder_url = 'https://via.placeholder.com/500x750/1a1a2e/667eea?text=No+Image'
        req = urllib.request.Request(placeholder_url)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read()
        
        return {
            'statusCode': 200,
            'headers': {**CORS_HEADERS, 'Content-Type': 'image/jpeg'},
            'body': base64.b64encode(data).decode('utf-8'),
            'isBase64Encoded': True
        }
