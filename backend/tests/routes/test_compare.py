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


def test_lookup_text_endpoint_returns_result(client) -> None:
    from unittest.mock import AsyncMock, patch

    with patch(
        "app.routes.compare.fetch_book_knowledge_summary_async",
        new_callable=AsyncMock,
        return_value="Elizabeth meets Mr. Darcy at the ball.",
    ) as mock_lookup:
        response = client.post(
            "/api/lookup-text",
            data={
                "book_title": "Pride and Prejudice",
                "author": "Jane Austen",
                "chapter_or_section_name": "Chapter 3",
            },
        )

    assert response.status_code == 200
    assert response.json()["extracted_text"] == "Elizabeth meets Mr. Darcy at the ball."
    mock_lookup.assert_called_once_with("Pride and Prejudice", "Jane Austen", "Chapter 3")


def test_lookup_text_endpoint_rejects_empty_book_title(client) -> None:
    response = client.post(
        "/api/lookup-text",
        data={
            "book_title": "   ",
            "author": "Jane Austen",
            "chapter_or_section_name": "Chapter 3",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "book_title must not be empty"


def test_lookup_text_endpoint_rejects_empty_author(client) -> None:
    response = client.post(
        "/api/lookup-text",
        data={
            "book_title": "Pride and Prejudice",
            "author": "   ",
            "chapter_or_section_name": "Chapter 3",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "author must not be empty"


def test_lookup_text_endpoint_rejects_empty_section_name(client) -> None:
    response = client.post(
        "/api/lookup-text",
        data={
            "book_title": "Pride and Prejudice",
            "author": "Jane Austen",
            "chapter_or_section_name": "   ",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "chapter_or_section_name must not be empty"


def test_lookup_text_endpoint_returns_429_on_service_error(client) -> None:
    from unittest.mock import AsyncMock, patch

    from app.services.gemini import GeminiServiceError

    with patch(
        "app.routes.compare.fetch_book_knowledge_summary_async",
        new_callable=AsyncMock,
        side_effect=GeminiServiceError("429 RESOURCE_EXHAUSTED quota exceeded"),
    ):
        response = client.post(
            "/api/lookup-text",
            data={
                "book_title": "Pride and Prejudice",
                "author": "Jane Austen",
                "chapter_or_section_name": "Chapter 3",
            },
        )

    assert response.status_code == 429


def test_lookup_text_endpoint_returns_404_when_book_not_found(client) -> None:
    from unittest.mock import AsyncMock, patch

    from app.routes.compare import LOOKUP_NOT_FOUND_DETAIL
    from app.services.gemini import BookKnowledgeNotFoundError

    with patch(
        "app.routes.compare.fetch_book_knowledge_summary_async",
        new_callable=AsyncMock,
        side_effect=BookKnowledgeNotFoundError("could not confidently locate"),
    ):
        response = client.post(
            "/api/lookup-text",
            data={
                "book_title": "Fake Book",
                "author": "Unknown Author",
                "chapter_or_section_name": "Chapter 99",
            },
        )

    assert response.status_code == 404
    assert response.json()["detail"] == LOOKUP_NOT_FOUND_DETAIL
