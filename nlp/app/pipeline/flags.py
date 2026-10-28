import re
from typing import List

PHONE_REGEX = re.compile(r"(?:\+91[\-\s]?)?[6-9]\d{9}\b|\b\d{5}[\s\-]\d{5}\b")
UPI_REGEX = re.compile(r"\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b")
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
URL_REGEX = re.compile(r"https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+|www\.[-\w.]+")

PROFANITY_LIST = [
    "scam", "cheat", "fraud", "stolen", "fake", "pirated", "weed", "alcohol", "drugs"
]

def detect_flags(text: str) -> List[str]:
    """Detect safety and policy flags without hard blocking the listing."""
    flags = []
    
    if PHONE_REGEX.search(text):
        flags.append("contains_phone")
    if UPI_REGEX.search(text):
        flags.append("contains_upi")
    if EMAIL_REGEX.search(text):
        flags.append("contains_email")
    if URL_REGEX.search(text):
        flags.append("contains_link")
        
    lower = text.lower()
    for word in PROFANITY_LIST:
        if re.search(r"\b" + re.escape(word) + r"\b", lower):
            flags.append(f"sensitive_word_{word}")
            
    return flags

def find_missing_details(text: str) -> List[str]:
    """Check what useful seller details are absent to prompt as chips."""
    missing = []
    lower = text.lower()
    
    # Reason for selling
    if not any(k in lower for k in ["reason", "selling because", "upgraded", "graduating", "no longer need", "moving", "leaving hostel"]):
        missing.append("Reason for selling")
        
    # Pickup location / hostel
    if not any(k in lower for k in ["hostel", "block", "hall", "pickup", "campus", "gate", "canteen", "library"]):
        missing.append("Pickup location")
        
    # Bill / Warranty
    if not any(k in lower for k in ["bill", "invoice", "warranty", "receipt"]):
        missing.append("Bill / Warranty availability")
        
    # Age / Usage period
    if not any(k in lower for k in ["year", "years", "month", "months", "used for", "bought in", "sem", "old"]):
        missing.append("Usage period")
        
    return missing
