"""Shared Pydantic schema helpers."""

from __future__ import annotations

from decimal import Decimal
from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, PlainSerializer

T = TypeVar("T")

#: Decimal serialised as a string ("150000.00") so no precision is lost in JSON.
MoneyOut = Annotated[Decimal, PlainSerializer(lambda v: format(v, "f"), return_type=str)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class Message(BaseModel):
    detail: str


class CurrencyAmount(BaseModel):
    currency: str
    amount: MoneyOut
