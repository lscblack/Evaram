from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    per_page: int
    pages: int

    @classmethod
    def build(cls, items: list[T], total: int, page: int, per_page: int) -> "Page[T]":
        pages = max((total + per_page - 1) // per_page, 1)
        return cls(items=items, total=total, page=page, per_page=per_page, pages=pages)


class PageParams(BaseModel):
    page: int = Field(1, ge=1)
    per_page: int = Field(20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page


class Message(BaseModel):
    detail: str


class IdResponse(BaseModel):
    id: str
    detail: str = "ok"
