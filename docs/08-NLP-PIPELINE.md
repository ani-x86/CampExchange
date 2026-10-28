# 08 – NLP Pipeline for Item Descriptions (Python / FastAPI)

## Goal
Seller types a rough note ("sell my hero cycle 2 yrs old gears work fine small scratch on frame") and optionally a title/category. The pipeline returns a clean, structured, honest description plus title, category, condition and tags. **Runs fully offline** (no paid API). It must never invent facts the seller did not state.

## Endpoint
`POST /describe`
```json
// request
{ "text": "hero cycle 2 yrs old gears fine small scratch", "title": "", "category": null, "price": 3500, "tone": "friendly" }
// response
{
  "title": "Hero Cycle – 2 Years Old",
  "category": "Vehicles",
  "condition": "GOOD",
  "description": "Hero cycle, about 2 years old, with working gears. Minor scratch on the frame. In good condition and ready to ride.",
  "bullets": ["Age: ~2 years", "Gears: working", "Flaw: small scratch on frame"],
  "tags": ["cycle","hero","gears","hostel"],
  "missing": ["Reason for selling", "Pickup location"],
  "price_hint": { "low": 2800, "high": 4200, "basis": "similar listings" },
  "flags": []
}
```
`GET /health` → `{ok:true}`.

## Pipeline stages (`nlp/app/pipeline/`)
1. **clean.py** – normalise unicode, expand SMS shorthand via dictionary (`yrs→years`, `ur→your`, `pls→please`, `gud→good`, `mnth→month`, `n→and`), fix repeated chars, sentence segmentation (spaCy `sentencizer`).
2. **extract.py** – spaCy `en_core_web_sm` + `PhraseMatcher`/`Matcher` rules to pull: brand/model (capitalised nouns + brand list), age (`\d+ (years|months)`), purchase year, defects (`scratch|dent|crack|stain|torn|missing`), working-state phrases, accessories (`charger|box|bill|warranty`), size/colour, edition for books (author, edition, subject, year).
3. **classify.py** – category + condition.
   - Category: TF-IDF + LogisticRegression trained on `data/seed_listings.csv` (≥ 300 hand-written rows across categories: Books, Electronics, Vehicles, Furniture, Hostel & Kitchen, Clothing, Lab & Stationery, Sports, Other). Fallback to keyword rules if confidence < 0.45.
   - Condition: rule scoring (defect words lower, "like new / barely used / unused" raise) → NEW / LIKE_NEW / GOOD / FAIR.
4. **compose.py** – template-based natural language generation from extracted slots (`data/templates.json`, 3 variants per category × tone `friendly|neutral|concise`). Deterministic and fact-preserving: only slots present are rendered. Join with proper grammar, capitalise, end with a short call-to-action (optional).
5. **price.py** – price hint = median ± 25% of active listings in same category/brand pulled from server (`GET /internal/price-stats`) or from seed data; return `null` if < 5 comparables.
6. **flags** – profanity/spam detector (word list + regex for phone numbers, UPI IDs, URLs) → `flags: ["contains_phone"]`. UI warns instead of blocking.
7. **missing** – checklist of recommended details not found (reason for selling, bill/warranty, pickup location, usage period).

### Optional upgrade (flag `USE_EMBEDDINGS=1`)
`sentence-transformers/all-MiniLM-L6-v2` for category similarity and "similar listings" retrieval. Off by default to keep install light on Windows.

## Files
```
nlp/
├─ requirements.txt   fastapi, uvicorn[standard], spacy==3.7.*, scikit-learn, pydantic, pandas, joblib, pytest
├─ app/main.py        FastAPI app, CORS for server origin only
├─ app/schemas.py     Pydantic models
├─ app/pipeline/{clean,extract,classify,compose,price}.py
├─ app/data/{categories.json,templates.json,brands.json,shorthand.json,seed_listings.csv}
├─ train.py           trains classifier → models/category.joblib
└─ tests/test_pipeline.py
```

## Integration
- Express `POST /api/nlp/describe` validates input (Zod, text 10–1000 chars), calls NLP with 3s timeout, returns result; if NLP is down, return 503 and the UI keeps the user's text.
- Client: "✦ Improve" button (or `Ctrl+J` in description field) → loading shimmer → suggestion panel showing original vs improved, **Accept** replaces description and auto-fills empty title/category/condition/tags, **Dismiss** keeps original. "Missing details" shown as small chips the seller can tap to append prompts.
- Debounced `category` suggestion while typing title (300ms) via `POST /api/nlp/suggest`.

## Quality bar (tests)
- 20+ golden examples in `tests/golden.json`; description must contain every extracted fact and no unstated fact.
- Classifier macro-F1 ≥ 0.80 on held-out seed split.
- p95 latency < 300ms per request.
- Handles Hinglish shorthand gracefully (keeps unknown words verbatim).
