import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.pipeline.gemini import strip_pii, enhance_with_gemini

client = TestClient(app)

def test_strip_pii():
    text = "Call me at 9876543210 or email me at user@college.edu.in or upi me at pay@okaxis"
    cleaned = strip_pii(text)
    assert "9876543210" not in cleaned
    assert "user@college.edu.in" not in cleaned
    assert "pay@okaxis" not in cleaned
    assert "[REDACTED_PHONE]" in cleaned
    assert "[REDACTED_EMAIL]" in cleaned
    assert "[REDACTED_UPI]" in cleaned

def test_gemini_fallback_when_key_missing(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    slots = {"brand": "Casio", "model": "fx-991EX"}
    desc, source = enhance_with_gemini(
        raw_text="Casio fx-991EX scientific calculator for sale",
        rule_desc="Casio fx-991EX calculator in good condition.",
        slots=slots,
        category="Electronics",
        condition="GOOD"
    )
    assert source == "rules"
    assert "Casio fx-991EX" in desc

def test_describe_endpoint_returns_source_field():
    resp = client.post("/describe", json={
        "text": "Selling blue Hero cycle 21 gear in great condition, bought 6 months ago",
        "category": "Cycles",
        "price": 3500
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "source" in data
    assert data["source"] in ["gemini", "rules"]
    assert data["description"]
    assert data["category"] == "Vehicles"

def test_ocr_hint_endpoint_graceful_handling():
    # Test OCR hint with text directly
    resp = client.post("/ocr-hint", json={
        "text": "UPI Transaction Successful. Paid ₹450 to Rahul Sharma. UPI Ref No: 428910294821"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["available"] is True
    assert data["amount"] == 450
    assert data["utr"] == "428910294821"
    assert "not" in data["note"].lower()
