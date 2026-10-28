import re
import json
import unicodedata
from pathlib import Path
from typing import List

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_SHORTHAND_FILE = _DATA_DIR / "shorthand.json"

try:
    with open(_SHORTHAND_FILE, "r", encoding="utf-8") as f:
        SHORTHAND_DICT = json.load(f)
except Exception:
    SHORTHAND_DICT = {}

def normalize_text(text: str) -> str:
    """Normalise unicode characters and trim extraneous whitespace."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    # Replace weird quotes and dashes
    text = text.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    text = text.replace("–", "-").replace("—", "-")
    return text.strip()

def compress_repeated_chars(text: str) -> str:
    """Compress 3+ repeated characters down to 2 (e.g. 'soooo' -> 'soo', 'guddd' -> 'gud')."""
    return re.sub(r"(.)\1{2,}", r"\1\1", text)

def expand_shorthand(text: str) -> str:
    """Expand SMS/Hinglish shortcuts using word boundary matching."""
    tokens = re.split(r"(\s+|[.,;!?/])", text)
    expanded_tokens = []
    for token in tokens:
        lower = token.lower()
        if lower in SHORTHAND_DICT:
            # Preserve capitalization if the original was capitalized
            replacement = SHORTHAND_DICT[lower]
            if token.isupper() and len(token) > 1:
                expanded_tokens.append(replacement.upper())
            elif token.istitle():
                expanded_tokens.append(replacement.title())
            else:
                expanded_tokens.append(replacement)
        else:
            expanded_tokens.append(token)
    return "".join(expanded_tokens)

def clean_input(text: str) -> str:
    """Run full cleaning pipeline on seller rough input."""
    text = normalize_text(text)
    text = compress_repeated_chars(text)
    text = expand_shorthand(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def segment_sentences(text: str) -> List[str]:
    """Split into clean sentences using punctuation and capitalization cues."""
    sentences = re.split(r"(?<=[.!?])\s+|[\n\r]+", text)
    cleaned = [s.strip() for s in sentences if s.strip()]
    return cleaned if cleaned else [text]
