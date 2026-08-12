import pytest

from app.services.scraper import (
    UrlScrapeError,
    extract_article_text,
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


def test_extract_article_text_prefers_article_and_strips_noise() -> None:
    html = """
    <html>
      <body>
        <nav>Home About</nav>
        <aside class="sidebar">Related ads</aside>
        <script>window.track()</script>
        <article>
          <h1>Deep Dive Into Summaries</h1>
          <p>This is the primary article content that should be kept for comparison.</p>
          <p>Readers use summaries to check understanding of source material.</p>
        </article>
        <footer>Copyright</footer>
      </body>
    </html>
    """

    text = extract_article_text(html)

    assert "Deep Dive Into Summaries" in text
    assert "primary article content" in text
    assert "Home About" not in text
    assert "Related ads" not in text
    assert "window.track" not in text
    assert "Copyright" not in text


def test_extract_article_text_falls_back_to_main() -> None:
    html = """
    <html>
      <body>
        <main>
          <p>Main region holds enough readable content for extraction to succeed cleanly.</p>
        </main>
      </body>
    </html>
    """

    text = extract_article_text(html)
    assert "Main region holds enough readable content" in text


def test_extract_article_text_raises_when_content_too_short() -> None:
    html = "<html><body><article><p>Hi</p></article></body></html>"

    with pytest.raises(UrlScrapeError, match="usable article text"):
        extract_article_text(html)
