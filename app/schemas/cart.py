from pydantic import BaseModel, ConfigDict, Field

from app.schemas.product import ProductResponse


class CartAddRequest(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)


class CartUpdateRequest(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)


class CartItemResponse(BaseModel):
    id: int
    quantity: int
    product: ProductResponse

    model_config = ConfigDict(from_attributes=True)
