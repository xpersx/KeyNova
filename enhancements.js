/* ============================================================
   KEYNOVA
   ------------------------------------------------------------
============================================================ */

const ADMIN_PASSWORD = "Hhttpqrreuzu1.";

/* ============================================================
   ⚙️ CONFIGURACIÓN GENERAL
   Aquí están los valores predeterminados de la tienda.
============================================================ */

const KEYNOVA_CONFIG_KEY = "keynova_settings_v4";
const KEYNOVA_SESSIONS_KEY = "keynova_admin_sessions_v4";
const KEYNOVA_LOGIN_COUNT_KEY = "keynova_admin_login_count_v4";

const KEYNOVA_DEFAULTS = {
    storeName: "KeyNova",
    whatsapp: "0981101365",
    offerText: "OFERTAS LIMITADAS",
    heroText: "Compra licencias digitales a precios especiales y disfruta de una experiencia rápida y sencilla.",
    serviceTime: "20–35 minutos",
    paymentMethod: "PayPal",
    paymentSplit: "50% al iniciar y 50% al finalizar",

    windows: {
        oldPrice: 6.00,
        price: 2.99,
        visible: true
    },

    office: {
        oldPrice: 6.00,
        price: 2.99,
        visible: true
    },

    bundle: {
        oldPrice: 6.00,
        price: 3.99,
        visible: true
    }
};

let keynovaSessionId = null;
let keynovaHeartbeat = null;
let keynovaAdminOpen = false;

/* ============================================================
   🧰 UTILIDADES
============================================================ */

function keynovaClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function keynovaGetSettings() {
    let saved = null;

    try {
        saved = JSON.parse(localStorage.getItem(KEYNOVA_CONFIG_KEY) || "null");
    } catch (error) {
        saved = null;
    }

    const base = keynovaClone(KEYNOVA_DEFAULTS);

    if (!saved) {
        return base;
    }

    return {
        ...base,
        ...saved,
        windows: { ...base.windows, ...(saved.windows || {}) },
        office: { ...base.office, ...(saved.office || {}) },
        bundle: { ...base.bundle, ...(saved.bundle || {}) }
    };
}

function keynovaSaveSettings(settings) {
    localStorage.setItem(KEYNOVA_CONFIG_KEY, JSON.stringify(settings));
    localStorage.setItem("storeName", settings.storeName || "KeyNova");
    localStorage.setItem("whatsapp", settings.whatsapp || "0981101365");

    keynovaApplyStore();
}

function keynovaMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : "0.00";
}

function keynovaDiscount(oldPrice, price) {
    const oldValue = Number(oldPrice);
    const newValue = Number(price);

    if (!oldValue || newValue >= oldValue) {
        return "OFERTA";
    }

    return `-${Math.round((1 - newValue / oldValue) * 100)}%`;
}

function keynovaNotify(message) {
    if (typeof showNotification === "function") {
        showNotification(message);
    } else {
        alert(message);
    }
}

function keynovaNormalizeWhatsApp(number) {
    let value = String(number || "").replace(/\D/g, "");

    /* Ecuador: 0981101365 → 593981101365 */
    if (value.startsWith("0")) {
        value = "593" + value.slice(1);
    }

    if (!value.startsWith("593") && value.length === 9) {
        value = "593" + value;
    }

    return value;
}

/* ============================================================
   🏪 APLICAR CONFIGURACIÓN A LA TIENDA
============================================================ */

function keynovaApplyStore() {
    const settings = keynovaGetSettings();

    document.querySelectorAll(".logo-text strong").forEach(element => {
        element.textContent = settings.storeName;
    });

    const footerName = document.querySelector(".footer-brand strong");
    if (footerName) {
        footerName.textContent = settings.storeName;
    }

    const offerBadge = document.querySelector(".offer-badge");
    if (offerBadge) {
        const pulse = offerBadge.querySelector(".pulse");
        offerBadge.textContent = "";

        if (pulse) {
            offerBadge.appendChild(pulse);
        }

        offerBadge.appendChild(document.createTextNode(` ${settings.offerText}`));
    }

    const heroParagraph = document.querySelector(".hero-content > p");
    if (heroParagraph) {
        heroParagraph.textContent = settings.heroText;
    }

    const cards = document.querySelectorAll(".product-card");

    keynovaApplyProductCard(cards[0], "Windows", settings.windows);
    keynovaApplyProductCard(cards[1], "Microsoft Office", settings.office);

    const bundle = document.querySelector(".bundle-section");

    if (bundle) {
        bundle.style.display = settings.bundle.visible ? "" : "none";

        const oldPrice = bundle.querySelector(".bundle-price > span");
        const newPrice = bundle.querySelector(".bundle-price > strong");
        const saving = bundle.querySelector(".bundle-saving");
        const circle = bundle.querySelector(".bundle-circle");

        if (oldPrice) {
            oldPrice.textContent = `$${keynovaMoney(settings.bundle.oldPrice)}`;
        }

        if (newPrice) {
            newPrice.innerHTML = `<small>$</small>${keynovaMoney(settings.bundle.price)}`;
        }

        if (saving) {
            saving.textContent = `Ahorras $${keynovaMoney(Math.max(0, settings.bundle.oldPrice - settings.bundle.price))}`;
        }

        if (circle) {
            circle.textContent = keynovaMoney(settings.bundle.price);
        }
    }

    const windowsFloat = document.querySelector(".windows-float strong");
    const officeFloat = document.querySelector(".office-float strong");

    if (windowsFloat) {
        windowsFloat.textContent = `$${keynovaMoney(settings.windows.price)}`;
    }

    if (officeFloat) {
        officeFloat.textContent = `$${keynovaMoney(settings.office.price)}`;
    }

    keynovaRefreshHowItWorks();
}

function keynovaApplyProductCard(card, cartName, product) {
    if (!card) return;

    card.style.display = product.visible ? "" : "none";

    const oldPrice = card.querySelector(".old-price");
    const currentPrice = card.querySelector(".current-price");
    const saving = card.querySelector(".saving");
    const discount = card.querySelector(".discount");
    const button = card.querySelector(".product-button");

    if (oldPrice) {
        oldPrice.textContent = `$${keynovaMoney(product.oldPrice)}`;
    }

    if (currentPrice) {
        currentPrice.innerHTML = `<small>$</small>${keynovaMoney(product.price)}`;
    }

    if (saving) {
        saving.textContent = `Ahorras $${keynovaMoney(Math.max(0, product.oldPrice - product.price))}`;
    }

    if (discount) {
        discount.textContent = keynovaDiscount(product.oldPrice, product.price);
    }

    if (button) {
        button.onclick = () => {
            if (typeof addToCart === "function") {
                addToCart(cartName, Number(product.price));
            }
        };
    }
}

/* ============================================================
   🛒 PACK DINÁMICO
============================================================ */

window.addBundle = function () {
    const price = Number(keynovaGetSettings().bundle.price);

    if (cart.some(item => item.name === "Windows + Office")) {
        alert("El pack ya está en tu carrito.");
        return;
    }

    cart.push({
        name: "Windows + Office",
        price
    });

    updateCart();
    keynovaNotify("Pack Windows + Office añadido ✓");
};

/* ============================================================
   📱 WHATSAPP — ÚNICO MÉTODO PARA ENVIAR EL PEDIDO
   Número configurado: ...
============================================================ */

window.sendWhatsApp = function () {
    if (!cart || cart.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    const settings = keynovaGetSettings();
    const phone = keynovaNormalizeWhatsApp(settings.whatsapp || "0981101365");

    if (!phone) {
        alert("El número de WhatsApp no está configurado.");
        return;
    }

    const message = encodeURIComponent(keynovaCreateOrderMessage());

    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
};

window.keynovaCreateOrderMessage = function () {
    return keynovaCreateOrderMessage();
};

function keynovaCreateOrderMessage() {
    const settings = keynovaGetSettings();
    let total = 0;

    const products = cart.map(item => {
        total += Number(item.price);
        return `• ${item.name} — $${keynovaMoney(item.price)}`;
    }).join("\n");

    const firstPayment = total / 2;
    const finalPayment = total - firstPayment;

    return `🛒 NUEVO PEDIDO — ${settings.storeName}

${products}

💰 TOTAL: $${keynovaMoney(total)}

💳 Método de pago: PayPal
💵 50% al iniciar: $${keynovaMoney(firstPayment)}
💵 50% al finalizar: $${keynovaMoney(finalPayment)}

🔧 Servicio remoto
⏱️ Duración aproximada: ${settings.serviceTime}
🌐 Modalidad: 100% remota
🔐 El cliente puede ver la actividad en tiempo real y finalizar la conexión cuando quiera.

📱 Contacto: WhatsApp

Pedido generado desde KeyNova.`;
}

/* ============================================================
   ❌ QUITAR "ENVIAR PEDIDO" / DISCORD
   Solo queda el botón de WhatsApp.
============================================================ */

function keynovaRemoveDiscord() {
    document.querySelectorAll(".discord-button").forEach(button => {
        button.remove();
    });
}

/* ============================================================
   📖 SECCIÓN "CÓMO FUNCIONA"
============================================================ */

function keynovaInjectHowItWorks() {
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
            <p>Un proceso sencillo, claro y bajo tu control.</p>
        </div>

        <div class="kn-how-grid">
            <article class="kn-how-card">
                <span class="kn-step">01</span>
                <div class="kn-how-icon">🛒</div>
                <h3>Realizas tu pedido</h3>
                <p>Elige el servicio que necesitas y continúa con tu pedido. El pago se realiza mediante <strong>PayPal</strong>.</p>
            </article>

            <article class="kn-how-card">
                <span class="kn-step">02</span>
                <div class="kn-how-icon">💳</div>
                <h3>Primer pago</h3>
                <p>Al comenzar el servicio se paga el <strong>50%</strong> del total. El otro 50% se paga al finalizar.</p>
            </article>

            <article class="kn-how-card">
                <span class="kn-step">03</span>
                <div class="kn-how-icon">🖥️</div>
                <h3>Conexión remota</h3>
                <p>Te proporcionamos el programa necesario y un tutorial sencillo para establecer la conexión.</p>
            </article>

            <article class="kn-how-card">
                <span class="kn-step">04</span>
                <div class="kn-how-icon">👁️</div>
                <h3>Tú tienes el control</h3>
                <p>Puedes <strong>ver en tiempo real</strong> lo que se realiza en tu PC y finalizar la conexión cuando quieras.</p>
            </article>

            <article class="kn-how-card">
                <span class="kn-step">05</span>
                <div class="kn-how-icon">🔧</div>
                <h3>Realizamos el servicio</h3>
                <p>El trabajo se realiza de forma remota directamente en tu computadora. No necesitas desplazarte.</p>
            </article>

            <article class="kn-how-card">
                <span class="kn-step">06</span>
                <div class="kn-how-icon">✅</div>
                <h3>Finalización</h3>
                <p>Una vez terminado el servicio, se completa el <strong>50% restante</strong> y se cierra la sesión.</p>
            </article>
        </div>

        <div class="kn-service-summary">
            <div>
                <span>⏱️</span>
                <small>Duración aproximada</small>
                <strong data-kn-service-time>20–35 minutos</strong>
            </div>
            <div>
                <span>💳</span>
                <small>Método de pago</small>
                <strong>PayPal</strong>
            </div>
            <div>
                <span>💵</span>
                <small>Forma de pago</small>
                <strong>50% + 50%</strong>
            </div>
            <div>
                <span>🌐</span>
                <small>Modalidad</small>
                <strong>100% remota</strong>
            </div>
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

    keynovaRefreshHowItWorks();
}

function keynovaRefreshHowItWorks() {
    const settings = keynovaGetSettings();

    document.querySelectorAll("[data-kn-service-time]").forEach(element => {
        element.textContent = settings.serviceTime;
    });
}

/* ============================================================
   💳 AVISO DE PAGO EN CHECKOUT
============================================================ */

function keynovaInjectCheckoutNotice() {
    const modal = document.querySelector(".checkout-modal");
    if (!modal || modal.querySelector(".kn-payment-notice")) return;

    const notice = document.createElement("div");
    notice.className = "kn-payment-notice";

    notice.innerHTML = `
        <strong>💳 Pago dividido</strong>
        <span>50% al iniciar el servicio + 50% al finalizar.</span>
        <small>Método de pago: PayPal.</small>
    `;

    const whatsappButton = modal.querySelector(".whatsapp-button");
    modal.insertBefore(notice, whatsappButton || null);
}

/* ============================================================
   👥 SESIONES DEL ADMIN
   Nota: con una web estática solo se pueden sincronizar dentro
   del mismo navegador/origen. Para varios dispositivos hace
   falta un backend.
============================================================ */

function keynovaGetSessions() {
    try {
        return JSON.parse(localStorage.getItem(KEYNOVA_SESSIONS_KEY) || "[]");
    } catch (error) {
        return [];
    }
}

function keynovaSaveSessions(sessions) {
    localStorage.setItem(KEYNOVA_SESSIONS_KEY, JSON.stringify(sessions));
}

function keynovaCleanSessions() {
    const now = Date.now();
    const sessions = keynovaGetSessions().filter(session => now - session.lastSeen < 25000);
    keynovaSaveSessions(sessions);
    return sessions;
}

function keynovaCreateSession(name) {
    const sessions = keynovaCleanSessions();

    keynovaSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    sessions.push({
        id: keynovaSessionId,
        name: name || "Sesión sin nombre",
        startedAt: Date.now(),
        lastSeen: Date.now()
    });

    keynovaSaveSessions(sessions);
    keynovaStartHeartbeat();
}

function keynovaStartHeartbeat() {
    clearInterval(keynovaHeartbeat);

    keynovaHeartbeat = setInterval(() => {
        if (!keynovaSessionId) return;

        const sessions = keynovaCleanSessions();
        const current = sessions.find(session => session.id === keynovaSessionId);

        if (!current) {
            keynovaLogout(false);
            return;
        }

        current.lastSeen = Date.now();
        keynovaSaveSessions(sessions);
        keynovaRefreshAdminStats();
    }, 5000);
}

function keynovaEndSession() {
    if (!keynovaSessionId) return;

    const sessions = keynovaGetSessions().filter(session => session.id !== keynovaSessionId);
    keynovaSaveSessions(sessions);

    keynovaSessionId = null;
    clearInterval(keynovaHeartbeat);
    keynovaHeartbeat = null;
}

function keynovaCloseOtherSession(id) {
    const sessions = keynovaGetSessions().filter(session => session.id !== id);
    keynovaSaveSessions(sessions);
    keynovaRenderSessions();
    keynovaRefreshAdminStats();
}

/* ============================================================
   🔐 LOGIN ADMIN
============================================================ */

window.openAdmin = function () {
    const overlay = document.getElementById("adminOverlay");
    if (!overlay) return;

    keynovaBuildAdminPanel();

    overlay.classList.add("show");
    document.body.style.overflow = "hidden";
    keynovaAdminOpen = true;
};

window.closeAdmin = function () {
    const overlay = document.getElementById("adminOverlay");
    if (!overlay) return;

    overlay.classList.remove("show");
    document.body.style.overflow = "";
    keynovaAdminOpen = false;
};

window.closeAdminOutside = function (event) {
    if (event.target.id === "adminOverlay") {
        closeAdmin();
    }
};

window.knAdminLogin = function () {
    const passwordInput = document.getElementById("knAdminPassword");
    const sessionInput = document.getElementById("knSessionName");

    const password = passwordInput ? passwordInput.value : "";
    const sessionName = sessionInput ? sessionInput.value.trim() : "";

    if (password !== ADMIN_PASSWORD) {
        alert("❌ Contraseña incorrecta.");
        return;
    }

    const totalLogins = Number(localStorage.getItem(KEYNOVA_LOGIN_COUNT_KEY) || 0) + 1;
    localStorage.setItem(KEYNOVA_LOGIN_COUNT_KEY, String(totalLogins));

    keynovaCreateSession(sessionName || "Administrador");

    document.getElementById("knAdminLogin").hidden = true;
    document.getElementById("knAdminDashboard").hidden = false;

    keynovaFillAdminForm();
    keynovaRenderPriceEditor();
    keynovaRenderSessions();
    keynovaRefreshAdminStats();
};

window.knAdminLogout = function () {
    keynovaEndSession();
    closeAdmin();
};

window.knSwitchAdminTab = function (tabName, button) {
    document.querySelectorAll(".kn-admin-tabs button").forEach(tabButton => {
        tabButton.classList.remove("active");
    });

    document.querySelectorAll(".kn-admin-tab").forEach(tab => {
        tab.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }

    const tab = document.getElementById(`knTab-${tabName}`);
    if (tab) {
        tab.classList.add("active");
    }

    if (tabName === "sessions") {
        keynovaRenderSessions();
    }
};

/* ============================================================
   🧱 CONSTRUIR PANEL ADMIN
============================================================ */

function keynovaBuildAdminPanel() {
    const overlay = document.getElementById("adminOverlay");
    if (!overlay) return;

    overlay.innerHTML = `
        <div class="modal kn-admin-modal" onclick="event.stopPropagation()">
            <button class="close-button" onclick="closeAdmin()">×</button>

            <div id="knAdminLogin" class="kn-admin-login">
                <div class="kn-admin-logo">K</div>
                <span class="kn-admin-kicker">KEYNOVA CONTROL</span>
                <h2>Panel administrativo</h2>
                <p>Gestiona precios, tienda y sesiones.</p>

                <label>Nombre de esta sesión</label>
                <input id="knSessionName" type="text" maxlength="28" placeholder="Ej: PC Principal">

                <label>Contraseña</label>
                <input id="knAdminPassword" type="password" placeholder="Contraseña del panel" onkeydown="if(event.key==='Enter') knAdminLogin()">

                <button class="kn-admin-primary" onclick="knAdminLogin()">Entrar al panel →</button>

                <small>
                    🔐 
                    
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
                    <div><span>⭐</span><small>Reseñas</small><strong id="knReviewStat">0</strong></div>
                    <div><span>🛒</span><small>Carrito actual</small><strong id="knCartStat">0</strong></div>
                </div>

                <div class="kn-admin-tabs">
                    <button class="active" onclick="knSwitchAdminTab('prices', this)">💲 Precios</button>
                    <button onclick="knSwitchAdminTab('store', this)">🏪 Tienda</button>
                    <button onclick="knSwitchAdminTab('sessions', this)">👥 Sesiones</button>
                    <button onclick="knSwitchAdminTab('maintenance', this)">🛠️ Mantenimiento</button>
                </div>

                <section class="kn-admin-tab active" id="knTab-prices">
                    <div class="kn-admin-section-head">
                        <div>
                            <h3>Precios y visibilidad</h3>
                            <p>Modifica el precio antiguo, el precio actual y si el producto aparece.</p>
                        </div>
                        <button class="kn-admin-primary small" onclick="knSavePrices()">Guardar precios</button>
                    </div>
                    <div id="knPriceEditor" class="kn-price-editor"></div>
                </section>

                <section class="kn-admin-tab" id="knTab-store">
                    <div class="kn-admin-section-head">
                        <div>
                            <h3>Configuración de tienda</h3>
                            <p>Datos y textos principales de KeyNova.</p>
                        </div>
                        <button class="kn-admin-primary small" onclick="knSaveStore()">Guardar tienda</button>
                    </div>

                    <div class="kn-form-grid">
                        <label>Nombre de la tienda<input id="knStoreName" type="text"></label>
                        <label>WhatsApp<input id="knWhatsapp" type="text" placeholder="0981101365"></label>
                        <label>Texto de oferta<input id="knOfferText" type="text"></label>
                        <label>Duración del servicio<input id="knServiceTime" type="text"></label>
                        <label class="full">Descripción principal<textarea id="knHeroText" maxlength="220"></textarea></label>
                    </div>

                    <div class="kn-readonly-info">
                        <span>💳</span>
                        <div>
                            <strong>Método de pago</strong>
                            <small>PayPal</small>
                        </div>
                        <span>💵</span>
                        <div>
                            <strong>Pago dividido</strong>
                            <small>50% al iniciar + 50% al finalizar</small>
                        </div>
                    </div>
                </section>

                <section class="kn-admin-tab" id="knTab-sessions">
                    <div class="kn-admin-section-head">
                        <div>
                            <h3>Sesiones del panel</h3>
                            <p>Mira quién está conectado y cierra otras sesiones.</p>
                        </div>
                        <button class="kn-admin-secondary small" onclick="knRenderSessions()">Actualizar</button>
                    </div>
                    <div id="knSessionsList" class="kn-sessions-list"></div>
                </section>

                <section class="kn-admin-tab" id="knTab-maintenance">
                    <div class="kn-admin-section-head">
                        <div>
                            <h3>Mantenimiento</h3>
                            <p>Herramientas para administrar los datos locales.</p>
                        </div>
                    </div>

                    <div class="kn-maintenance-grid">
                        <button class="kn-maintenance-button" onclick="knClearReviews()">⭐ Eliminar reseñas</button>
                        <button class="kn-maintenance-button" onclick="knResetStore()">↩️ Restablecer tienda</button>
                        <button class="kn-maintenance-button danger" onclick="knClearSessions()">🚪 Cerrar todas las otras sesiones</button>
                    </div>

                    <div class="kn-security-note">
                        <strong>🔐 Seguridad</strong>
                        <p>La contraseña no tiene opción de cambio dentro del panel. Solo se modifica directamente en <code>enhancements.js</code>.</p>
                    </div>
                </section>
            </div>
        </div>
    `;
}

/* ============================================================
   💲 EDITOR DE PRECIOS
============================================================ */

function keynovaRenderPriceEditor() {
    const container = document.getElementById("knPriceEditor");
    if (!container) return;

    const settings = keynovaGetSettings();

    const products = [
        { key: "windows", name: "Windows", icon: "⊞", data: settings.windows },
        { key: "office", name: "Microsoft Office", icon: "O", data: settings.office },
        { key: "bundle", name: "Windows + Office", icon: "⊞ + O", data: settings.bundle }
    ];

    container.innerHTML = products.map(product => `
        <article class="kn-price-card">
            <div class="kn-price-card-title">
                <span>${product.icon}</span>
                <div>
                    <strong>${product.name}</strong>
                    <small>Configuración del producto</small>
                </div>
            </div>

            <div class="kn-price-fields">
                <label>
                    Precio anterior
                    <input id="kn-${product.key}-old" type="number" min="0" step="0.01" value="${product.data.oldPrice}">
                </label>
                <label>
                    Precio actual
                    <input id="kn-${product.key}-price" type="number" min="0" step="0.01" value="${product.data.price}">
                </label>
            </div>

            <label class="kn-switch-row">
                <span>Mostrar en la tienda</span>
                <input id="kn-${product.key}-visible" type="checkbox" ${product.data.visible ? "checked" : ""}>
            </label>
        </article>
    `).join("");
}

window.knSavePrices = function () {
    const settings = keynovaGetSettings();

    ["windows", "office", "bundle"].forEach(key => {
        settings[key].oldPrice = Math.max(0, Number(document.getElementById(`kn-${key}-old`).value) || 0);
        settings[key].price = Math.max(0, Number(document.getElementById(`kn-${key}-price`).value) || 0);
        settings[key].visible = document.getElementById(`kn-${key}-visible`).checked;
    });

    keynovaSaveSettings(settings);
    keynovaRenderPriceEditor();
    keynovaNotify("✅ Precios guardados correctamente.");
};

/* ============================================================
   🏪 GUARDAR CONFIGURACIÓN DE TIENDA
============================================================ */

function keynovaFillAdminForm() {
    const settings = keynovaGetSettings();

    document.getElementById("knStoreName").value = settings.storeName;
    document.getElementById("knWhatsapp").value = settings.whatsapp || "0981101365";
    document.getElementById("knOfferText").value = settings.offerText;
    document.getElementById("knServiceTime").value = settings.serviceTime;
    document.getElementById("knHeroText").value = settings.heroText;

    const session = keynovaGetSessions().find(item => item.id === keynovaSessionId);
    const label = document.getElementById("knAdminSessionLabel");

    if (label && session) {
        label.textContent = `🟢 ${session.name} · sesión activa`;
    }
}

window.knSaveStore = function () {
    const settings = keynovaGetSettings();

    settings.storeName = document.getElementById("knStoreName").value.trim() || "KeyNova";
    settings.whatsapp = document.getElementById("knWhatsapp").value.trim() || "0981101365";
    settings.offerText = document.getElementById("knOfferText").value.trim() || "OFERTAS LIMITADAS";
    settings.serviceTime = document.getElementById("knServiceTime").value.trim() || "20–35 minutos";
    settings.heroText = document.getElementById("knHeroText").value.trim() || KEYNOVA_DEFAULTS.heroText;

    keynovaSaveSettings(settings);
    keynovaNotify("✅ Configuración de tienda guardada.");
};

/* ============================================================
   👥 RENDER DE SESIONES
============================================================ */

window.knRenderSessions = function () {
    const container = document.getElementById("knSessionsList");
    if (!container) return;

    const sessions = keynovaCleanSessions();

    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="kn-empty-state">
                <span>👥</span>
                <strong>No hay sesiones activas.</strong>
            </div>
        `;
        return;
    }

    container.innerHTML = sessions.map(session => {
        const isCurrent = session.id === keynovaSessionId;
        const time = new Date(session.startedAt).toLocaleTimeString("es-EC", {
            hour: "2-digit",
            minute: "2-digit"
        });

        return `
            <article class="kn-session-item">
                <div class="kn-session-status">${isCurrent ? "🟢" : "🔵"}</div>
                <div class="kn-session-info">
                    <strong>${String(session.name).replace(/[<>]/g, "")}</strong>
                    <small>${isCurrent ? "Esta sesión" : "Otra sesión"} · Entró a las ${time}</small>
                </div>
                ${isCurrent ? "<span class=\"kn-current-label\">ACTUAL</span>" : `<button onclick="knCloseOtherSession('${session.id}')">Cerrar sesión</button>`}
            </article>
        `;
    }).join("");
};

window.knCloseOtherSession = function (id) {
    keynovaCloseOtherSession(id);
    keynovaNotify("🚪 Sesión cerrada.");
};

window.knClearSessions = function () {
    const sessions = keynovaGetSessions().filter(session => session.id === keynovaSessionId);
    keynovaSaveSessions(sessions);
    keynovaRenderSessions();
    keynovaRefreshAdminStats();
    keynovaNotify("🚪 Las otras sesiones fueron cerradas.");
};

function keynovaRefreshAdminStats() {
    const sessions = keynovaCleanSessions();

    const active = document.getElementById("knActiveSessions");
    const logins = document.getElementById("knLoginCount");
    const reviews = document.getElementById("knReviewStat");
    const cartCount = document.getElementById("knCartStat");

    if (active) active.textContent = sessions.length;
    if (logins) logins.textContent = localStorage.getItem(KEYNOVA_LOGIN_COUNT_KEY) || "0";

    let reviewList = [];
    try {
        reviewList = JSON.parse(localStorage.getItem("reviews") || "[]");
    } catch (error) {
        reviewList = [];
    }

    if (reviews) reviews.textContent = reviewList.length;
    if (cartCount) cartCount.textContent = typeof cart !== "undefined" ? cart.length : 0;
}

/* ============================================================
   ⭐ RESEÑAS
============================================================ */

window.knClearReviews = function () {
    if (!confirm("¿Eliminar todas las reseñas guardadas en este navegador?")) {
        return;
    }

    localStorage.removeItem("reviews");

    if (typeof renderReviews === "function") {
        renderReviews();
    }

    keynovaRefreshAdminStats();
    keynovaNotify("⭐ Reseñas eliminadas.");
};

/* ============================================================
   ↩️ RESTABLECER TIENDA
============================================================ */

window.knResetStore = function () {
    if (!confirm("¿Restablecer precios y configuración de KeyNova?")) {
        return;
    }

    keynovaSaveSettings(keynovaClone(KEYNOVA_DEFAULTS));
    keynovaFillAdminForm();
    keynovaRenderPriceEditor();
    keynovaNotify("↩️ La tienda volvió a su configuración predeterminada.");
};

/* ============================================================
   🚪 LIMPIAR SESIÓN AL CERRAR LA PESTAÑA
============================================================ */

window.addEventListener("beforeunload", () => {
    keynovaEndSession();
});

/* ============================================================
   🔄 SINCRONIZACIÓN ENTRE PESTAÑAS
============================================================ */

window.addEventListener("storage", event => {
    if (event.key === KEYNOVA_CONFIG_KEY) {
        keynovaApplyStore();
    }

    if (event.key === KEYNOVA_SESSIONS_KEY && keynovaAdminOpen) {
        keynovaRenderSessions();
        keynovaRefreshAdminStats();
    }
});

/* ============================================================
   🚀 INICIALIZACIÓN
============================================================ */

function keynovaInitialize() {
    /* Guarda el número solicitado como valor predeterminado. */
    if (!localStorage.getItem(KEYNOVA_CONFIG_KEY)) {
        keynovaSaveSettings(keynovaClone(KEYNOVA_DEFAULTS));
    } else if (!localStorage.getItem("whatsapp")) {
        localStorage.setItem("whatsapp", "0981101365");
    }

    keynovaRemoveDiscord();
    keynovaInjectHowItWorks();
    keynovaInjectCheckoutNotice();
    keynovaApplyStore();
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", keynovaInitialize);
} else {
    keynovaInitialize();
}

/*
============================================================
📌 RESUMEN DE FUNCIONES

ADMIN_PASSWORD       → contraseña del panel; solo se cambia aquí.
keynovaGetSettings()  → obtiene la configuración guardada.
keynovaSaveSettings() → guarda la configuración.
keynovaApplyStore()   → aplica precios/textos a la página.
knSavePrices()        → guarda los precios desde el admin.
knSaveStore()         → guarda nombre, WhatsApp y textos.
knRenderSessions()    → muestra las sesiones activas.
knCloseOtherSession() → cierra otra sesión.
knClearReviews()      → elimina las reseñas locales.
knResetStore()        → devuelve la tienda a los valores iniciales.
sendWhatsApp()        → abre WhatsApp con el pedido completo.
keynovaCreateOrderMessage() → genera el mensaje con el 50% + 50%.
keynovaInjectHowItWorks()   → crea la sección "Cómo funciona".

❌ Discord / "Enviar pedido" fue eliminado del checkout.
📱 WhatsApp predeterminado: 0981101365.
💳 Pago: PayPal.
💵 Pago: 50% al iniciar + 50% al finalizar.
============================================================
*/
