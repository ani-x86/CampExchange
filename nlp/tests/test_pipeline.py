import json
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.pipeline.clean import clean_input, expand_shorthand
from app.pipeline.extract import extract_slots
from app.pipeline.classify import classify_category, classify_condition
from app.pipeline.flags import detect_flags, find_missing_details

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["ok"] is True

def test_clean_and_shorthand():
    raw = "sell my hero cycle 2 yrs old gud cond pls msg w/ details"
    cleaned = clean_input(raw)
    assert "years" in cleaned
    assert "good" in cleaned
    assert "condition" in cleaned
    assert "please" in cleaned
    assert "with" in cleaned

def test_flags_detection():
    text_with_phone = "call me at 9876543210 or upi me at student@oksbi"
    flags = detect_flags(text_with_phone)
    assert "contains_phone" in flags
    assert "contains_upi" in flags

def test_missing_details():
    short_text = "selling cycle"
    missing = find_missing_details(short_text)
    assert "Reason for selling" in missing
    assert "Pickup location" in missing

def test_describe_endpoint():
    payload = {
        "text": "hero cycle 2 yrs old gears work fine small scratch on frame",
        "title": "",
        "category": None,
        "price": 3500,
        "tone": "friendly"
    }
    res = client.post("/describe", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "Vehicles"
    assert data["condition"] == "GOOD"
    assert "Hero" in data["title"]
    assert len(data["bullets"]) > 0
    assert "cycle" in data["tags"] or "hero" in data["tags"]
    assert data["price_hint"] is not None
    assert data["price_hint"]["low"] <= 3500 <= data["price_hint"]["high"]

def test_suggest_endpoint():
    res = client.post("/suggest", json={"title": "Introduction to Algorithms CLRS"})
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "Books"
    assert data["confidence"] > 0

def test_golden_dataset():
    golden_file = Path(__file__).parent / "golden.json"
    with open(golden_file, "r", encoding="utf-8") as f:
        samples = json.load(f)

    correct_cat = 0
    correct_cond = 0

    for sample in samples:
        text = sample["text"]
        cleaned = clean_input(text)
        cat, _ = classify_category(cleaned)
        cond = classify_condition(cleaned)
        slots = extract_slots(cleaned)

        if cat == sample["expected_category"]:
            correct_cat += 1
        if cond == sample["expected_condition"]:
            correct_cond += 1

        if "expected_brand" in sample:
            assert slots["brand"] == sample["expected_brand"], f"Brand mismatch for {text}: got {slots['brand']}"

    cat_accuracy = correct_cat / len(samples)
    cond_accuracy = correct_cond / len(samples)

    assert cat_accuracy >= 0.85, f"Category accuracy {cat_accuracy} below 0.85"
    assert cond_accuracy >= 0.85, f"Condition accuracy {cond_accuracy} below 0.85"
