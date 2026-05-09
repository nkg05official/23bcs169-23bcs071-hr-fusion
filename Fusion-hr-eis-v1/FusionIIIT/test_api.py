import os
import sys

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Fusion.settings.development')
import django
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

try:
    user = User.objects.get(username='fusion_admin')
    token, _ = Token.objects.get_or_create(user=user)
    
    client = Client()
    response = client.get(
        '/hr2/api/v1/legacy/search_employees?search_text=fac',
        HTTP_AUTHORIZATION=f'Token {token.key}'
    )
    print("STATUS:", response.status_code)
    print("RESPONSE:", response.json() if response.status_code == 200 else response.content)
except Exception as e:
    print("ERROR:", str(e))
