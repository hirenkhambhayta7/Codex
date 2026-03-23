from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.cart import CartItem
from app.models.order import Order, OrderItem
from app.models.user import User


class OrderService:
    @staticmethod
    def checkout(db: Session, user: User) -> Order:
        cart_items = (
            db.query(CartItem)
            .options(joinedload(CartItem.product))
            .filter(CartItem.user_id == user.id)
            .all()
        )
        if not cart_items:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

        total = 0.0
        order = Order(user_id=user.id, total_amount=0.0)
        db.add(order)
        db.flush()

        for item in cart_items:
            if item.quantity > item.product.stock:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock for {item.product.name}")
            item.product.stock -= item.quantity
            total += item.quantity * item.product.price
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    unit_price=item.product.price,
                )
            )
            db.delete(item)

        order.total_amount = round(total, 2)
        db.commit()
        db.refresh(order)
        return (
            db.query(Order)
            .options(joinedload(Order.items).joinedload(OrderItem.product))
            .filter(Order.id == order.id)
            .first()
        )

    @staticmethod
    def user_orders(db: Session, user: User) -> list[Order]:
        return (
            db.query(Order)
            .options(joinedload(Order.items).joinedload(OrderItem.product))
            .filter(Order.user_id == user.id)
            .order_by(Order.created_at.desc())
            .all()
        )

    @staticmethod
    def all_orders(db: Session) -> list[Order]:
        return (
            db.query(Order)
            .options(joinedload(Order.items).joinedload(OrderItem.product), joinedload(Order.user))
            .order_by(Order.created_at.desc())
            .all()
        )
