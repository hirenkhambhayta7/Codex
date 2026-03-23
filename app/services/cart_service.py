from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User


class CartService:
    @staticmethod
    def get_cart(db: Session, user: User) -> list[CartItem]:
        return (
            db.query(CartItem)
            .options(joinedload(CartItem.product))
            .filter(CartItem.user_id == user.id)
            .all()
        )

    @staticmethod
    def add_to_cart(db: Session, user: User, product_id: int, quantity: int) -> list[CartItem]:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        existing = (
            db.query(CartItem)
            .filter(CartItem.user_id == user.id, CartItem.product_id == product_id)
            .first()
        )
        new_quantity = quantity + (existing.quantity if existing else 0)
        if new_quantity > product.stock:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")
        if existing:
            existing.quantity = new_quantity
        else:
            db.add(CartItem(user_id=user.id, product_id=product_id, quantity=quantity))
        db.commit()
        return CartService.get_cart(db, user)

    @staticmethod
    def update_cart(db: Session, user: User, product_id: int, quantity: int) -> list[CartItem]:
        item = db.query(CartItem).filter(CartItem.user_id == user.id, CartItem.product_id == product_id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
        if quantity > item.product.stock:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")
        item.quantity = quantity
        db.commit()
        return CartService.get_cart(db, user)

    @staticmethod
    def remove_from_cart(db: Session, user: User, product_id: int) -> list[CartItem]:
        item = db.query(CartItem).filter(CartItem.user_id == user.id, CartItem.product_id == product_id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
        db.delete(item)
        db.commit()
        return CartService.get_cart(db, user)
