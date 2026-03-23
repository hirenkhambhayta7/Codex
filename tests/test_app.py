import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DB = Path('test_codex_commerce.db').resolve()
os.environ['DATABASE_URL'] = f'sqlite:///{TEST_DB}'
os.environ['SECRET_KEY'] = 'test-secret-key'
os.environ['ADMIN_EMAIL'] = 'admin@test.local'
os.environ['ADMIN_PASSWORD'] = 'Admin123'

from app.main import app  # noqa: E402
from app.database.init_db import init_db  # noqa: E402


@pytest.fixture(autouse=True)
def setup_db():
    if TEST_DB.exists():
        TEST_DB.unlink()
    init_db()
    yield
    if TEST_DB.exists():
        TEST_DB.unlink()


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def login(client: TestClient, email: str, password: str):
    response = client.post('/auth/login', json={'email': email, 'password': password})
    assert response.status_code == 200
    return response.json()['access_token']


def test_user_cart_checkout_flow(client: TestClient):
    register = client.post('/auth/register', json={
        'email': 'shopper@test.local',
        'full_name': 'Shopper Example',
        'password': 'Shopper1',
    })
    assert register.status_code == 201

    token = login(client, 'shopper@test.local', 'Shopper1')
    headers = {'Authorization': f'Bearer {token}'}

    products = client.get('/products')
    assert products.status_code == 200
    product_id = products.json()[0]['id']

    add = client.post('/cart/add', json={'product_id': product_id, 'quantity': 2}, headers=headers)
    assert add.status_code == 200
    assert add.json()[0]['quantity'] == 2

    checkout = client.post('/orders', headers=headers)
    assert checkout.status_code == 200
    assert checkout.json()['total_amount'] > 0

    orders = client.get('/orders/user', headers=headers)
    assert orders.status_code == 200
    assert len(orders.json()) == 1


def test_admin_product_crud_and_order_access(client: TestClient):
    admin_token = login(client, 'admin@test.local', 'Admin123')
    headers = {'Authorization': f'Bearer {admin_token}'}

    create = client.post('/products', json={
        'name': 'Desk Mat',
        'description': 'Large desk mat with premium stitched edges for modern workspaces.',
        'image_url': 'https://example.com/mat.jpg',
        'price': 24.99,
        'stock': 15,
    }, headers=headers)
    assert create.status_code == 201
    product_id = create.json()['id']

    update = client.put(f'/products/{product_id}', json={
        'name': 'Desk Mat Pro',
        'description': 'Large desk mat with premium stitched edges for creative workspaces.',
        'image_url': 'https://example.com/mat-pro.jpg',
        'price': 29.99,
        'stock': 10,
    }, headers=headers)
    assert update.status_code == 200
    assert update.json()['name'] == 'Desk Mat Pro'

    orders = client.get('/orders', headers=headers)
    assert orders.status_code == 200

    delete = client.delete(f'/products/{product_id}', headers=headers)
    assert delete.status_code == 204
