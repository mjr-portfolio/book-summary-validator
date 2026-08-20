import pytest
from pydantic import ValidationError

from app.schemas.compare import (
    CompareRequest,
    CompareResponse,
    ExtractTextResponse,
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    GradeAnswerResult,
    GradeAnswersRequest,
    GradeAnswersResponse,
    LookupTextResponse,
    ScrapeUrlResponse,
    StudyQuestion,
)


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


def test_lookup_text_response_valid() -> None:
    response = LookupTextResponse(extracted_text="Chapter summary from knowledge base.")
    assert response.extracted_text == "Chapter summary from knowledge base."


def test_lookup_text_response_rejects_empty_text() -> None:
    with pytest.raises(ValidationError):
        LookupTextResponse(extracted_text="   ")


def test_scrape_url_response_valid() -> None:
    response = ScrapeUrlResponse(extracted_text="Scraped article paragraph.")
    assert response.extracted_text == "Scraped article paragraph."


def test_scrape_url_response_rejects_empty_text() -> None:
    with pytest.raises(ValidationError):
        ScrapeUrlResponse(extracted_text="   ")


def test_generate_questions_request_valid() -> None:
    request = GenerateQuestionsRequest(
        source_text="Source",
        critique="Missed themes.",
        quiz_type="remedial",
        difficulty="standard",
        exclusion_history=["Old question?"],
    )
    assert request.quiz_type == "remedial"
    assert request.exclusion_history == ["Old question?"]


def test_generate_questions_request_rejects_empty_fields() -> None:
    with pytest.raises(ValidationError):
        GenerateQuestionsRequest(
            source_text="   ",
            critique="Critique",
            quiz_type="mastery",
            difficulty="advanced",
        )

    with pytest.raises(ValidationError):
        GenerateQuestionsRequest(
            source_text="Source",
            critique="",
            quiz_type="mastery",
            difficulty="advanced",
        )


def test_generate_questions_request_rejects_invalid_enums() -> None:
    with pytest.raises(ValidationError):
        GenerateQuestionsRequest(
            source_text="Source",
            critique="Critique",
            quiz_type="beginner",
            difficulty="standard",
        )

    with pytest.raises(ValidationError):
        GenerateQuestionsRequest(
            source_text="Source",
            critique="Critique",
            quiz_type="mastery",
            difficulty="extreme",
        )


def test_generate_questions_response_requires_exactly_three() -> None:
    valid = GenerateQuestionsResponse(
        questions=[
            StudyQuestion(question="Q1?"),
            StudyQuestion(question="Q2?"),
            StudyQuestion(question="Q3?"),
        ]
    )
    assert len(valid.questions) == 3

    with pytest.raises(ValidationError):
        GenerateQuestionsResponse(questions=[StudyQuestion(question="Only one?")])


def test_study_question_rejects_empty() -> None:
    with pytest.raises(ValidationError):
        StudyQuestion(question="   ")


def test_grade_answers_request_valid() -> None:
    request = GradeAnswersRequest(
        source_text="Source",
        questions=["Q1?", "Q2?", "Q3?"],
        answers=["A1", "A2", "A3"],
    )
    assert len(request.answers) == 3


def test_grade_answers_request_rejects_wrong_length_or_empty() -> None:
    with pytest.raises(ValidationError):
        GradeAnswersRequest(
            source_text="Source",
            questions=["Q1?", "Q2?"],
            answers=["A1", "A2", "A3"],
        )

    with pytest.raises(ValidationError):
        GradeAnswersRequest(
            source_text="Source",
            questions=["Q1?", "Q2?", "Q3?"],
            answers=["A1", "  ", "A3"],
        )


def test_grade_answers_response_validates_count() -> None:
    response = GradeAnswersResponse(
        results=[
            GradeAnswerResult(is_correct=True, feedback="Good", hint="Keep going"),
            GradeAnswerResult(is_correct=False, feedback="Missed", hint="Reread"),
            GradeAnswerResult(is_correct=True, feedback="Solid", hint="Nice"),
        ],
        correct_count=2,
    )
    assert response.correct_count == 2

    with pytest.raises(ValidationError):
        GradeAnswersResponse(
            results=[
                GradeAnswerResult(is_correct=True, feedback="Good", hint="Keep going"),
                GradeAnswerResult(is_correct=False, feedback="Missed", hint="Reread"),
                GradeAnswerResult(is_correct=True, feedback="Solid", hint="Nice"),
            ],
            correct_count=4,
        )
