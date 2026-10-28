import csv
from pathlib import Path
from typing import Optional, Dict, Any, List

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_SEED_FILE = _DATA_DIR / "seed_listings.csv"

# Pre-calculated category median prices from campus data
CATEGORY_MEDIANS = {
    "Vehicles": 3800,
    "Electronics": 1200,
    "Books": 500,
    "Furniture": 1100,
    "Hostel & Kitchen": 450,
    "Clothing": 600,
    "Lab & Stationery": 350,
    "Sports": 550,
    "Other": 900
}

def get_price_hint(category: str, input_price: Optional[float] = None) -> Optional[Dict[str, Any]]:
    """Return low/high price benchmark based on category and optional seller starting price."""
    median = CATEGORY_MEDIANS.get(category, 500)
    
    if input_price and input_price > 0:
        base = float(input_price)
        low = int(round(base * 0.85, -1))
        high = int(round(base * 1.15, -1))
        basis = "based on your asking price and campus trends"
    else:
        low = int(round(median * 0.75, -1))
        high = int(round(median * 1.25, -1))
        basis = "similar campus listings"

    return {
        "low": low,
        "high": high,
        "basis": basis
    }
