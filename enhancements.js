/* ============================================================
   KEYNOVA — MEJORAS SEGURAS SOBRE EL DISEÑO ORIGINAL
   Este archivo añade funciones SIN reemplazar style.css.
============================================================ */

/* ============================================================
   🔐 CONTRASEÑA DEL PANEL ADMINISTRATIVO
   CAMBIA ÚNICAMENTE EL TEXTO ENTRE COMILLAS.
   Ejemplo: const ADMIN_PASSWORD = "MiClaveNueva123";

   IMPORTANTE: al ser una web estática, esta contraseña puede
   verse inspeccionando el JavaScript. Para seguridad real hace
   falta un backend.
============================================================ */
const ADMIN_PASSWORD = "1234";

/* ================= CONFIGURACIÓN ================= */
const KN_SETTINGS_KEY = "keynova_settings_v3";
const KN_SESSIONS_KEY = "keynova_admin_sessions_v3";
const KN_HISTORY_KEY = "keynova_admin_history_v3";
const KN_LOGIN_COUNT_KEY = "keynova_admin_login_count_v3";

const KN_DEFAULTS = {
    storeName: "KeyNova",
    whatsapp: "",
    offerText: "OFERTAS LIMITADAS",
    heroText: "Compra licencias digitales a precios especiales y disfruta de una experiencia rápida y sencilla.",
    serviceTime: "20–35 minutos",
    paymentMethod: "PayPal",
    paymentSplit: "50% al iniciar y 50% al finalizar",
    windows: { oldPrice: 6.00, price: 2.99, visible: true },
    office: { oldPrice: 6.00, price: 2.99, visible: true },
    bundle: { oldPrice: 6.00, price: 3.99, visible: true }
};

let knCurrentSessionId = null;
let knHeartbeatTimer = null;
let knAdminAuthenticated = false;

function knClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function knGetSettings() {
    const saved = JSON.parse(localStorage.getItem(KN_SETTINGS_KEY) || "null");
    const base = knClone(KN_DEFAULTS);
    if (!saved) return base;

    return {
        ...base,
        ...saved,
        windows: { ...base.windows, ...(saved.windows || {}) },
        office: { ...base.office, ...(saved.office || {}) },
        bundle: { ...base.bundle, ...(saved.bundle || {}) }
    };
}

function knSaveSettings(settings) {
    localStorage.setItem(KN_SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem("storeName", settings.storeName || "KeyNova");
    localStorage.setItem("whatsapp", settings.whatsapp || "");
    knApplyStoreSettings();
}

function knMoney(value) {
    return Number(value || 0).toFixed(2);
}

function knDiscount(oldPrice, price) {
    oldPrice = Number(oldPrice);
    price = Number(price);
    if (!oldPrice || oldPrice <= price) return "OFERTA";
    return `-${Math.round((1 - price / oldPrice) * 100)}%`;
}

function knToast(message) {
    if (typeof showNotification === "function") {
        showNotification(message);
        return;
    }
    alert(message);
}

/* ================= APLICAR PRECIOS Y TEXTOS ================= */
function knApplyStoreSettings() {
    const s = knGetSettings();

    document.querySelectorAll(".logo-text strong").forEach(el => el.textContent = s.storeName);
    const footerName = document.querySelector(".footer-brand strong");
    if (footerName) footerName.textContent = s.storeName;

    const badge = document.querySelector(".offer-badge");
    if (badge) badge.lastChild.textContent = ` ${s.offerText}`;

    const heroParagraph = document.querySelector(".hero-content > p");
    if (heroParagraph) heroParagraph.textContent = s.heroText;

    const cards = document.querySelectorAll(".product-card");
    knUpdateProductCard(cards[0], "Windows", s.windows);
    knUpdateProductCard(cards[1], "Microsoft Office", s.office);

    const bundle = document.querySelector(".bundle-section");
    if (bundle) {
        bundle.style.display = s.bundle.visible ? "" : "none";
        const oldPrice = bundle.querySelector(".bundle-price > span");
        const newPrice = bundle.querySelector(".bundle-price > strong");
        const saving = bundle.querySelector(".bundle-saving");
        const circle = bundle.querySelector(".bundle-circle");
        if (oldPrice) oldPrice.textContent = `$${knMoney(s.bundle.oldPrice)}`;
        if (newPrice) newPrice.innerHTML = `<small>$</small>${knMoney(s.bundle.price)}`;
        if (saving) saving.textContent = `Ahorras $${knMoney(Math.max(0, s.bundle.oldPrice - s.bundle.price))}`;
        if (circle) circle.textContent = knMoney(s.bundle.price);
    }

    const windowsFloat = document.querySelector(".windows-float strong");
    const officeFloat = document.querySelector(".office-float strong");
    if (windowsFloat) windowsFloat.textContent = `$${knMoney(s.windows.price)}`;
    if (officeFloat) officeFloat.textContent = `$${knMoney(s.office.price)}`;
}

function knUpdateProductCard(card, cartName, product) {
    if (!card) return;
    card.style.display = product.visible ? "" : "none";

    const oldPrice = card.querySelector(".old-price");
    const currentPrice = card.querySelector(".current-price");
    const saving = card.querySelector(".saving");
    const discount = card.querySelector(".discount");
    const button = card.querySelector(".product-button");

    if (oldPrice) oldPrice.textContent = `$${knMoney(product.oldPrice)}`;
    if (currentPrice) currentPrice.innerHTML = `<small>$</small>${knMoney(product.price)}`;
    if (saving) saving.textContent = `Ahorras $${knMoney(Math.max(0, product.oldPrice - product.price))}`;
    if (discount) discount.textContent = knDiscount(product.oldPrice, product.price);
    if (button) button.setAttribute("onclick", `addToCart('${cartName}', ${Number(product.price)})`);
}

/* ================= CARRITO / PACK ================= */
window.addBundle = function () {
    const price = Number(knGetSettings().bundle.price);
    if (cart.some(item => item.name === "Windows + Office")) {
        alert("El pack ya está en tu carrito.");
        return;
    }
    cart.push({ name: "Windows + Office", price });
    updateCart();
    knToast("Pack Windows + Office añadido ✓");
};

/* ================= MENSAJE DE PEDIDO ================= */
window.createOrderMessage = function () {
    const s = knGetSettings();
    let total = 0;
    const products = cart.map(item => {
        total += Number(item.price);
        return `• ${item.name} — $${knMoney(item.price)}`;
    }).join("\n");

    const firstPayment = total / 2;

    return `🛒 NUEVO PEDIDO — ${s.storeName}\n\n${products}\n\n💰 TOTAL: $${knMoney(total)}\n💳 Método de pago: ${s.paymentMethod}\n✅ 50% al iniciar: $${knMoney(firstPayment)}\n✅ 50% al finalizar: $${knMoney(total - firstPayment)}\n\n🔧 Servicio remoto\n⏱️ Duración aproximada: ${s.serviceTime}\n🔐 El cliente mantiene el control de la conexión y puede finalizarla cuando quiera.\n\nPedido generado desde KeyNova.`;
};

/* ================= SECCIÓN CÓMO FUNCIONA ================= */
function knInjectHowItWorks() {
    if (document.getElementById("como-funciona")) return;

    const reviews = document.getElementById("resenas");
    if (!reviews) return;

    const section = document.createElement("section");
    section.id = "como-funciona";
    section.className = "kn-how-section";
    section.innerHTML = `
        <div class="section-title">
            <span>◆ SERVICIO REMOTO</span>
            <h2>¿Cómo funciona el <strong>servicio?</strong></h2>
            <p>Un proceso claro, remoto y bajo tu control.</p>
        </div>

        <div class="kn-how-grid">
            <article class="kn-how-card">
                <span class="kn-step">01</span>
                <div class="kn-how-icon">🛒</div>
                <h3>Realizas tu pedido</h3>
                <p>Selecciona el servicio que necesitas y completa tu pedido. El pago se realiza únicamente mediante <strong>PayPal</strong>.</p>
            </article>

            <article class="kn-how-card">
                <span class="kn-step">02</span>
                <div class="kn-how-icon">📅</div>
                <h3>Coordinamos la instalación</h3>
                <p>Una vez confirmado el primer pago, coordinamos contigo el momento para realizar el servicio de forma remota.</p>
            </article>

            <article class="kn-how-card">
                <span class="kn-step">03</span>
                <div class="kn-how-icon">🖥️</div>
                <h3>Tú tienes el control</h3>
                <p>Te proporcionamos el programa necesario y un tutorial sencillo. Podrás <strong>ver en tiempo real</strong> lo que se realiza y finalizar la conexión cuando quieras.</p>
            </article>

            <article class="kn-how-card">
                <span class="kn-step">04</span>
                <div class="kn-how-icon">🔧</div>
                <h3>Instalación remota</h3>
                <p>El servicio se realiza directamente en tu computadora mediante conexión remota. No necesitas desplazarte ni llevar tu equipo.</p>
            </article>
        </div>

        <div class="kn-service-summary">
            <div><span>⏱️</span><small>Duración aproximada</small><strong data-kn-service-time>20–35 minutos</strong></div>
            <div><span>💳</span><small>Método de pago</small><strong>PayPal</strong></div>
            <div><span>🌐</span><small>Modalidad</small><strong>100% remota</strong></div>
            <div><span>🔐</span><small>Control</small><strong>Tú decides cuándo finalizar</strong></div>
        </div>

        <div class="kn-privacy-note">
            <strong>🔐 Tu privacidad y control son importantes.</strong>
            <p>Nunca compartas contraseñas, códigos de acceso ni información personal innecesaria durante una sesión remota.</p>
        </div>
    `;

    reviews.parentNode.insertBefore(section, reviews);

    const nav = document.querySelector("nav");
    if (nav && !nav.querySelector('a[href="#como-funciona"]')) {
        const link = document.createElement("a");
        link.href = "#como-funciona";
        link.textContent = "Cómo funciona";
        const reviewsLink = nav.querySelector('a[href="#resenas"]');
        nav.insertBefore(link, reviewsLink || null);
    }

    knRefreshHowInfo();
}

function knRefreshHowInfo() {
    const s = knGetSettings();
    document.querySelectorAll("[data-kn-service-time]").forEach(el => el.textContent = s.serviceTime);
}

/* ================= AVISO DE PAGO EN CHECKOUT ================= */
function knInjectCheckoutNotice() {
    const modal = document.querySelector(".checkout-modal");
    if (!modal || modal.querySelector(".kn-payment-notice")) return;

    const notice = document.createElement("div");
    notice.className = "kn-payment-notice";
    notice.innerHTML = `
        <strong>💳 Pago dividido</strong>
        <span>50% al iniciar el servicio + 50% al finalizar.</span>
        <small>Método de pago: PayPal.</small>
    `;

    const firstAction = modal.querySelector(".whatsapp-button");
    modal.insertBefore(notice, firstAction || null);
}

/* ================= PANEL ADMIN ================= */
function knBuildAdminPanel() {
    const overlay = document.getElementById("adminOverlay");
    if (!overlay) return;

    overlay.innerHTML = `
        <div class="modal kn-admin-modal" onclick="event.stopPropagation()">
            <button class="close-button" onclick="closeAdmin()">×</button>

            <div id="knAdminLogin" class="kn-admin-login">
                <div class="kn-admin-logo">K</div>
                <span class="kn-admin-kicker">KEYNOVA CONTROL</span>
                <h2>Panel administrativo</h2>
                <p>Gestiona precios, tienda, reseñas y sesiones.</p>

                <label>Nombre de esta sesión</label>
                <input id="knSessionName" type="text" maxlength="28" placeholder="Ej: PC Principal">

                <label>Contraseña</label>
                <input id="knAdminPassword" type="password" placeholder="Contraseña del panel" onkeydown="if(event.key==='Enter') knAdminLogin()">

                <button class="kn-admin-primary" onclick="knAdminLogin()">Entrar al panel →</button>
                <small>La contraseña no se cambia desde aquí. Se cambia únicamente en <code>enhancements.js</code>.</small>
            </div>

            <div id="knAdminDashboard" class="kn-admin-dashboard" hidden>
                <div class="kn-admin-header">
                    <div>
                        <span class="kn-admin-kicker">KEYNOVA CONTROL</span>
                        <h2>Administración</h2>
                        <p id="knAdminSessionLabel">Sesión activa</p>
                    </div>
                    <button class="kn-admin-logout" onclick="knAdminLogout()">Cerrar sesión</button>
                </div>

                <div class="kn-admin-stats">
                    <div><span>🟢</span><small>Sesiones activas</small><strong id="knActiveSessions">0</strong></div>
                    <div><span>🔑</span><small>Ingresos al panel</small><strong id="knLoginCount">0</strong></div>
                    <div><span>⭐</span><small>Reseñas guardadas</small><strong id="knReviewStat">0</strong></div>
                    <div><span>🛒</span><small>Productos en carrito</small><strong id="knCartStat">0</strong></div>
                </div>

                <div class="kn-admin-tabs">
                    <button class="active" data-tab="prices" onclick="knSwitchAdminTab('prices', this)">💲 Precios</button>
                    <button data-tab="store" onclick="knSwitchAdminTab('store', this)">🏪 Tienda</button>
                    <button data-tab="sessions" onclick="knSwitchAdminTab('sessions', this)">👥 Sesiones</button>
                    <button data-tab="maintenance" onclick="knSwitchAdminTab('maintenance', this)">🛠️ Mantenimiento</button>
                </div>

                <section class="kn-admin-tab active" id="knTab-prices">
                    <div class="kn-admin-section-head">
                        <div><h3>Precios y visibilidad</h3><p>Cambia los precios que aparecen en la tienda.</p></div>
                        <button class="kn-admin-primary small" onclick="knSavePrices()">Guardar precios</button>
                    </div>
                    <div id="knPriceEditor" class="kn-price-editor"></div>
                </section>

                <section class="kn-admin-tab" id="knTab-store">
                    <div class="kn-admin-section-head"><div><h3>Configuración de tienda</h3><p>Textos y datos principales.</p></div></div>
                    <div class="kn-form-grid">
                        <label>Nombre de la tienda<input id="knStoreName" type="text"></label>
                        <label>WhatsApp<input id="knWhatsapp" type="text" placeholder="593999999999"></label>
                        <label>Texto de oferta<input id="knOfferText" type="text"></label>
                        <label>Duración del servicio<input id="knServiceTime" type="text"></label>
                        <label class="full">Descripción principal<textarea id="knHeroText" maxlength="220"></textarea></label>
                    </div>
                    <div class="kn-fixed-info">
                        <strong>💳 Condiciones del pedido</strong>
                        <span>PayPal · 50% al iniciar · 50% al finalizar</span>
                        <small>Estas condiciones también aparecen automáticamente en el mensaje del pedido.</small>
                    </div>
                    <button class="kn-admin-primary" onclick="knSaveStoreSettings()">Guardar configuración</button>
                </section>

                <section class="kn-admin-tab" id="knTab-sessions">
                    <div class="kn-admin-section-head"><div><h3>Sesiones del panel</h3><p>Puedes cerrar otra sesión detectada en este navegador.</p></div></div>
                    <div class="kn-session-warning">ℹ️ En una web estática, las sesiones pueden sincronizarse entre pestañas del mismo navegador. Para ver y cerrar sesiones de otros dispositivos hace falta un servidor.</div>
                    <div id="knSessionList" class="kn-session-list"></div>
                    <h4 class="kn-history-title">Últimos ingresos</h4>
                    <div id="knLoginHistory" class="kn-history-list"></div>
                </section>

                <section class="kn-admin-tab" id="knTab-maintenance">
                    <div class="kn-admin-section-head"><div><h3>Mantenimiento</h3><p>Herramientas para administrar datos locales.</p></div></div>
                    <div class="kn-maintenance-grid">
                        <button onclick="knClearReviews()"><strong>🗑️ Eliminar reseñas</strong><span>Borra todas las reseñas guardadas.</span></button>
                        <button onclick="knResetStore()"><strong>↺ Restablecer tienda</strong><span>Vuelve a precios y textos predeterminados.</span></button>
                    </div>
                </section>
            </div>
        </div>
    `;
}

/* Abre el panel sin tocar el diseño principal. */
window.openAdmin = function () {
    const overlay = document.getElementById("adminOverlay");
    if (!overlay) return;

    overlay.classList.add("show");
    document.body.style.overflow = "hidden";

    if (!knAdminAuthenticated) {
        document.getElementById("knAdminLogin").hidden = false;
        document.getElementById("knAdminDashboard").hidden = true;
        setTimeout(() => document.getElementById("knAdminPassword")?.focus(), 50);
    } else {
        knShowAdminDashboard();
    }
};

window.closeAdmin = function () {
    document.getElementById("adminOverlay")?.classList.remove("show");
    document.body.style.overflow = "";
};

window.closeAdminOutside = function (event) {
    if (event.target.id === "adminOverlay") closeAdmin();
};

window.knAdminLogin = function () {
    const password = document.getElementById("knAdminPassword")?.value || "";
    const name = (document.getElementById("knSessionName")?.value || "").trim() || "Administrador";

    if (password !== ADMIN_PASSWORD) {
        knToast("❌ Contraseña incorrecta");
        const input = document.getElementById("knAdminPassword");
        input?.classList.add("kn-shake");
        setTimeout(() => input?.classList.remove("kn-shake"), 350);
        return;
    }

    knAdminAuthenticated = true;
    document.getElementById("knAdminPassword").value = "";
    knStartAdminSession(name);
    knShowAdminDashboard();
    knToast("✅ Sesión administrativa iniciada");
};

function knShowAdminDashboard() {
    document.getElementById("knAdminLogin").hidden = true;
    document.getElementById("knAdminDashboard").hidden = false;
    knFillAdminForms();
    knRenderAdminStats();
    knRenderSessions();
}

window.knAdminLogout = function () {
    knEndCurrentSession();
    knAdminAuthenticated = false;
    closeAdmin();
    knToast("Sesión administrativa cerrada");
};

window.knSwitchAdminTab = function (name, button) {
    document.querySelectorAll(".kn-admin-tabs button").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".kn-admin-tab").forEach(tab => tab.classList.remove("active"));
    button?.classList.add("active");
    document.getElementById(`knTab-${name}`)?.classList.add("active");
    if (name === "sessions") knRenderSessions();
};

function knFillAdminForms() {
    const s = knGetSettings();
    document.getElementById("knStoreName").value = s.storeName;
    document.getElementById("knWhatsapp").value = s.whatsapp;
    document.getElementById("knOfferText").value = s.offerText;
    document.getElementById("knServiceTime").value = s.serviceTime;
    document.getElementById("knHeroText").value = s.heroText;

    const editor = document.getElementById("knPriceEditor");
    editor.innerHTML = [
        ["windows", "Windows", s.windows],
        ["office", "Microsoft Office", s.office],
        ["bundle", "Windows + Office", s.bundle]
    ].map(([key, label, p]) => `
        <div class="kn-price-row">
            <div><strong>${label}</strong><small>${key === "bundle" ? "Pack especial" : "Producto individual"}</small></div>
            <label>Precio anterior<input id="kn-${key}-old" type="number" min="0" step="0.01" value="${knMoney(p.oldPrice)}"></label>
            <label>Precio actual<input id="kn-${key}-price" type="number" min="0" step="0.01" value="${knMoney(p.price)}"></label>
            <label class="kn-visible-check"><input id="kn-${key}-visible" type="checkbox" ${p.visible ? "checked" : ""}> Visible</label>
        </div>
    `).join("");
}

window.knSavePrices = function () {
    const s = knGetSettings();
    ["windows", "office", "bundle"].forEach(key => {
        s[key].oldPrice = Math.max(0, Number(document.getElementById(`kn-${key}-old`).value || 0));
        s[key].price = Math.max(0, Number(document.getElementById(`kn-${key}-price`).value || 0));
        s[key].visible = document.getElementById(`kn-${key}-visible`).checked;
    });
    knSaveSettings(s);
    knFillAdminForms();
    knToast("💲 Precios actualizados");
};

window.knSaveStoreSettings = function () {
    const s = knGetSettings();
    s.storeName = document.getElementById("knStoreName").value.trim() || "KeyNova";
    s.whatsapp = document.getElementById("knWhatsapp").value.trim();
    s.offerText = document.getElementById("knOfferText").value.trim() || KN_DEFAULTS.offerText;
    s.serviceTime = document.getElementById("knServiceTime").value.trim() || KN_DEFAULTS.serviceTime;
    s.heroText = document.getElementById("knHeroText").value.trim() || KN_DEFAULTS.heroText;
    knSaveSettings(s);
    knRefreshHowInfo();
    knToast("🏪 Configuración guardada");
};

window.knClearReviews = function () {
    if (!confirm("¿Seguro que quieres eliminar todas las reseñas?")) return;
    localStorage.removeItem("reviews");
    if (typeof renderReviews === "function") renderReviews();
    knRenderAdminStats();
    knToast("🗑️ Reseñas eliminadas");
};

window.knResetStore = function () {
    if (!confirm("¿Restablecer precios y textos de la tienda?")) return;
    localStorage.setItem(KN_SETTINGS_KEY, JSON.stringify(KN_DEFAULTS));
    localStorage.setItem("storeName", KN_DEFAULTS.storeName);
    localStorage.setItem("whatsapp", KN_DEFAULTS.whatsapp);
    knApplyStoreSettings();
    knRefreshHowInfo();
    knFillAdminForms();
    knToast("↺ Tienda restablecida");
};

/* ================= SESIONES ADMIN ================= */
function knReadSessions() {
    return JSON.parse(localStorage.getItem(KN_SESSIONS_KEY) || "[]");
}

function knWriteSessions(sessions) {
    localStorage.setItem(KN_SESSIONS_KEY, JSON.stringify(sessions));
}

function knActiveSessions() {
    const now = Date.now();
    return knReadSessions().filter(s => !s.revoked && now - s.lastSeen < 20000);
}

function knStartAdminSession(name) {
    knCurrentSessionId = `kn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const sessions = knReadSessions().filter(s => now - s.lastSeen < 86400000);
    sessions.push({ id: knCurrentSessionId, name, created: now, lastSeen: now, revoked: false });
    knWriteSessions(sessions);

    const count = Number(localStorage.getItem(KN_LOGIN_COUNT_KEY) || 0) + 1;
    localStorage.setItem(KN_LOGIN_COUNT_KEY, String(count));

    const history = JSON.parse(localStorage.getItem(KN_HISTORY_KEY) || "[]");
    history.unshift({ name, at: now });
    localStorage.setItem(KN_HISTORY_KEY, JSON.stringify(history.slice(0, 30)));

    document.getElementById("knAdminSessionLabel").textContent = `${name} · sesión activa`;

    clearInterval(knHeartbeatTimer);
    knHeartbeatTimer = setInterval(knHeartbeat, 5000);
    knHeartbeat();
}

function knHeartbeat() {
    if (!knCurrentSessionId) return;
    const sessions = knReadSessions();
    const current = sessions.find(s => s.id === knCurrentSessionId);

    if (!current || current.revoked) {
        clearInterval(knHeartbeatTimer);
        knCurrentSessionId = null;
        knAdminAuthenticated = false;
        closeAdmin();
        knToast("⛔ Esta sesión fue cerrada desde otro panel");
        return;
    }

    current.lastSeen = Date.now();
    knWriteSessions(sessions);
    knRenderAdminStats();
}

function knEndCurrentSession() {
    clearInterval(knHeartbeatTimer);
    if (!knCurrentSessionId) return;
    const sessions = knReadSessions();
    const current = sessions.find(s => s.id === knCurrentSessionId);
    if (current) current.revoked = true;
    knWriteSessions(sessions);
    knCurrentSessionId = null;
}

window.knRevokeSession = function (id) {
    const sessions = knReadSessions();
    const target = sessions.find(s => s.id === id);
    if (!target) return;
    target.revoked = true;
    knWriteSessions(sessions);
    knRenderSessions();
    knRenderAdminStats();
    knToast("⛔ Sesión cerrada");
};

function knRenderSessions() {
    const list = document.getElementById("knSessionList");
    if (!list) return;

    const active = knActiveSessions();
    list.innerHTML = active.length ? active.map(s => `
        <div class="kn-session-row">
            <span class="kn-session-dot"></span>
            <div><strong>${escapeHTML(s.name)}</strong><small>Inició: ${new Date(s.created).toLocaleString("es-EC")}</small></div>
            <span class="kn-live-pill">ACTIVA</span>
            ${s.id === knCurrentSessionId ? `<em>Esta sesión</em>` : `<button onclick="knRevokeSession('${s.id}')">Cerrar sesión</button>`}
        </div>
    `).join("") : `<div class="kn-empty">No hay otras sesiones activas.</div>`;

    const history = JSON.parse(localStorage.getItem(KN_HISTORY_KEY) || "[]");
    const historyEl = document.getElementById("knLoginHistory");
    if (historyEl) {
        historyEl.innerHTML = history.length ? history.slice(0, 10).map(item => `
            <div><strong>${escapeHTML(item.name)}</strong><span>${new Date(item.at).toLocaleString("es-EC")}</span></div>
        `).join("") : `<div class="kn-empty">Todavía no hay historial.</div>`;
    }
}

function knRenderAdminStats() {
    const active = knActiveSessions().length;
    const reviews = JSON.parse(localStorage.getItem("reviews") || "[]").length;
    const logins = Number(localStorage.getItem(KN_LOGIN_COUNT_KEY) || 0);

    const activeEl = document.getElementById("knActiveSessions");
    const loginEl = document.getElementById("knLoginCount");
    const reviewEl = document.getElementById("knReviewStat");
    const cartEl = document.getElementById("knCartStat");

    if (activeEl) activeEl.textContent = active;
    if (loginEl) loginEl.textContent = logins;
    if (reviewEl) reviewEl.textContent = reviews;
    if (cartEl) cartEl.textContent = Array.isArray(cart) ? cart.length : 0;
}

window.addEventListener("storage", event => {
    if (event.key === KN_SESSIONS_KEY) {
        knHeartbeat();
        knRenderSessions();
    }
    if (event.key === KN_SETTINGS_KEY) {
        knApplyStoreSettings();
        knRefreshHowInfo();
    }
});

window.addEventListener("beforeunload", () => {
    if (knCurrentSessionId) {
        const sessions = knReadSessions();
        const current = sessions.find(s => s.id === knCurrentSessionId);
        if (current) {
            current.revoked = true;
            knWriteSessions(sessions);
        }
    }
});

/* ================= INICIO ================= */
document.addEventListener("DOMContentLoaded", () => {
    knInjectHowItWorks();
    knInjectCheckoutNotice();
    knBuildAdminPanel();
    knApplyStoreSettings();
});
