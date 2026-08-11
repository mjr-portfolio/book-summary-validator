import pytest
from pydantic import ValidationError

from app.schemas.compare import CompareRequest, CompareResponse, ExtractTextResponse


def test_compare_request_valid() -> None:
    request = CompareRequest(book_text="Book content", user_summary="My summary")
    assert request.book_text == "Book content"
    assert request.user_summary == "My summary"


def test_compare_request_rejects_empty_fields() -> None:
    with pytest.raises(ValidationError):
        CompareRequest(book_text="", user_summary="My summary")


def test_compare_request_rejects_empty_user_summary() -> None:
    with pytest.raises(ValidationError):
        CompareRequest(book_text="Book content", user_summary="   ")


def test_compare_response_accepts_valid_percentage_bounds() -> None:
    low = CompareResponse(match_percentage=0.0, critique="No overlap.")
    high = CompareResponse(match_percentage=100.0, critique="Perfect match.")

    assert low.match_percentage == 0.0
    assert high.match_percentage == 100.0


def test_compare_response_validates_percentage_range() -> None:
    with pytest.raises(ValidationError):
        CompareResponse(match_percentage=101.0, critique="Too high")

    with pytest.raises(ValidationError):
        CompareResponse(match_percentage=-1.0, critique="Too low")


def test_extract_text_response_valid() -> None:
    response = ExtractTextResponse(extracted_text="Scanned paragraph.")
    assert response.extracted_text == "Scanned paragraph."


def test_extract_text_response_rejects_empty_text() -> None:
    with pytest.raises(ValidationError):
        ExtractTextResponse(extracted_text="   ")
