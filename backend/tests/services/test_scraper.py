import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.scraper import (
    JINA_READER_PREFIX,
    UrlScrapeError,
    fetch_and_extract_article_text,
    normalize_and_validate_url,
)


def test_normalize_and_validate_url_accepts_https() -> None:
    assert normalize_and_validate_url("https://example.com/post") == "https://example.com/post"


def test_normalize_and_validate_url_rejects_empty() -> None:
    with pytest.raises(UrlScrapeError, match="must not be empty"):
        normalize_and_validate_url("   ")


def test_normalize_and_validate_url_rejects_non_http_scheme() -> None:
    with pytest.raises(UrlScrapeError, match="absolute http or https"):
        normalize_and_validate_url("ftp://example.com/file")


def test_normalize_and_validate_url_rejects_localhost() -> None:
    with pytest.raises(UrlScrapeError, match="public website"):
        normalize_and_validate_url("http://localhost:8000/secret")


def test_normalize_and_validate_url_rejects_private_ip() -> None:
    with pytest.raises(UrlScrapeError, match="public website"):
        normalize_and_validate_url("http://192.168.1.10/internal")


def test_fetch_and_extract_article_text_uses_jina_proxy() -> None:
    article_markdown = (
        "Title: Deep Dive Into Summaries\n\n"
        "This is the primary article content that should be kept for comparison.\n"
        "Readers use summaries to check understanding of source material."
    )

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.content = article_markdown.encode("utf-8")
    mock_response.text = article_markdown

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("app.services.scraper.httpx.AsyncClient", return_value=mock_client):
        text = asyncio.run(fetch_and_extract_article_text("https://example.com/post"))

    assert "Deep Dive Into Summaries" in text
    assert "primary article content" in text
    mock_client.get.assert_awaited_once_with(
        f"{JINA_READER_PREFIX}https://example.com/post",
    )


def test_fetch_and_extract_article_text_raises_when_content_too_short() -> None:
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.content = b"Hi"
    mock_response.text = "Hi"

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("app.services.scraper.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(UrlScrapeError, match="usable article text"):
            asyncio.run(fetch_and_extract_article_text("https://example.com/post"))


def test_fetch_and_extract_article_text_maps_http_errors() -> None:
    request = httpx.Request("GET", f"{JINA_READER_PREFIX}https://example.com/missing")
    response = httpx.Response(404, request=request)

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(
        side_effect=httpx.HTTPStatusError("not found", request=request, response=response),
    )
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("app.services.scraper.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(UrlScrapeError, match="Could not reach URL \\(HTTP 404\\)"):
            asyncio.run(fetch_and_extract_article_text("https://example.com/missing"))
