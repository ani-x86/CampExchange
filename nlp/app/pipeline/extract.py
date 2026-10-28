import re
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_BRANDS_FILE = _DATA_DIR / "brands.json"

try:
    with open(_BRANDS_FILE, "r", encoding="utf-8") as f:
        BRANDS_MAP = json.load(f)
except Exception:
    BRANDS_MAP = {}

ALL_BRANDS = set()
for b_list in BRANDS_MAP.values():
    ALL_BRANDS.update(b.lower() for b in b_list)

DEFECT_KEYWORDS = [
    "scratch", "scratches", "scratched",
    "dent", "dents", "dented",
    "crack", "cracks", "cracked",
    "stain", "stains", "stained",
    "torn", "tear", "tears",
    "blemish", "blemishes",
    "wear", "faded", "rusted",
    "broken", "damage", "damaged",
    "chipped", "minor flaw"
]

WORKING_KEYWORDS = [
    "works fine", "works perfectly", "working fine", "working good",
    "working", "smooth", "good condition", "mint condition",
    "fully functional", "no issues", "good backup"
]

ACCESSORY_KEYWORDS = [
    "charger", "adapter", "bill", "box", "warranty", "cover", "case",
    "stand", "lock", "bell", "cables", "cable", "keys", "receiver",
    "capo", "picks", "bag", "strap"
]

def extract_brand(text: str) -> Optional[str]:
    """Find recognized campus brand in text."""
    lower_text = text.lower()
    for brand in sorted(ALL_BRANDS, key=len, reverse=True):
        pattern = r"\b" + re.escape(brand) + r"\b"
        if re.search(pattern, lower_text):
            # return properly capitalized brand name
            return brand.title()
    return None

def extract_age(text: str) -> Optional[str]:
    """Extract age statements like '2 years old', '6 months used', '1 sem old'."""
    pattern = r"\b(\d+(?:\.\d+)?)\s*(?:years?|yrs?|months?|mnths?|semesters?|sems?)\s*(?:old|used)?\b"
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        return match.group(0).strip()
    if re.search(r"\bbarely used\b|\bbrand new\b|\bunused\b", text, re.IGNORECASE):
        return "almost unused"
    return None

def extract_defects(text: str) -> List[str]:
    """Extract flaw phrases."""
    defects = []
    # Match phrases like "small scratch on frame", "minor dent", etc.
    patterns = [
        r"\b(?:small|minor|slight|tiny|deep)?\s*(?:scratch(?:es)?|dent(?:s)?|crack(?:s)?|stain(?:s)?|tear(?:s)?)\b(?:\s+(?:on|in|near)\s+[\w\s]{2,20})?",
        r"\bslightly\s+rusted\b(?:\s+[\w]+)?",
        r"\bhighlighted\s+a\s+few\s+pages\b"
    ]
    for pat in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            phrase = m.group(0).strip()
            if phrase and phrase not in defects:
                defects.append(phrase)
    return defects

def extract_working_state(text: str) -> List[str]:
    """Extract working condition claims."""
    working = []
    patterns = [
        r"\b(?:gears|brakes|keys|battery|screen|display|sound|switches)\s+(?:work|works|working)\s+(?:fine|perfectly|well|smoothly)\b",
        r"\bworks?\s+(?:fine|perfectly|great)\b",
        r"\bfully functional\b",
        r"\ball\s+keys\s+working\b"
    ]
    for pat in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            phrase = m.group(0).strip()
            if phrase and phrase not in working:
                working.append(phrase)
    return working

def extract_accessories(text: str) -> List[str]:
    """Extract included accessories and peripherals."""
    accessories = []
    for acc in ACCESSORY_KEYWORDS:
        pat = r"\b(?:\w+\s+)?(?:" + re.escape(acc) + r")(?:\s+included)?\b"
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            clean_acc = m.group(0).strip()
            if clean_acc not in accessories:
                accessories.append(clean_acc)
    return accessories

def extract_book_info(text: str) -> Dict[str, Any]:
    """Extract edition, author, subject for books."""
    info = {}
    edition_match = re.search(r"\b(\d+)(?:st|nd|rd|th)?\s+edition\b", text, re.IGNORECASE)
    if edition_match:
        info["edition"] = f"{edition_match.group(1)}th edition"
    return info

def extract_slots(text: str) -> Dict[str, Any]:
    """Run full slot extraction from cleaned text."""
    brand = extract_brand(text)
    age = extract_age(text)
    defects = extract_defects(text)
    working = extract_working_state(text)
    accessories = extract_accessories(text)
    book_info = extract_book_info(text)

    # Candidate item name
    words = text.split()
    first_few = " ".join(words[:4]) if len(words) >= 4 else text

    return {
        "raw": text,
        "brand": brand,
        "age": age,
        "defects": defects,
        "working": working,
        "accessories": accessories,
        "book_info": book_info,
        "first_few": first_few
    }
