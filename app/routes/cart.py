from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.cart import CartAddRequest, CartItemResponse, CartUpdateRequest
from app.services.cart_service import CartService
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=list[CartItemResponse])
def get_cart(db: Session = Depends(get_db), user=Depends(get_current_user)) -> list[CartItemResponse]:
    return CartService.get_cart(db, user)


@router.post("/add", response_model=list[CartItemResponse])
def add_to_cart(
    payload: CartAddRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> list[CartItemResponse]:
    return CartService.add_to_cart(db, user, payload.product_id, payload.quantity)


@router.put("/update", response_model=list[CartItemResponse])
def update_cart(
    payload: CartUpdateRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> list[CartItemResponse]:
    return CartService.update_cart(db, user, payload.product_id, payload.quantity)


@router.delete("/remove/{product_id}", response_model=list[CartItemResponse])
def remove_from_cart(
    product_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> list[CartItemResponse]:
    return CartService.remove_from_cart(db, user, product_id)
