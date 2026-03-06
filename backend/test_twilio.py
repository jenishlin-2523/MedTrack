import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='.env')

account_sid = os.getenv('TWILIO_ACCOUNT_SID')
auth_token = os.getenv('TWILIO_AUTH_TOKEN')
twilio_number = os.getenv('TWILIO_PHONE_NUMBER')

print(f'SID: {account_sid}')
print(f'Token: {auth_token}')
print(f'From: {twilio_number}')

if not all([account_sid, auth_token, twilio_number]):
    print('Missing credentials')
    exit(1)

client = Client(account_sid, auth_token)

try:
    message = client.messages.create(
        body='Test message from MediTrack Pharmacy',
        from_=twilio_number,
        to='+919629199042'
    )
    print(f'Success: {message.sid}')
except Exception as e:
    print(f'Twilio Error: {e}')
