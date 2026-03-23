import os

from sqlalchemy.orm import Session

from app.database.base import Base
from app.database.session import engine
from app.models.cart import CartItem
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.utils.security import get_password_hash


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        seed_admin(db)
        seed_products(db)


def seed_admin(db: Session) -> None:
    admin_email = os.getenv("ADMIN_EMAIL", "admin@codexcommerce.local")
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin123")
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        db.add(
            User(
                email=admin_email,
                full_name="Store Admin",
                password_hash=get_password_hash(admin_password),
                role="admin",
            )
        )
        db.commit()


def seed_products(db: Session) -> None:
    if db.query(Product).count() > 0:
        return

    products = [
        Product(
            name="Aurora Lamp",
            description="Ambient smart lamp with three brightness modes and warm glow diffusion.",
            image_url="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
            price=79.99,
            stock=12,
        ),
        Product(
            name="Orbit Headphones",
            description="Wireless over-ear headphones with 32-hour battery life and immersive sound.",
            image_url="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
            price=129.0,
            stock=20,
        ),
        Product(
            name="Terra Bottle",
            description="Insulated stainless steel bottle designed for daily hydration and travel.",
            image_url="https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80",
            price=34.5,
            stock=35,
        ),
    ]
    db.add_all(products)
    db.commit()
