import asyncio
import io
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from PIL import Image

from app.schemas.compare import CompareResponse
from app.services.gemini import (
    GeminiServiceError,
    compare_texts,
    extract_text_from_image,
    extract_text_from_image_async,
    fetch_book_knowledge_summary,
    fetch_book_knowledge_summary_async,
    filter_scraped_text_by_section,
    scrape_and_filter_article_async,
)


def _make_png_bytes() -> bytes:
    image = Image.new("RGB", (20, 20), color="white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_extract_text_from_image_returns_text() -> None:
    mock_response = MagicMock()
    mock_response.text = "Extracted book paragraph."

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini._get_client", return_value=mock_client):
        result = extract_text_from_image(_make_png_bytes())

    assert result == "Extracted book paragraph."


def test_compare_texts_returns_parsed_response() -> None:
    mock_response = MagicMock()
    mock_response.parsed = CompareResponse(
        match_percentage=92.0,
        critique="Excellent conceptual alignment.",
    )
    mock_response.text = None

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini._get_client", return_value=mock_client):
        result = compare_texts("Book content", "My summary")

    assert result == CompareResponse(
        match_percentage=92.0,
        critique="Excellent conceptual alignment.",
    )


def test_compare_texts_falls_back_to_model_validate_json() -> None:
    mock_response = MagicMock()
    mock_response.parsed = None
    mock_response.text = '{"match_percentage": 80.0, "critique": "Good summary."}'

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini._get_client", return_value=mock_client):
        result = compare_texts("Book content", "My summary")

    assert result.match_percentage == 80.0
    assert result.critique == "Good summary."


def test_compare_texts_raises_when_api_key_missing() -> None:
    with patch.dict("os.environ", {}, clear=True):
        with pytest.raises(GeminiServiceError, match="GEMINI_API_KEY is not configured"):
            compare_texts("Book content", "My summary")


def test_compare_texts_raises_on_empty_response() -> None:
    mock_response = MagicMock()
    mock_response.parsed = None
    mock_response.text = None

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini._get_client", return_value=mock_client):
        with pytest.raises(GeminiServiceError, match="Empty or unparseable response"):
            compare_texts("Book content", "My summary")


def test_compare_texts_raises_on_client_error() -> None:
    from google.genai import errors as genai_errors

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = genai_errors.ClientError(
        404,
        {"error": {"message": "model not found"}},
        None,
    )

    with patch("app.services.gemini._get_client", return_value=mock_client):
        with pytest.raises(GeminiServiceError, match="model not found"):
            compare_texts("Book content", "My summary")


def test_compare_texts_parses_dict_parsed_response() -> None:
    mock_response = MagicMock()
    mock_response.parsed = {
        "match_percentage": 75.0,
        "critique": "Solid summary with minor gaps.",
    }
    mock_response.text = None

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini._get_client", return_value=mock_client):
        result = compare_texts("Book content", "My summary")

    assert result.match_percentage == 75.0
    assert result.critique == "Solid summary with minor gaps."


def test_compare_texts_raises_on_empty_critique() -> None:
    mock_response = MagicMock()
    mock_response.parsed = CompareResponse(match_percentage=90.0, critique="   ")
    mock_response.text = None

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini._get_client", return_value=mock_client):
        with pytest.raises(GeminiServiceError, match="empty critique"):
            compare_texts("Book content", "My summary")


def test_extract_text_from_image_raises_on_empty_extraction() -> None:
    mock_response = MagicMock()
    mock_response.text = "   "

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini._get_client", return_value=mock_client):
        with pytest.raises(GeminiServiceError, match="Empty text extraction"):
            extract_text_from_image(_make_png_bytes())


def test_extract_text_from_image_raises_when_api_key_missing() -> None:
    with patch.dict("os.environ", {}, clear=True):
        with pytest.raises(GeminiServiceError, match="GEMINI_API_KEY is not configured"):
            extract_text_from_image(_make_png_bytes())


def test_extract_text_from_image_raises_on_invalid_image() -> None:
    with pytest.raises(GeminiServiceError, match="Invalid or unsupported image"):
        extract_text_from_image(b"not-a-valid-image")


def test_normalize_image_scales_oversized_dimensions() -> None:
    large_image = Image.new("RGB", (5000, 3000), color="blue")
    buffer = io.BytesIO()
    large_image.save(buffer, format="PNG")
    image_bytes = buffer.getvalue()

    mock_response = MagicMock()
    mock_response.text = "Scaled image text."

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini._get_client", return_value=mock_client):
        result = extract_text_from_image(image_bytes)

    assert result == "Scaled image text."
    mock_client.models.generate_content.assert_called_once()


def test_compare_texts_raises_on_timeout_error() -> None:
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = TimeoutError("deadline exceeded")

    with patch("app.services.gemini._get_client", return_value=mock_client):
        with pytest.raises(GeminiServiceError, match="timed out"):
            compare_texts("Book content", "My summary")


def test_compare_texts_raises_on_generic_timeout_message() -> None:
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = RuntimeError("request timed out upstream")

    with patch("app.services.gemini._get_client", return_value=mock_client):
        with pytest.raises(GeminiServiceError, match="timed out"):
            compare_texts("Book content", "My summary")


def test_compare_texts_raises_on_unexpected_error() -> None:
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = RuntimeError("network partition")

    with patch("app.services.gemini._get_client", return_value=mock_client):
        with pytest.raises(GeminiServiceError, match="Unexpected Gemini error"):
            compare_texts("Book content", "My summary")


def test_extract_text_from_image_async_delegates_to_sync() -> None:
    with patch(
        "app.services.gemini.extract_text_from_image",
        return_value="Async extracted text.",
    ) as mock_extract:
        result = asyncio.run(extract_text_from_image_async(_make_png_bytes()))

    assert result == "Async extracted text."
    mock_extract.assert_called_once()


def test_compare_texts_async_delegates_to_sync() -> None:
    from app.services.gemini import compare_texts_async

    expected = CompareResponse(match_percentage=81.0, critique="Aligned.")

    with patch("app.services.gemini.compare_texts", return_value=expected) as mock_compare:
        result = asyncio.run(compare_texts_async("Book content", "My summary"))

    assert result == expected
    mock_compare.assert_called_once_with("Book content", "My summary")


def test_fetch_book_knowledge_summary_returns_text() -> None:
    mock_response = MagicMock()
    mock_response.text = "Winston begins his rebellion against the Party."

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini._get_client", return_value=mock_client):
        result = fetch_book_knowledge_summary("1984", "George Orwell", "Chapter 1")

    assert result == "Winston begins his rebellion against the Party."


def test_fetch_book_knowledge_summary_raises_on_empty_response() -> None:
    mock_response = MagicMock()
    mock_response.text = "   "

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini._get_client", return_value=mock_client):
        with pytest.raises(GeminiServiceError, match="Empty book knowledge summary"):
            fetch_book_knowledge_summary("1984", "George Orwell", "Chapter 1")


def test_fetch_book_knowledge_summary_raises_when_book_not_found() -> None:
    from app.services.gemini import BookKnowledgeNotFoundError

    mock_response = MagicMock()
    mock_response.text = "The requested book or section cannot be identified."

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini._get_client", return_value=mock_client):
        with pytest.raises(BookKnowledgeNotFoundError, match="could not confidently locate"):
            fetch_book_knowledge_summary("Fake Book", "Unknown Author", "Chapter 99")


def test_fetch_book_knowledge_summary_raises_when_api_key_missing() -> None:
    with patch.dict("os.environ", {}, clear=True):
        with pytest.raises(GeminiServiceError, match="GEMINI_API_KEY is not configured"):
            fetch_book_knowledge_summary("1984", "George Orwell", "Chapter 1")


def test_fetch_book_knowledge_summary_async_delegates_to_sync() -> None:
    with patch(
        "app.services.gemini.fetch_book_knowledge_summary",
        return_value="Async chapter summary.",
    ) as mock_lookup:
        result = asyncio.run(
            fetch_book_knowledge_summary_async("1984", "George Orwell", "Chapter 1"),
        )

    assert result == "Async chapter summary."
    mock_lookup.assert_called_once_with("1984", "George Orwell", "Chapter 1")


def test_filter_scraped_text_by_section_returns_text() -> None:
    mock_response = MagicMock()
    mock_response.text = "Only the introduction paragraph."

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini._get_client", return_value=mock_client):
        result = filter_scraped_text_by_section(
            "Introduction\nOnly the introduction paragraph.\nConclusion\nOther text.",
            "Introduction",
        )

    assert result == "Only the introduction paragraph."


def test_filter_scraped_text_by_section_raises_on_empty_response() -> None:
    mock_response = MagicMock()
    mock_response.text = "   "

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.gemini._get_client", return_value=mock_client):
        with pytest.raises(GeminiServiceError, match="Empty section filter result"):
            filter_scraped_text_by_section("scraped page text", "Introduction")


def test_scrape_and_filter_article_async_runs_two_step_pipeline() -> None:
    with (
        patch(
            "app.services.gemini.fetch_and_extract_article_text",
            new=AsyncMock(return_value="Raw scraped webpage text."),
        ) as mock_fetch,
        patch(
            "app.services.gemini.filter_scraped_text_by_section",
            return_value="Filtered section text.",
        ) as mock_filter,
    ):
        result = asyncio.run(
            scrape_and_filter_article_async(
                "https://example.com/article",
                "Introduction",
            ),
        )

    assert result == "Filtered section text."
    mock_fetch.assert_awaited_once_with("https://example.com/article")
    mock_filter.assert_called_once_with("Raw scraped webpage text.", "Introduction")


def test_compare_texts_live_integration() -> None:
    if not (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")):
        pytest.skip("No Gemini API key configured")

    result = compare_texts(
        book_text="The dragon guarded a mountain of gold. A knight arrived to negotiate peace.",
        user_summary="A knight meets a dragon protecting treasure and tries diplomacy instead of fighting.",
    )

    assert isinstance(result, CompareResponse)
    assert 0 <= result.match_percentage <= 100
    assert result.critique.strip()
