import re
from typing import Dict, Any, List, Tuple

def generate_title(slots: Dict[str, Any], category: str) -> str:
    """Generate clean title from brand, key item words, and age."""
    brand = slots.get("brand")
    age = slots.get("age")
    raw = slots.get("raw", "")

    # Look for primary noun
    words = [w for w in re.findall(r"\b[A-Za-z0-9+-]+\b", raw) if w.lower() not in ["sell", "my", "selling", "for", "sale", "a", "an", "the", "in", "with", "is", "and"]]
    
    # Try to construct meaningful title
    title_parts = []
    if brand:
        title_parts.append(brand)
        # Find item noun after brand if possible
        nouns = [w for w in words if w.lower() != brand.lower()][:2]
        if nouns:
            title_parts.append(" ".join(w.capitalize() for w in nouns))
    elif words:
        title_parts.append(" ".join(w.capitalize() for w in words[:3]))
    else:
        title_parts.append(category)

    base_title = " ".join(title_parts).strip()
    
    if age and len(base_title) < 40:
        base_title = f"{base_title} – {age.title()}"

    return base_title[:60]

def generate_bullets(slots: Dict[str, Any], condition: str) -> List[str]:
    """Generate concise fact bullets strictly based on extracted slots."""
    bullets = []
    
    if slots.get("brand"):
        bullets.append(f"Brand: {slots['brand']}")
        
    if slots.get("age"):
        bullets.append(f"Age / Usage: {slots['age']}")
        
    if slots.get("working"):
        bullets.append(f"Functionality: {', '.join(slots['working'])}")
        
    if slots.get("defects"):
        bullets.append(f"Known Flaws: {', '.join(slots['defects'])}")
    else:
        bullets.append("Flaws: None mentioned")
        
    if slots.get("accessories"):
        bullets.append(f"Included: {', '.join(slots['accessories'])}")
        
    if slots.get("book_info", {}).get("edition"):
        bullets.append(f"Edition: {slots['book_info']['edition']}")
        
    bullets.append(f"Condition: {condition.replace('_', ' ').title()}")
    return bullets

def generate_tags(slots: Dict[str, Any], category: str) -> List[str]:
    """Generate relevant search tags."""
    tags = set()
    tags.add(category.lower().replace(" & ", "-"))
    
    if slots.get("brand"):
        tags.add(slots["brand"].lower())
        
    for w in re.findall(r"\b[a-z]{3,15}\b", slots.get("raw", "").lower()):
        if w not in ["sell", "selling", "with", "good", "fine", "work", "works", "hostel", "room"]:
            if len(tags) < 6:
                tags.add(w)
                
    tags.add("hostel")
    return sorted(list(tags))

def compose_description(
    slots: Dict[str, Any],
    category: str,
    condition: str,
    tone: str = "friendly"
) -> Tuple[str, str, List[str], List[str]]:
    """Compose full fact-preserving description, title, bullets, and tags."""
    title = generate_title(slots, category)
    bullets = generate_bullets(slots, condition)
    tags = generate_tags(slots, category)
    
    item_name = slots.get("brand", "")
    if not item_name:
        words = slots.get("raw", "").split()[:2]
        item_name = " ".join(words) if words else category

    age_str = f", about {slots['age']}" if slots.get("age") else ""
    working_str = f" Working condition: {', '.join(slots['working'])}." if slots.get("working") else ""
    defects_str = f" Please note: {', '.join(slots['defects'])}." if slots.get("defects") else " No major flaws noted."
    acc_str = f" Comes with: {', '.join(slots['accessories'])}." if slots.get("accessories") else ""

    if tone == "concise":
        desc = f"{item_name}{age_str}. Condition: {condition.replace('_', ' ').title()}.{working_str}{defects_str}{acc_str} Ready for campus pickup."
    elif tone == "neutral":
        desc = f"Up for sale is {item_name}{age_str}. The item is in {condition.replace('_', ' ').lower()} condition.{working_str}{defects_str}{acc_str} Available for pickup on campus."
    else:  # friendly
        desc = f"Selling my {item_name}{age_str}. Overall condition is {condition.replace('_', ' ').lower()}.{working_str}{defects_str}{acc_str} Feel free to chat and arrange a campus meetup!"

    # Clean up double spaces or awkward punctuation
    desc = re.sub(r"\s+", " ", desc)
    desc = re.sub(r"\.\s*\.", ".", desc).strip()

    return title, desc, bullets, tags
