import urllib.request
import json
import os

TMDB_API_KEY = '62b1158de0dc11c6aac6963181a0e3d3'
TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2MmIxMTU4ZGUwZGMxMWM2YWFjNjk2MzE4MWEwZTNkMyIsIm5iZiI6MTc3NTU5NzU5MC41MjEsInN1YiI6IjY5ZDU3ODE2ZTQ2MGEwNzk3ZTZhZTVjMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.ehTg5jP-BvO11ldob0mGB7IPEr-3kGZMOCc5zncAXCE'

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept, Authorization',
}

def handler(event, context):
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}
    
    params = event.get('queryStringParameters', {})
    path = params.get('path', '')
    
    if not path:
        return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': 'Missing path'}
    
    # Build TMDB URL
    url = f'https://api.themoviedb.org/3{path}'
    if '?' not in path:
        url += '?api_key=' + TMDB_API_KEY
    else:
        url += '&api_key=' + TMDB_API_KEY
    
    # Add language
    url += '&language=ru-RU'
    
    try:
        req = urllib.request.Request(url)
        req.add_header('Authorization', f'Bearer {TMDB_TOKEN}')
        
        with urllib.request.urlopen(req, timeout=30) as response:
            data = response.read().decode('utf-8')
        
        return {
            'statusCode': 200,
            'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
            'body': data
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }
