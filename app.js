
const MENU = window.MENU_DATA || [];
const WHATSAPP = "40727795784";

const state = {
  category: "All",
  query: "",
  shown: 12,
  cart: JSON.parse(localStorage.getItem("desiCart") || "{}")
};

const $ = (id) => document.getElementById(id);
const grid = $("productGrid");
const loadMore = $("loadMore");
const emptyState = $("emptyState");
const resultsNote = $("resultsNote");
const searchInput = $("searchInput");
const clearSearch = $("clearSearch");
const cartDrawer = $("cartDrawer");
const cartOverlay = $("cartOverlay");
const cartItems = $("cartItems");
const cartEmpty = $("cartEmpty");
const orderForm = $("orderForm");
const cartCount = $("cartCount");
const cartTotal = $("cartTotal");
const toast = $("toast");

function saveCart(){
  localStorage.setItem("desiCart", JSON.stringify(state.cart));
}

function money(n){
  return `RON ${n}`;
}

function filteredMenu(){
  const q = state.query.trim().toLowerCase();
  return MENU.filter(item => {
    const categoryOK = state.category === "All" || item.category === state.category;
    const searchOK = !q || `${item.name} ${item.subtitle}`.toLowerCase().includes(q);
    return categoryOK && searchOK;
  });
}

function renderMenu(){
  const items = filteredMenu();
  const shown = items.slice(0, state.shown);

  grid.innerHTML = "";
  emptyState.hidden = items.length !== 0;

  if (!items.length){
    loadMore.hidden = true;
    resultsNote.textContent = "";
    return;
  }

  resultsNote.textContent = state.query
    ? `${items.length} dish${items.length === 1 ? "" : "es"} found`
    : "";

  const fragment = document.createDocumentFragment();

  shown.forEach(item => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = item.id;

    const imageBox = document.createElement("div");
    imageBox.className = "product-image";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.fetchPriority = "low";
    img.alt = item.name;
    img.src = item.img;
    img.onerror = () => {
      img.remove();
      const fallback = document.createElement("div");
      fallback.className = "image-fallback";
      fallback.textContent = "🍽️";
      imageBox.appendChild(fallback);
    };
    imageBox.appendChild(img);

    const body = document.createElement("div");
    body.className = "product-body";

    const cat = document.createElement("div");
    cat.className = "product-category";
    cat.textContent = item.category;

    const name = document.createElement("h3");
    name.className = "product-name";
    name.textContent = item.name;

    const subtitle = document.createElement("p");
    subtitle.className = "product-subtitle";
    subtitle.textContent = item.subtitle || " ";

    const bottom = document.createElement("div");
    bottom.className = "product-bottom";

    const price = document.createElement("span");
    price.className = "price";
    price.textContent = money(item.price);

    const add = document.createElement("button");
    add.className = "add-btn";
    add.type = "button";
    add.textContent = state.cart[item.id] ? `Added ×${state.cart[item.id]}` : "＋ Add";
    add.addEventListener("click", () => addToCart(item.id));

    bottom.append(price, add);
    body.append(cat, name, subtitle, bottom);
    card.append(imageBox, body);
    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
  loadMore.hidden = shown.length >= items.length;
}

function addToCart(id){
  state.cart[id] = (state.cart[id] || 0) + 1;
  saveCart();
  updateCartUI();
  renderMenu();
  showToast("Added to your order ✓");
}

function changeQty(id, delta){
  const next = (state.cart[id] || 0) + delta;
  if(next <= 0) delete state.cart[id];
  else state.cart[id] = next;
  saveCart();
  updateCartUI();
  renderMenu();
}

function cartEntries(){
  return Object.entries(state.cart)
    .map(([id,qty]) => ({item:MENU.find(x => x.id === id), qty}))
    .filter(x => x.item && x.qty > 0);
}

function updateCartUI(){
  const entries = cartEntries();
  const count = entries.reduce((sum,x) => sum + x.qty, 0);
  const total = entries.reduce((sum,x) => sum + x.item.price * x.qty, 0);

  cartCount.textContent = count;
  cartTotal.textContent = money(total);
  cartEmpty.hidden = entries.length !== 0;
  orderForm.hidden = entries.length === 0;

  cartItems.innerHTML = "";

  entries.forEach(({item,qty}) => {
    const row = document.createElement("div");
    row.className = "cart-row";

    const info = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = item.name;
    const detail = document.createElement("p");
    detail.textContent = `${money(item.price)} each • ${money(item.price * qty)}`;

    const controls = document.createElement("div");
    controls.className = "qty-controls";

    const minus = document.createElement("button");
    minus.type = "button"; minus.textContent = "−";
    minus.setAttribute("aria-label", `Decrease ${item.name}`);
    minus.onclick = () => changeQty(item.id,-1);

    const number = document.createElement("span");
    number.textContent = qty;

    const plus = document.createElement("button");
    plus.type = "button"; plus.textContent = "+";
    plus.setAttribute("aria-label", `Increase ${item.name}`);
    plus.onclick = () => changeQty(item.id,1);

    const remove = document.createElement("button");
    remove.type = "button"; remove.className = "remove-item";
    remove.textContent = "Remove";
    remove.onclick = () => {
      delete state.cart[item.id];
      saveCart(); updateCartUI(); renderMenu();
    };

    controls.append(minus,number,plus,remove);
    info.append(title,detail,controls);
    row.append(info);
    cartItems.appendChild(row);
  });
}

function openCart(){
  cartOverlay.hidden = false;
  requestAnimationFrame(() => cartDrawer.classList.add("open"));
  cartDrawer.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
  updateCartUI();
}

function closeCart(){
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
  setTimeout(() => { cartOverlay.hidden = true; }, 220);
}

function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1600);
}

function sendOrder(){
  const entries = cartEntries();
  if(!entries.length){
    showToast("Add something to your order first.");
    return;
  }

  const name = $("customerName").value.trim();
  const extra = $("extraRequest").value.trim();

  let message = "Hello Desi Cuisine! 👋\\n\\nI'd like to place a pickup order:\\n";
  entries.forEach(({item,qty}) => {
    message += `• ${qty} × ${item.name} — ${money(item.price * qty)}\\n`;
    if(item.subtitle) message += `  ${item.subtitle}\\n`;
  });

  const total = entries.reduce((sum,x) => sum + x.item.price * x.qty, 0);
  message += `\\nTotal: ${money(total)}`;
  if(name) message += `\\nName: ${name}`;
  if(extra) message += `\\n\\nAnything else:\\n${extra}`;
  message += "\\n\\nPlease confirm my order. Thank you! ❤️";

  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
}

$("openCart").addEventListener("click", openCart);
$("closeCart").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);
$("sendOrder").addEventListener("click", sendOrder);

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    state.category = tab.dataset.category;
    state.shown = 12;
    renderMenu();
  });
});

searchInput.addEventListener("input", () => {
  state.query = searchInput.value;
  state.shown = 12;
  clearSearch.style.display = state.query ? "block" : "none";
  renderMenu();
});

clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  state.query = "";
  clearSearch.style.display = "none";
  renderMenu();
  searchInput.focus();
});

loadMore.addEventListener("click", () => {
  state.shown += 12;
  renderMenu();
});

$("focusSearch").addEventListener("click", () => {
  $("menu").scrollIntoView({behavior:"smooth",block:"start"});
  setTimeout(() => searchInput.focus(), 350);
});

document.addEventListener("keydown", (e) => {
  if(e.key === "Escape") closeCart();
});

updateCartUI();
renderMenu();
