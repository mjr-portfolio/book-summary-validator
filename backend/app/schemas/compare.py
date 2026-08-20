from typing import Literal

from pydantic import BaseModel, Field, field_validator


class CompareRequest(BaseModel):
    book_text: str
    user_summary: str

    @field_validator("book_text", "user_summary")
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be empty")
        return value


class CompareResponse(BaseModel):
    match_percentage: float
    critique: str

    @field_validator("match_percentage")
    @classmethod
    def validate_percentage_range(cls, value: float) -> float:
        if not 0 <= value <= 100:
            raise ValueError("match_percentage must be between 0 and 100")
        return value


class ExtractTextResponse(BaseModel):
    extracted_text: str

    @field_validator("extracted_text")
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("extracted_text must not be empty")
        return value


class LookupTextResponse(BaseModel):
    extracted_text: str

    @field_validator("extracted_text")
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("extracted_text must not be empty")
        return value


class ScrapeUrlResponse(BaseModel):
    extracted_text: str

    @field_validator("extracted_text")
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("extracted_text must not be empty")
        return value


QuizType = Literal["remedial", "mastery"]
QuizDifficulty = Literal["standard", "advanced", "professional"]


class GenerateQuestionsRequest(BaseModel):
    source_text: str
    critique: str
    quiz_type: QuizType
    difficulty: QuizDifficulty
    exclusion_history: list[str] = Field(default_factory=list)

    @field_validator("source_text", "critique")
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be empty")
        return value


class StudyQuestion(BaseModel):
    question: str

    @field_validator("question")
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be empty")
        return value


class GenerateQuestionsResponse(BaseModel):
    questions: list[StudyQuestion] = Field(min_length=3, max_length=3)


class GradeAnswersRequest(BaseModel):
    source_text: str
    questions: list[str] = Field(min_length=3, max_length=3)
    answers: list[str] = Field(min_length=3, max_length=3)

    @field_validator("source_text")
    @classmethod
    def source_must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be empty")
        return value

    @field_validator("questions", "answers")
    @classmethod
    def items_must_not_be_empty(cls, value: list[str]) -> list[str]:
        if any(not item.strip() for item in value):
            raise ValueError("each item must not be empty")
        return value


class GradeAnswerResult(BaseModel):
    is_correct: bool
    feedback: str
    hint: str

    @field_validator("feedback", "hint")
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be empty")
        return value


class GradeAnswersResponse(BaseModel):
    results: list[GradeAnswerResult] = Field(min_length=3, max_length=3)
    correct_count: int

    @field_validator("correct_count")
    @classmethod
    def validate_correct_count(cls, value: int) -> int:
        if not 0 <= value <= 3:
            raise ValueError("correct_count must be between 0 and 3")
        return value
