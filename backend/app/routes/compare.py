from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.compare import (
    CompareResponse,
    ExtractTextResponse,
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    GradeAnswersRequest,
    GradeAnswersResponse,
    LookupTextResponse,
    ScrapeUrlResponse,
)
from app.services.gemini import (
    BookKnowledgeNotFoundError,
    GeminiServiceError,
    compare_texts_async,
    extract_text_from_image_async,
    fetch_book_knowledge_summary_async,
    generate_study_questions_async,
    grade_study_answers_async,
    scrape_and_filter_article_async,
)
from app.services.scraper import UrlScrapeError

LOOKUP_NOT_FOUND_DETAIL = (
    "The AI could not confidently locate that book or chapter. "
    "Please check your spelling and try again."
)

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

    if (
        "invalid" in message
        or "unsupported image" in message
        or "empty text extraction" in message
        or "empty book knowledge summary" in message
        or "empty section filter" in message
    ):
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


@router.post("/lookup-text", response_model=LookupTextResponse)
async def lookup_text(
    book_title: Annotated[str, Form()],
    author: Annotated[str, Form()],
    chapter_or_section_name: Annotated[str, Form()],
) -> LookupTextResponse:
    title = book_title.strip()
    author_name = author.strip()
    section_name = chapter_or_section_name.strip()

    if not title:
        raise HTTPException(status_code=422, detail="book_title must not be empty")
    if not author_name:
        raise HTTPException(status_code=422, detail="author must not be empty")
    if not section_name:
        raise HTTPException(status_code=422, detail="chapter_or_section_name must not be empty")

    try:
        summary = await fetch_book_knowledge_summary_async(title, author_name, section_name)
        return LookupTextResponse(extracted_text=summary)
    except BookKnowledgeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=LOOKUP_NOT_FOUND_DETAIL) from exc
    except GeminiServiceError as exc:
        _raise_gemini_http_error(exc)


@router.post("/scrape-url", response_model=ScrapeUrlResponse)
async def scrape_url(
    url: Annotated[str, Form()],
    section_filter: Annotated[str, Form()],
) -> ScrapeUrlResponse:
    target = url.strip()
    section = section_filter.strip()

    if not target:
        raise HTTPException(status_code=422, detail="url must not be empty")
    if not section:
        raise HTTPException(status_code=422, detail="section_filter must not be empty")

    try:
        extracted = await scrape_and_filter_article_async(target, section)
        return ScrapeUrlResponse(extracted_text=extracted)
    except UrlScrapeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except GeminiServiceError as exc:
        _raise_gemini_http_error(exc)


@router.post("/generate-questions", response_model=GenerateQuestionsResponse)
async def generate_questions(payload: GenerateQuestionsRequest) -> GenerateQuestionsResponse:
    source_text = payload.source_text.strip()
    critique = payload.critique.strip()
    exclusion_history = [item.strip() for item in payload.exclusion_history if item.strip()]

    try:
        return await generate_study_questions_async(
            source_text,
            critique,
            payload.quiz_type,
            payload.difficulty,
            exclusion_history,
        )
    except GeminiServiceError as exc:
        _raise_gemini_http_error(exc)


@router.post("/grade-answers", response_model=GradeAnswersResponse)
async def grade_answers(payload: GradeAnswersRequest) -> GradeAnswersResponse:
    source_text = payload.source_text.strip()
    questions = [question.strip() for question in payload.questions]
    answers = [answer.strip() for answer in payload.answers]

    try:
        return await grade_study_answers_async(source_text, questions, answers)
    except GeminiServiceError as exc:
        _raise_gemini_http_error(exc)
