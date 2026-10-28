import os
import re
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Tuple, Optional

# Regular expressions to strip PII before sending to model
PHONE_REGEX = re.compile(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b')
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
UPI_REGEX = re.compile(r'\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b')

def strip_pii(text: str) -> str:
    """Strip phone numbers, emails, and UPI IDs before sending to model."""
    cleaned = PHONE_REGEX.sub('[REDACTED_PHONE]', text)
    cleaned = EMAIL_REGEX.sub('[REDACTED_EMAIL]', cleaned)
    cleaned = UPI_REGEX.sub('[REDACTED_UPI]', cleaned)
    return cleaned

def enhance_with_gemini(
    raw_text: str,
    rule_desc: str,
    slots: Dict[str, Any],
    category: str,
    condition: str
) -> Tuple[str, str]:
    """
    Attempts to enhance the description using Gemini 1.5.
    
    Returns:
        (description, source) where source is 'gemini' or 'rules'.
    """
    # 1. Check if GEMINI_API_KEY is available
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Check server/.env if not in process env
        try:
            parent_env = os.path.join(os.path.dirname(__file__), "..", "..", "..", "server", ".env")
            if os.path.exists(parent_env):
                with open(parent_env, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("GEMINI_API_KEY="):
                            api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                            break
        except Exception:
            pass

    if not api_key:
        return rule_desc, "rules"

    # 2. Extract facts that must be preserved
    facts_to_check = []
    for key, val in slots.items():
        if val and isinstance(val, str) and len(val.strip()) > 2:
            facts_to_check.append(val.strip().lower())

    # 3. Strip PII from input
    sanitized_input = strip_pii(raw_text)

    # 4. Strict prompt enforcing no external facts and preserving extracted facts
    prompt = f"""You are an assistant enhancing student campus marketplace descriptions.
Rewrite this listing description cleanly and naturally.
CRITICAL CONSTRAINT: Do not add any fact not present in the input. Stick only to the details provided.
Category: {category}
Condition: {condition}
Input details: {sanitized_input}

Respond with only the rewritten listing description text. No markdown header, no conversational filler."""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = json.dumps({
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 300
        }
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        # Enforce strict 3.0s timeout
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            if not candidates:
                return rule_desc, "rules"

            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                return rule_desc, "rules"

            enhanced_text = parts[0].get("text", "").strip()
            if not enhanced_text or len(enhanced_text) < 10:
                return rule_desc, "rules"

            # 5. Response check: verify every extracted fact still appears in the output
            lower_enhanced = enhanced_text.lower()
            for fact in facts_to_check:
                if fact not in lower_enhanced and fact not in sanitized_input.lower():
                    # Fact missing - fail gracefully to rule-based result
                    return rule_desc, "rules"

            return enhanced_text, "gemini"

    except Exception:
        # Fall back to rule-based description on any network error, timeout, or parsing failure
        return rule_desc, "rules"
