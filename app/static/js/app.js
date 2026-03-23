const state = {
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  products: [],
  cart: [],
  currentProduct: null,
  authMode: 'login',
  editingProductId: null,
};

const $ = (selector) => document.querySelector(selector);
const authHeaders = () => state.token ? { Authorization: `Bearer ${state.token}` } : {};

const endpoints = {
  products: '/products',
  register: '/auth/register',
  login: '/auth/login',
  cart: '/cart',
  addCart: '/cart/add',
  updateCart: '/cart/update',
  orders: '/orders',
  userOrders: '/orders/user',
};

function toast(message, type = 'success') {
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  $('#toast-container').appendChild(node);
  setTimeout(() => node.remove(), 2800);
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateAuthForm() {
  const name = $('#auth-name').value.trim();
  const email = $('#auth-email').value.trim();
  const password = $('#auth-password').value.trim();
  const registerMode = state.authMode === 'register';
  let valid = true;

  $('#auth-name-error').textContent = '';
  $('#auth-email-error').textContent = '';
  $('#auth-password-error').textContent = '';

  if (registerMode && name.length < 2) {
    $('#auth-name-error').textContent = 'Full name must be at least 2 characters.';
    valid = false;
  }
  if (!validateEmail(email)) {
    $('#auth-email-error').textContent = 'Enter a valid email address.';
    valid = false;
  }
  if (password.length < 6 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    $('#auth-password-error').textContent = 'Password must be 6+ chars with letters and numbers.';
    valid = false;
  }
  $('#auth-submit').disabled = !valid;
  return valid;
}

function validateProductForm() {
  const fields = {
    name: $('#product-name').value.trim().length >= 2,
    description: $('#product-description').value.trim().length >= 10,
    image: /^https?:\/\//.test($('#product-image').value.trim()),
    price: Number($('#product-price').value) > 0,
    stock: Number.isInteger(Number($('#product-stock').value)) && Number($('#product-stock').value) >= 0,
  };
  $('#product-name-error').textContent = fields.name ? '' : 'Name must be at least 2 characters.';
  $('#product-description-error').textContent = fields.description ? '' : 'Description must be at least 10 characters.';
  $('#product-image-error').textContent = fields.image ? '' : 'Image URL must start with http or https.';
  $('#product-price-error').textContent = fields.price ? '' : 'Price must be positive.';
  $('#product-stock-error').textContent = fields.stock ? '' : 'Stock must be 0 or greater.';
  $('#product-submit').disabled = !Object.values(fields).every(Boolean);
  return Object.values(fields).every(Boolean);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
    ...options,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

function setAuth(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem('token', token || '');
  localStorage.setItem('user', JSON.stringify(user));
  renderAuthState();
}

function clearAuth() {
  state.user = null;
  state.token = '';
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  state.cart = [];
  renderAuthState();
  renderCart();
}

function renderAuthState() {
  const isAuthed = Boolean(state.user && state.token);
  document.querySelectorAll('.hidden-auth').forEach(el => el.classList.toggle('hidden', !isAuthed));
  document.querySelectorAll('.hidden-admin').forEach(el => el.classList.toggle('hidden', !(isAuthed && state.user.role === 'admin')));
  $('#auth-open').textContent = isAuthed ? state.user.full_name : 'Login';
}

function productCard(product) {
  const stockClass = product.stock < 5 ? 'stock low' : 'stock';
  return `
    <article class="product-card glass fade-in">
      <img src="${product.image_url}" alt="${product.name}" />
      <h4>${product.name}</h4>
      <p>${product.description}</p>
      <div class="card-actions">
        <div>
          <div class="price">$${product.price.toFixed(2)}</div>
          <small class="${stockClass}">${product.stock} in stock</small>
        </div>
        <div class="card-actions">
          <button class="icon-btn" data-detail="${product.id}">i</button>
          <button class="btn primary" data-add="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>Add</button>
        </div>
      </div>
    </article>`;
}

function renderProducts(filter = '') {
  const grid = $('#product-grid');
  const filtered = state.products.filter((product) => {
    const term = filter.toLowerCase();
    return product.name.toLowerCase().includes(term) || product.description.toLowerCase().includes(term);
  });
  grid.innerHTML = filtered.map(productCard).join('') || '<p>No products match your search.</p>';
}

function renderCart() {
  const items = $('#cart-items');
  const total = state.cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  $('#cart-count').textContent = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  $('#cart-total').textContent = `$${total.toFixed(2)}`;
  items.innerHTML = state.cart.map(item => `
    <article class="cart-item">
      <div class="cart-row">
        <strong>${item.product.name}</strong>
        <button class="icon-btn" data-remove="${item.product.id}">✕</button>
      </div>
      <p>$${item.product.price.toFixed(2)} each</p>
      <div class="cart-row">
        <div class="quantity-control">
          <input type="number" min="1" value="${item.quantity}" data-quantity="${item.product.id}" />
          <button class="btn secondary" data-update="${item.product.id}">Update</button>
        </div>
        <strong>$${(item.product.price * item.quantity).toFixed(2)}</strong>
      </div>
    </article>
  `).join('') || '<p>Your cart is empty.</p>';
}

function renderOrders(target, orders, admin = false) {
  target.innerHTML = orders.map(order => {
    const items = admin
      ? order.items.map(item => `<li>${item.product} × ${item.quantity} @ $${item.unit_price.toFixed(2)}</li>`).join('')
      : order.items.map(item => `<li>${item.product.name} × ${item.quantity} @ $${item.unit_price.toFixed(2)}</li>`).join('');
    return `
      <article class="order-card glass">
        <div class="cart-row">
          <div>
            <p class="eyebrow">Order #${order.id}</p>
            <h4>${admin ? order.customer : order.status}</h4>
            ${admin ? `<small>${order.customer_email}</small>` : ''}
          </div>
          <strong>$${order.total_amount.toFixed(2)}</strong>
        </div>
        <ul>${items}</ul>
      </article>`;
  }).join('') || '<p>No orders yet.</p>';
}

function renderAdminProducts() {
  $('#admin-products').innerHTML = state.products.map(product => `
    <article class="admin-product-card">
      <div class="cart-row">
        <div>
          <strong>${product.name}</strong>
          <p>$${product.price.toFixed(2)} • ${product.stock} in stock</p>
        </div>
        <div class="card-actions">
          <button class="btn secondary" data-edit="${product.id}">Edit</button>
          <button class="btn ghost" data-delete="${product.id}">Delete</button>
        </div>
      </div>
    </article>
  `).join('');
}

async function loadProducts() {
  $('#loading-state').innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';
  state.products = await api(endpoints.products);
  $('#loading-state').innerHTML = '';
  renderProducts($('#search-input').value);
  renderAdminProducts();
}

async function loadCart() {
  if (!state.token) return;
  state.cart = await api(endpoints.cart);
  renderCart();
}

async function loadUserOrders() {
  if (!state.token) return;
  const orders = await api(endpoints.userOrders);
  renderOrders($('#orders-list'), orders);
}

async function loadAdminOrders() {
  if (!state.user || state.user.role !== 'admin') return;
  const orders = await api(endpoints.orders);
  renderOrders($('#admin-orders'), orders, true);
}

function switchView(view) {
  ['catalog', 'orders', 'admin'].forEach(name => {
    $(`#${name}-view`).classList.toggle('hidden', name !== view);
    const nav = $(`#${name}-nav`);
    if (nav) nav.classList.toggle('active', name === view);
  });
}

function openModal(id) { $(id).classList.remove('hidden'); }
function closeModal(id) { $(id).classList.add('hidden'); }

function fillProductModal(product) {
  state.currentProduct = product;
  $('#modal-image').src = product.image_url;
  $('#modal-name').textContent = product.name;
  $('#modal-description').textContent = product.description;
  $('#modal-price').textContent = `$${product.price.toFixed(2)}`;
  $('#modal-stock').textContent = `${product.stock} in stock`;
}

function populateProductForm(product) {
  state.editingProductId = product?.id || null;
  $('#product-id').value = product?.id || '';
  $('#product-name').value = product?.name || '';
  $('#product-description').value = product?.description || '';
  $('#product-image').value = product?.image_url || '';
  $('#product-price').value = product?.price || '';
  $('#product-stock').value = product?.stock ?? '';
  validateProductForm();
}

async function submitAuth(event) {
  event.preventDefault();
  if (!validateAuthForm()) return;
  const registerMode = state.authMode === 'register';
  try {
    if (registerMode) {
      await api(endpoints.register, {
        method: 'POST',
        body: JSON.stringify({
          full_name: $('#auth-name').value.trim(),
          email: $('#auth-email').value.trim(),
          password: $('#auth-password').value.trim(),
        }),
      });
      toast('Registration successful. Please log in.');
      state.authMode = 'login';
      $('#auth-submit').textContent = 'Login';
    } else {
      const data = await api(endpoints.login, {
        method: 'POST',
        body: JSON.stringify({
          email: $('#auth-email').value.trim(),
          password: $('#auth-password').value.trim(),
        }),
      });
      setAuth(data.user, data.access_token);
      closeModal('#auth-modal');
      await loadCart();
      await loadUserOrders();
      await loadAdminOrders();
      toast(`Welcome back, ${data.user.full_name}!`);
    }
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function addToCart(productId, quantity = 1) {
  if (!state.token) {
    openModal('#auth-modal');
    return;
  }
  try {
    state.cart = await api(endpoints.addCart, {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity }),
    });
    renderCart();
    toast('Item added to cart.');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function checkout() {
  if (!state.cart.length) {
    toast('Your cart is empty.', 'error');
    return;
  }
  try {
    await api(endpoints.orders, { method: 'POST' });
    state.cart = [];
    renderCart();
    await loadProducts();
    await loadUserOrders();
    await loadAdminOrders();
    toast('Order placed successfully.');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function submitProduct(event) {
  event.preventDefault();
  if (!validateProductForm()) return;
  const payload = {
    name: $('#product-name').value.trim(),
    description: $('#product-description').value.trim(),
    image_url: $('#product-image').value.trim(),
    price: Number($('#product-price').value),
    stock: Number($('#product-stock').value),
  };
  try {
    const url = state.editingProductId ? `${endpoints.products}/${state.editingProductId}` : endpoints.products;
    const method = state.editingProductId ? 'PUT' : 'POST';
    await api(url, { method, body: JSON.stringify(payload) });
    populateProductForm(null);
    await loadProducts();
    toast(`Product ${state.editingProductId ? 'updated' : 'created'} successfully.`);
  } catch (error) {
    toast(error.message, 'error');
  }
}

function bindEvents() {
  $('#search-input').addEventListener('input', (event) => renderProducts(event.target.value));
  $('#cart-toggle').addEventListener('click', () => $('#cart-sidebar').classList.add('open'));
  $('#cart-close').addEventListener('click', () => $('#cart-sidebar').classList.remove('open'));
  $('#checkout-btn').addEventListener('click', checkout);
  $('#catalog-nav').addEventListener('click', () => switchView('catalog'));
  $('#orders-nav').addEventListener('click', async () => { switchView('orders'); await loadUserOrders(); });
  $('#admin-nav').addEventListener('click', async () => { switchView('admin'); await loadAdminOrders(); });
  $('#auth-open').addEventListener('click', () => state.user ? switchView(state.user.role === 'admin' ? 'admin' : 'orders') : openModal('#auth-modal'));
  $('#logout-btn').addEventListener('click', () => { clearAuth(); toast('Logged out.'); switchView('catalog'); });
  $('#modal-close').addEventListener('click', () => closeModal('#product-modal'));
  $('#auth-close').addEventListener('click', () => closeModal('#auth-modal'));
  $('#modal-add').addEventListener('click', () => addToCart(state.currentProduct.id));
  $('#auth-form').addEventListener('submit', submitAuth);
  $('#product-form').addEventListener('submit', submitProduct);
  ['#auth-name', '#auth-email', '#auth-password'].forEach(selector => $(selector).addEventListener('input', validateAuthForm));
  ['#product-name', '#product-description', '#product-image', '#product-price', '#product-stock'].forEach(selector => $(selector).addEventListener('input', validateProductForm));
  $('#login-tab').addEventListener('click', () => setAuthMode('login'));
  $('#register-tab').addEventListener('click', () => setAuthMode('register'));

  document.body.addEventListener('click', async (event) => {
    const detailId = event.target.dataset.detail;
    const addId = event.target.dataset.add;
    const updateId = event.target.dataset.update;
    const removeId = event.target.dataset.remove;
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (detailId) {
      const product = state.products.find(item => item.id === Number(detailId));
      fillProductModal(product);
      openModal('#product-modal');
    }
    if (addId) addToCart(Number(addId));
    if (updateId) {
      const quantity = Number(document.querySelector(`[data-quantity="${updateId}"]`).value);
      try {
        state.cart = await api(endpoints.updateCart, {
          method: 'PUT',
          body: JSON.stringify({ product_id: Number(updateId), quantity }),
        });
        renderCart();
        toast('Cart updated.');
      } catch (error) { toast(error.message, 'error'); }
    }
    if (removeId) {
      try {
        state.cart = await api(`/cart/remove/${removeId}`, { method: 'DELETE' });
        renderCart();
        toast('Item removed.');
      } catch (error) { toast(error.message, 'error'); }
    }
    if (editId) {
      const product = state.products.find(item => item.id === Number(editId));
      populateProductForm(product);
      switchView('admin');
    }
    if (deleteId) {
      try {
        await api(`/products/${deleteId}`, { method: 'DELETE' });
        await loadProducts();
        toast('Product deleted.');
      } catch (error) { toast(error.message, 'error'); }
    }
  });
}

function setAuthMode(mode) {
  state.authMode = mode;
  const register = mode === 'register';
  $('#login-tab').classList.toggle('active', !register);
  $('#register-tab').classList.toggle('active', register);
  document.querySelectorAll('.register-only').forEach(el => el.classList.toggle('hidden', !register));
  $('#auth-submit').textContent = register ? 'Register' : 'Login';
  validateAuthForm();
}

async function init() {
  bindEvents();
  renderAuthState();
  setAuthMode('login');
  await loadProducts();
  if (state.token) {
    try {
      await Promise.all([loadCart(), loadUserOrders(), loadAdminOrders()]);
    } catch {
      clearAuth();
    }
  }
}

init();
