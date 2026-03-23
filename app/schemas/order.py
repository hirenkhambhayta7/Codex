from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.product import ProductResponse


class OrderItemResponse(BaseModel):
    id: int
    quantity: int
    unit_price: float
    product: ProductResponse

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    status: str
    total_amount: float
    created_at: datetime
    items: list[OrderItemResponse]

    model_config = ConfigDict(from_attributes=True)
