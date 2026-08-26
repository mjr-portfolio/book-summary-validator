import io
from unittest.mock import AsyncMock, patch

import pytest
from PIL import Image

from app.services.gemini import GeminiServiceError


def _make_png_bytes() -> bytes:
    image = Image.new("RGB", (20, 20), color="white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.mark.parametrize(
    ("error_message", "expected_status", "expected_detail"),
    [
        (
            "404 model not found",
            502,
            "Configured Gemini model is unavailable. Contact the administrator.",
        ),
        (
            "Gemini request timed out after deadline",
            504,
            "Gemini request timed out. Please try again with shorter text.",
        ),
        (
            "Invalid or unsupported image file",
            400,
            "Invalid or unsupported image file",
        ),
        (
            "503 service unavailable upstream",
            503,
            "Upstream Gemini service unavailable. Please try again later.",
        ),
        (
            "Unexpected upstream failure",
            502,
            "Unexpected upstream failure",
        ),
    ],
)
def test_compare_endpoint_maps_gemini_errors(
    client,
    error_message: str,
    expected_status: int,
    expected_detail: str,
) -> None:
    with patch(
        "app.routes.compare.compare_texts_async",
        new_callable=AsyncMock,
        side_effect=GeminiServiceError(error_message),
    ):
        response = client.post(
            "/api/compare",
            data={"book_text": "Book text", "user_summary": "Summary text"},
        )

    assert response.status_code == expected_status
    assert response.json()["detail"] == expected_detail


@pytest.mark.parametrize(
    ("error_message", "expected_status"),
    [
        ("429 RESOURCE_EXHAUSTED quota exceeded", 429),
        ("Gemini request timed out", 504),
        ("503 service unavailable", 503),
    ],
)
def test_extract_text_endpoint_maps_gemini_errors(
    client,
    error_message: str,
    expected_status: int,
) -> None:
    with patch(
        "app.routes.compare.extract_text_from_image_async",
        new_callable=AsyncMock,
        side_effect=GeminiServiceError(error_message),
    ):
        response = client.post(
            "/api/extract-text",
            files={"image": ("page.png", _make_png_bytes(), "image/png")},
        )

    assert response.status_code == expected_status


def test_generate_questions_endpoint_maps_503_without_live_gemini(client) -> None:
    with patch(
        "app.routes.compare.generate_study_questions_async",
        new_callable=AsyncMock,
        side_effect=GeminiServiceError("503 service unavailable"),
    ) as mock_generate:
        response = client.post(
            "/api/generate-questions",
            json={
                "source_text": "Source text",
                "critique": "Critique text",
                "quiz_type": "remedial",
                "difficulty": "standard",
            },
        )

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Upstream Gemini service unavailable. Please try again later."
    )
    mock_generate.assert_awaited_once()


def test_grade_answers_endpoint_maps_503_without_live_gemini(client) -> None:
    with patch(
        "app.routes.compare.grade_study_answers_async",
        new_callable=AsyncMock,
        side_effect=GeminiServiceError("503 service unavailable"),
    ) as mock_grade:
        response = client.post(
            "/api/grade-answers",
            json={
                "source_text": "Source text",
                "questions": ["Q1?", "Q2?", "Q3?"],
                "answers": ["A1", "A2", "A3"],
            },
        )

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Upstream Gemini service unavailable. Please try again later."
    )
    mock_grade.assert_awaited_once()
