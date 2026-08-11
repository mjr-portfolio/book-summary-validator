from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.compare import CompareResponse, ExtractTextResponse
from app.services.gemini import GeminiServiceError, compare_texts_async, extract_text_from_image_async

router = APIRouter(tags=["compare"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024


def _raise_gemini_http_error(exc: GeminiServiceError) -> None:
    message = str(exc).lower()

    if "429" in message or "quota" in message or "resource_exhausted" in message or "rate limit" in message:
        raise HTTPException(
            status_code=429,
            detail="Rate limit or quota exceeded. Please try again later.",
        ) from exc

    if "404" in message or "not found" in message:
        raise HTTPException(
            status_code=502,
            detail="Configured Gemini model is unavailable. Contact the administrator.",
        ) from exc

    if "timeout" in message or "timed out" in message or "deadline" in message:
        raise HTTPException(
            status_code=504,
            detail="Gemini request timed out. Please try again with shorter text.",
        ) from exc

    if "invalid" in message or "unsupported image" in message or "empty text extraction" in message:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if "503" in message or "service unavailable" in message:
        raise HTTPException(
            status_code=503,
            detail="Upstream Gemini service unavailable. Please try again later.",
        ) from exc

    raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/compare", response_model=CompareResponse)
async def compare(
    user_summary: Annotated[str, Form()],
    book_text: Annotated[str, Form()],
) -> CompareResponse:
    summary = user_summary.strip()
    text = book_text.strip()

    if not summary:
        raise HTTPException(status_code=422, detail="user_summary must not be empty")
    if not text:
        raise HTTPException(status_code=422, detail="book_text must not be empty")

    try:
        return await compare_texts_async(text, summary)
    except GeminiServiceError as exc:
        _raise_gemini_http_error(exc)


@router.post("/extract-text", response_model=ExtractTextResponse)
async def extract_text(image: UploadFile = File(...)) -> ExtractTextResponse:
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=422,
            detail="image must be a JPEG, PNG, or WebP file",
        )

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=422, detail="image must not be empty")

    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=422, detail="image exceeds 10 MB limit")

    try:
        extracted = await extract_text_from_image_async(image_bytes)
        return ExtractTextResponse(extracted_text=extracted)
    except GeminiServiceError as exc:
        _raise_gemini_http_error(exc)
