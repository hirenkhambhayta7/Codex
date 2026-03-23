from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.order import OrderResponse
from app.services.order_service import OrderService
from app.utils.dependencies import get_admin_user, get_current_user

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderResponse)
def checkout(db: Session = Depends(get_db), user=Depends(get_current_user)) -> OrderResponse:
    return OrderService.checkout(db, user)


@router.get("/user", response_model=list[OrderResponse])
def user_orders(db: Session = Depends(get_db), user=Depends(get_current_user)) -> list[OrderResponse]:
    return OrderService.user_orders(db, user)


@router.get("", response_model=list[dict[str, Any]])
def all_orders(db: Session = Depends(get_db), _: object = Depends(get_admin_user)) -> list[dict[str, Any]]:
    orders = OrderService.all_orders(db)
    return [
        {
            "id": order.id,
            "status": order.status,
            "total_amount": order.total_amount,
            "created_at": order.created_at,
            "customer": order.user.full_name,
            "customer_email": order.user.email,
            "items": [
                {
                    "id": item.id,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "product": item.product.name,
                }
                for item in order.items
            ],
        }
        for order in orders
    ]
