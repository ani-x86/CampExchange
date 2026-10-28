import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from app.schemas import (
    DescribeRequest,
    DescribeResponse,
    SuggestRequest,
    SuggestResponse,
    PriceHint
)
from app.pipeline.clean import clean_input
from app.pipeline.extract import extract_slots
from app.pipeline.classify import classify_category, classify_condition
from app.pipeline.compose import compose_description
from app.pipeline.price import get_price_hint
from app.pipeline.flags import detect_flags, find_missing_details
from app.pipeline.gemini import enhance_with_gemini

app = FastAPI(title="Camp-Exchange NLP Pipeline", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000", "http://127.0.0.1:4000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OcrHintRequest(BaseModel):
    text: Optional[str] = None
    image_path: Optional[str] = None

class OcrHintResponse(BaseModel):
    available: bool
    amount: Optional[int] = None
    utr: Optional[str] = None
    note: str
    message: Optional[str] = None

@app.get("/health")
def health_check():
    return {"ok": True, "service": "camp-exchange-nlp"}

@app.post("/describe", response_model=DescribeResponse)
def describe_item(req: DescribeRequest):
    if len(req.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Text too short to analyze")

    cleaned = clean_input(req.text)
    slots = extract_slots(cleaned)
    category, _ = classify_category(cleaned, current_category=req.category)
    condition = classify_condition(cleaned)
    
    gen_title, desc, bullets, tags = compose_description(
        slots=slots,
        category=category,
        condition=condition,
        tone=req.tone or "friendly"
    )

    # Gemini enhancer step (falls back to rules if missing key, timeout, or check fails)
    final_desc, source = enhance_with_gemini(
        raw_text=req.text,
        rule_desc=desc,
        slots=slots,
        category=category,
        condition=condition
    )

    final_title = req.title.strip() if (req.title and req.title.strip()) else gen_title
    flags = detect_flags(req.text)
    missing = find_missing_details(req.text)
    raw_price_hint = get_price_hint(category, req.price)
    
    price_hint_obj = None
    if raw_price_hint:
        price_hint_obj = PriceHint(
            low=raw_price_hint["low"],
            high=raw_price_hint["high"],
            basis=raw_price_hint["basis"]
        )

    return DescribeResponse(
        title=final_title,
        category=category,
        condition=condition,
        description=final_desc,
        bullets=bullets,
        tags=tags,
        missing=missing,
        price_hint=price_hint_obj,
        flags=flags,
        source=source
    )

@app.post("/suggest", response_model=SuggestResponse)
def suggest_category(req: SuggestRequest):
    title = req.title.strip()
    if not title:
        return SuggestResponse(category="Other", confidence=0.0, tags=[])

    cleaned = clean_input(title)
    category, confidence = classify_category(cleaned)
    slots = extract_slots(cleaned)
    from app.pipeline.compose import generate_tags
    tags = generate_tags(slots, category)

    return SuggestResponse(
        category=category,
        confidence=confidence,
        tags=tags
    )

@app.post("/ocr-hint", response_model=OcrHintResponse)
def ocr_hint(req: OcrHintRequest):
    """
    Optional OCR hint: extracts amount and UTR from payment screenshot text.
    If Tesseract is not installed on Windows, skips gracefully.
    """
    extracted_text = req.text or ""

    if not extracted_text and req.image_path:
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(req.image_path)
            extracted_text = pytesseract.image_to_string(img)
        except ImportError:
            return OcrHintResponse(
                available=False,
                amount=None,
                utr=None,
                note="Not verified - peer to peer payment.",
                message="Tesseract OCR Python package not installed. Install with: pip install pytesseract pillow"
            )
        except Exception as e:
            return OcrHintResponse(
                available=False,
                amount=None,
                utr=None,
                note="Not verified - peer to peer payment.",
                message="Tesseract binary not found on Windows. Download from https://github.com/UB-Mannheim/tesseract/wiki or run: winget install UB-Mannheim.TesseractOCR"
            )

    if not extracted_text:
        return OcrHintResponse(
            available=True,
            amount=None,
            utr=None,
            note="Detected hint only - payments are peer to peer and must be confirmed manually."
        )

    # Detect amount (e.g. ₹500, Rs. 500, INR 500, 500.00)
    amount_match = re.search(r'(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)', extracted_text, re.IGNORECASE)
    detected_amount = None
    if amount_match:
        try:
            cleaned_num = amount_match.group(1).replace(',', '')
            detected_amount = int(float(cleaned_num))
        except (ValueError, TypeError):
            pass

    # Detect 12-digit UTR / UPI reference ID
    utr_match = re.search(r'\b(\d{12})\b', extracted_text)
    detected_utr = utr_match.group(1) if utr_match else None

    return OcrHintResponse(
        available=True,
        amount=detected_amount,
        utr=detected_utr,
        note="Detected hint only - payments are peer to peer and must be confirmed manually. Not a payment verification."
    )
