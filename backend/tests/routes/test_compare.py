import io

from PIL import Image


def _make_png_bytes() -> bytes:
    image = Image.new("RGB", (20, 20), color="white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_health_check(client) -> None:
    response = client.get("/docs")
    assert response.status_code == 200


def test_compare_endpoint_returns_result(client, mock_compare_texts) -> None:
    response = client.post(
        "/api/compare",
        data={
            "book_text": "The hero journeyed across the land.",
            "user_summary": "A hero travels on an adventure.",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["match_percentage"] == 87.5
    assert "themes" in data["critique"]
    mock_compare_texts.assert_called_once_with(
        "The hero journeyed across the land.",
        "A hero travels on an adventure.",
    )


def test_compare_endpoint_rejects_empty_payload(client) -> None:
    response = client.post(
        "/api/compare",
        data={"book_text": "", "user_summary": "A summary."},
    )

    assert response.status_code == 422


def test_compare_endpoint_rejects_empty_user_summary(client) -> None:
    response = client.post(
        "/api/compare",
        data={"book_text": "Book text", "user_summary": "   "},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "user_summary must not be empty"


def test_compare_endpoint_rejects_empty_book_text(client) -> None:
    response = client.post(
        "/api/compare",
        data={"book_text": "   ", "user_summary": "Summary text"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "book_text must not be empty"


def test_compare_endpoint_strips_whitespace(client, mock_compare_texts) -> None:
    response = client.post(
        "/api/compare",
        data={
            "book_text": "  Book text  ",
            "user_summary": "  Summary text  ",
        },
    )

    assert response.status_code == 200
    mock_compare_texts.assert_called_once_with("Book text", "Summary text")


def test_compare_endpoint_rejects_missing_book_text(client) -> None:
    response = client.post(
        "/api/compare",
        data={"user_summary": "A summary."},
    )

    assert response.status_code == 422


def test_compare_endpoint_returns_429_on_service_error(client) -> None:
    from unittest.mock import AsyncMock, patch

    from app.services.gemini import GeminiServiceError

    with patch(
        "app.routes.compare.compare_texts_async",
        new_callable=AsyncMock,
        side_effect=GeminiServiceError("429 RESOURCE_EXHAUSTED quota exceeded"),
    ):
        response = client.post(
            "/api/compare",
            data={"book_text": "Book text", "user_summary": "Summary text"},
        )

    assert response.status_code == 429


def test_extract_text_endpoint_returns_result(client) -> None:
    from unittest.mock import AsyncMock, patch

    with patch(
        "app.routes.compare.extract_text_from_image_async",
        new_callable=AsyncMock,
        return_value="Extracted book paragraph.",
    ) as mock_extract:
        response = client.post(
            "/api/extract-text",
            files={"image": ("page.png", _make_png_bytes(), "image/png")},
        )

    assert response.status_code == 200
    assert response.json()["extracted_text"] == "Extracted book paragraph."
    mock_extract.assert_called_once()


def test_extract_text_endpoint_rejects_invalid_mime(client) -> None:
    response = client.post(
        "/api/extract-text",
        files={"image": ("page.txt", b"not-an-image", "text/plain")},
    )

    assert response.status_code == 422


def test_extract_text_endpoint_rejects_empty_file(client) -> None:
    response = client.post(
        "/api/extract-text",
        files={"image": ("page.png", b"", "image/png")},
    )

    assert response.status_code == 422


def test_extract_text_endpoint_rejects_oversized_file(client) -> None:
    oversized = b"x" * (10 * 1024 * 1024 + 1)

    response = client.post(
        "/api/extract-text",
        files={"image": ("page.png", oversized, "image/png")},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "image exceeds 10 MB limit"
