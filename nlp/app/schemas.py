from typing import Optional, List
from pydantic import BaseModel, Field

class DescribeRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=1500)
    title: Optional[str] = ""
    category: Optional[str] = None
    price: Optional[float] = None
    tone: Optional[str] = "friendly"

class PriceHint(BaseModel):
    low: int
    high: int
    basis: str

class DescribeResponse(BaseModel):
    title: str
    category: str
    condition: str
    description: str
    bullets: List[str]
    tags: List[str]
    missing: List[str]
    price_hint: Optional[PriceHint] = None
    flags: List[str] = []
    source: str = "rules"

class SuggestRequest(BaseModel):
    title: str

class SuggestResponse(BaseModel):
    category: str
    confidence: float
    tags: List[str]
