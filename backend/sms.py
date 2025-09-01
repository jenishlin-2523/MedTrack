# sms.py
from twilio.rest import Client
import os

# Load from environment variables for safety
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "your_account_sid")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "your_auth_token")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "+1234567890")  # your Twilio number

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

def send_sms(to_number: str, username: str, password: str) -> bool:
    """
    Send SMS to customer with their credentials.
    
    Args:
        to_number (str): Customer mobile number
        username (str): Generated username
        password (str): Generated password
    
    Returns:
        bool: True if SMS sent successfully, False otherwise
    """
    try:
        message = client.messages.create(
            body=f"Your account is created.\nUsername: {username}\nPassword: {password}",
            from_=TWILIO_PHONE_NUMBER,
            to=to_number
        )
        print(f"SMS sent successfully, SID: {message.sid}")
        return True
    except Exception as e:
        print(f"Failed to send SMS: {e}")
        return False
