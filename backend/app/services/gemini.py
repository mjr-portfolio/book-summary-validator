import asyncio
import io
import os

from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from PIL import Image, UnidentifiedImageError

from app.prompts import EXTRACT_TEXT_PROMPT, build_compare_prompt
from app.schemas.compare import CompareResponse

MODEL = "gemini-flash-latest"
MAX_IMAGE_DIMENSION = 4096
GEMINI_TIMEOUT_MS = "90000"


class GeminiServiceError(Exception):
    """Raised when the Gemini API call fails or returns invalid data."""


def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise GeminiServiceError("GEMINI_API_KEY is not configured")
    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_MS),
    )


def _normalize_image(image_bytes: bytes) -> tuple[bytes, str]:
    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            rgb_image = image.convert("RGB")
            width, height = rgb_image.size
            if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
                rgb_image.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION))

            buffer = io.BytesIO()
            rgb_image.save(buffer, format="PNG")
            return buffer.getvalue(), "image/png"
    except UnidentifiedImageError as exc:
        raise GeminiServiceError("Invalid or unsupported image file") from exc


def _parse_response(response) -> CompareResponse:
    if response.parsed is not None:
        if isinstance(response.parsed, CompareResponse):
            parsed = response.parsed
        else:
            parsed = CompareResponse.model_validate(response.parsed)
    elif response.text:
        parsed = CompareResponse.model_validate_json(response.text)
    else:
        raise GeminiServiceError("Empty or unparseable response from Gemini API")

    if not parsed.critique.strip():
        raise GeminiServiceError("Gemini returned an empty critique")

    return parsed


def _wrap_gemini_errors(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except GeminiServiceError:
            raise
        except genai_errors.ClientError as exc:
            raise GeminiServiceError(str(exc)) from exc
        except TimeoutError as exc:
            raise GeminiServiceError(f"Gemini request timed out: {exc}") from exc
        except Exception as exc:
            message = str(exc).lower()
            if "timeout" in message or "timed out" in message or "deadline" in message:
                raise GeminiServiceError(f"Gemini request timed out: {exc}") from exc
            raise GeminiServiceError(f"Unexpected Gemini error: {exc}") from exc

    return wrapper


@_wrap_gemini_errors
def extract_text_from_image(image_bytes: bytes) -> str:
    normalized_bytes, normalized_mime = _normalize_image(image_bytes)
    client = _get_client()
    response = client.models.generate_content(
        model=MODEL,
        contents=[
            types.Part.from_bytes(data=normalized_bytes, mime_type=normalized_mime),
            types.Part(text=EXTRACT_TEXT_PROMPT),
        ],
    )

    extracted = (response.text or "").strip()
    if not extracted:
        raise GeminiServiceError("Empty text extraction from image")

    return extracted


@_wrap_gemini_errors
def compare_texts(book_text: str, user_summary: str) -> CompareResponse:
    client = _get_client()
    prompt = build_compare_prompt(book_text, user_summary)
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=CompareResponse,
        ),
    )
    return _parse_response(response)


async def extract_text_from_image_async(image_bytes: bytes) -> str:
    return await asyncio.to_thread(extract_text_from_image, image_bytes)


async def compare_texts_async(book_text: str, user_summary: str) -> CompareResponse:
    return await asyncio.to_thread(compare_texts, book_text, user_summary)
