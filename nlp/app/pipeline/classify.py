import re
import math
from collections import Counter
from typing import Tuple, List, Dict

CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "Vehicles": [
        "cycle", "bicycle", "bike", "gear", "gears", "hero", "btwin", "firefox",
        "montra", "avon", "hercules", "decathlon", "tyre", "tyres", "brakes",
        "pedal", "scooter", "commute", "helmet", "lock"
    ],
    "Electronics": [
        "mouse", "keyboard", "headphones", "earphones", "laptop", "monitor", "charger",
        "powerbank", "power bank", "bluetooth", "macbook", "ipad", "tablet", "screen",
        "cable", "calculator", "casio", "ssd", "usb", "ram", "speaker", "hard disk"
    ],
    "Books": [
        "book", "textbook", "edition", "author", "cormen", "clrs", "galvin",
        "tanenbaum", "korth", "boylestad", "verma", "halliday", "resnick",
        "syllabus", "semester", "pages", "paperback", "hardcover", "gate", "notes"
    ],
    "Furniture": [
        "table", "chair", "study table", "mesh chair", "desk", "bed", "shelf",
        "rack", "bean bag", "mattress", "nilkamal", "ikea", "wakefit", "drawer",
        "almirah", "stool"
    ],
    "Hostel & Kitchen": [
        "kettle", "electric kettle", "induction", "cooktop", "heater", "immersion",
        "bottle", "fan", "iron", "bucket", "mug", "pan", "cooker", "pigeon",
        "prestige", "bajaj", "havells", "milton", "thermo", "hostel"
    ],
    "Clothing": [
        "blazer", "coat", "lab coat", "apron", "jacket", "fleece", "hoodie",
        "trousers", "shirt", "shoes", "boots", "size", "cotton", "formal"
    ],
    "Lab & Stationery": [
        "drafter", "mini drafter", "drawing board", "instrument box", "divider",
        "compass", "curves", "pro circle", "notebooks", "journal", "scientific calculator",
        "roller scale", "sheets", "lab"
    ],
    "Sports": [
        "badminton", "racket", "racquet", "shuttle", "football", "cricket", "bat",
        "ball", "gym bag", "yoga mat", "table tennis", "tennis", "yonex", "cosco",
        "nivia", "kipsta", "jersey", "dumbbell"
    ],
    "Other": [
        "guitar", "musical", "instrument", "umbrella", "trolley", "luggage",
        "backpack", "extension board", "board", "curtain", "lamp"
    ]
}

def tokenize(text: str) -> List[str]:
    """Simple lowercase alphanumeric tokenization."""
    return re.findall(r"\b[a-zA-Z0-9_-]+\b", text.lower())

def classify_category(text: str, current_category: str = None) -> Tuple[str, float]:
    """Classify item into one of the 9 marketplace categories with confidence score."""
    if current_category and current_category in CATEGORY_KEYWORDS:
        return current_category, 1.0

    tokens = tokenize(text)
    token_counts = Counter(tokens)

    scores: Dict[str, float] = {cat: 0.0 for cat in CATEGORY_KEYWORDS}

    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if " " in kw:
                # Phrase match
                if kw in text.lower():
                    scores[cat] += 3.0
            else:
                if kw in token_counts:
                    scores[cat] += token_counts[kw] * 1.5

    best_cat = "Other"
    best_score = 0.0
    total_score = sum(scores.values())

    for cat, score in scores.items():
        if score > best_score:
            best_score = score
            best_cat = cat

    confidence = (best_score / total_score) if total_score > 0 else 0.35
    if best_score == 0:
        return "Other", 0.35

    return best_cat, round(confidence, 2)

def classify_condition(text: str) -> str:
    """Classify condition into NEW, LIKE_NEW, GOOD, FAIR based on keywords."""
    lower = text.lower()

    # NEW check
    if any(k in lower for k in ["brand new", "sealed", "unopened", "never used", "tags intact", "unused"]):
        return "NEW"

    # LIKE_NEW check
    if any(k in lower for k in ["like new", "barely used", "pristine", "mint condition", "almost new", "flawless"]):
        return "LIKE_NEW"

    # FAIR check
    fair_triggers = [
        "crack", "broken", "damage", "damaged", "deep scratch",
        "rusted", "torn", "defect", "flaw", "not working", "worn out"
    ]
    if any(k in lower for k in fair_triggers):
        return "FAIR"

    # Default to GOOD
    return "GOOD"
