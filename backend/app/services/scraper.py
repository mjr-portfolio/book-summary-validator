"""Fetch and extract primary article text from a public URL."""

from __future__ import annotations

import ipaddress
import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

FETCH_TIMEOUT_SECONDS = 15.0
MAX_RESPONSE_BYTES = 2 * 1024 * 1024
MAX_REDIRECTS = 5
MIN_EXTRACTED_CHARS = 40

_NOISE_TAGS = (
    "script",
    "style",
    "noscript",
    "nav",
    "footer",
    "aside",
    "header",
    "iframe",
    "form",
    "button",
    "svg",
)

_NOISE_CLASS_RE = re.compile(
    r"(advert|ads?|sidebar|nav|menu|footer|cookie|promo|social|share|comment)",
    re.IGNORECASE,
)


class UrlScrapeError(Exception):
    """Raised when a URL cannot be fetched or article text cannot be extracted."""


def _is_private_or_local_host(hostname: str) -> bool:
    lowered = hostname.lower().strip(".")
    if lowered in {"localhost", "127.0.0.1", "::1", "0.0.0.0"}:
        return True
    if lowered.endswith(".localhost") or lowered.endswith(".local"):
        return True

    try:
        address = ipaddress.ip_address(lowered)
    except ValueError:
        return False

    return (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_reserved
        or address.is_multicast
    )


def normalize_and_validate_url(raw_url: str) -> str:
    url = raw_url.strip()
    if not url:
        raise UrlScrapeError("url must not be empty")

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise UrlScrapeError("url must be an absolute http or https address")

    hostname = parsed.hostname
    if not hostname:
        raise UrlScrapeError("url must include a valid hostname")

    if _is_private_or_local_host(hostname):
        raise UrlScrapeError("url must point to a public website")

    return url


def _strip_noise(soup: BeautifulSoup) -> None:
    for tag_name in _NOISE_TAGS:
        for node in soup.find_all(tag_name):
            node.decompose()

    for node in soup.find_all(True):
        class_attr = " ".join(node.get("class") or [])
        id_attr = node.get("id") or ""
        if _NOISE_CLASS_RE.search(f"{class_attr} {id_attr}"):
            node.decompose()


def _normalize_text(text: str) -> str:
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
    collapsed = "\n".join(line for line in lines if line)
    return collapsed.strip()


def extract_article_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    _strip_noise(soup)

    root = soup.find("article") or soup.find("main") or soup.body or soup
    text = _normalize_text(root.get_text(separator="\n"))

    if len(text) < MIN_EXTRACTED_CHARS:
        raise UrlScrapeError("Could not extract usable article text from the page")

    return text


async def fetch_and_extract_article_text(url: str) -> str:
    validated_url = normalize_and_validate_url(url)

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            max_redirects=MAX_REDIRECTS,
            timeout=FETCH_TIMEOUT_SECONDS,
            headers={"User-Agent": "project-read-scraper/1.0"},
        ) as client:
            response = await client.get(validated_url)
            response.raise_for_status()

            content_type = response.headers.get("content-type", "").lower()
            if "html" not in content_type and "text/plain" not in content_type:
                raise UrlScrapeError("URL did not return HTML content")

            content = response.content
            if len(content) > MAX_RESPONSE_BYTES:
                raise UrlScrapeError("Page content exceeds size limit")

            html = response.text
    except UrlScrapeError:
        raise
    except httpx.HTTPStatusError as exc:
        raise UrlScrapeError(f"Could not reach URL (HTTP {exc.response.status_code})") from exc
    except httpx.RequestError as exc:
        raise UrlScrapeError("Could not reach URL or page is unreachable") from exc

    return extract_article_text(html)
