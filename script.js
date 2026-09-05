/* =====================================================
   KEYNOVA
   Sistema principal de tienda
===================================================== */


/* ================= VARIABLES ================= */

let cart = [];

let selectedRating = 5;


/* ================= UTILIDADES ================= */

function escapeHTML(text) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ================= CARRITO ================= */

function addToCart(name, price) {

    /*
        Evitamos añadir exactamente el mismo producto
        varias veces.
    */

    const existing =
        cart.find(item => item.name === name);

    if (existing) {

        alert(
            `${name} ya está en tu carrito.`
        );

        return;
    }

    cart.push({
        name: name,
        price: price
    });

    updateCart();

    showNotification(
        `${name} añadido al carrito ✓`
    );
}


function addBundle() {

    /*
        El pack tiene precio especial.
    */

    const existing =
        cart.find(
            item =>
                item.name === "Windows + Office"
        );

    if (existing) {

        alert(
            "El pack ya está en tu carrito."
        );

        return;
    }

    cart.push({
        name: "Windows + Office",
        price: 3.99
    });

    updateCart();

    showNotification(
        "Pack Windows + Office añadido ✓"
    );
}


function removeItem(index) {

    if (
        index < 0 ||
        index >= cart.length
    ) {
        return;
    }

    cart.splice(index, 1);

    updateCart();
}


function updateCart() {

    const container =
        document.getElementById("cartItems");

    const count =
        document.getElementById("cartCount");

    const totalElement =
        document.getElementById("cartTotal");


    count.textContent = cart.length;


    if (cart.length === 0) {

        container.innerHTML = `
            <div class="empty-cart">
                🛒<br><br>
                Tu carrito está vacío.
            </div>
        `;

        totalElement.textContent =
            "$0.00";

        return;
    }


    let total = 0;


    container.innerHTML =
        cart.map((item, index) => {

            total += item.price;

            return `
                <div class="cart-item">

                    <div class="cart-item-info">

                        <strong>
                            ${escapeHTML(item.name)}
                        </strong>

                        <small>
                            Producto digital
                        </small>

                    </div>

                    <div class="cart-item-price">

                        <strong>
                            $${item.price.toFixed(2)}
                        </strong>

                        <button
                            class="remove-item"
                            onclick="removeItem(${index})"
                        >
                            Eliminar
                        </button>

                    </div>

                </div>
            `;

        }).join("");


    totalElement.textContent =
        `$${total.toFixed(2)}`;
}


/* ================= MODAL CARRITO ================= */

function openCart() {

    document
        .getElementById("cartOverlay")
        .classList.add("show");

    document.body.style.overflow = "hidden";
}


function closeCart() {

    document
        .getElementById("cartOverlay")
        .classList.remove("show");

    document.body.style.overflow = "";
}


function closeCartOutside(event) {

    if (
        event.target.id === "cartOverlay"
    ) {
        closeCart();
    }
}


/* ================= CHECKOUT ================= */

function checkout() {

    if (cart.length === 0) {

        alert(
            "Tu carrito está vacío."
        );

        return;
    }


    let total = 0;


    const products =
        cart.map(item => {

            total += item.price;

            return (
                `• ${item.name} — $${item.price.toFixed(2)}`
            );

        }).join("\n");


    document.getElementById(
        "checkoutSummary"
    ).textContent =
        `${products}\n\nTOTAL: $${total.toFixed(2)}`;


    closeCart();


    document
        .getElementById("checkoutOverlay")
        .classList.add("show");

    document.body.style.overflow = "hidden";
}


function closeCheckout() {

    document
        .getElementById("checkoutOverlay")
        .classList.remove("show");

    document.body.style.overflow = "";
}


function closeCheckoutOutside(event) {

    if (
        event.target.id ===
        "checkoutOverlay"
    ) {
        closeCheckout();
    }
}


/* ================= MENSAJE DE PEDIDO ================= */

function createOrderMessage() {

    const storeName =
        localStorage.getItem(
            "storeName"
        ) || "KeyNova";


    let total = 0;


    const products =
        cart.map(item => {

            total += item.price;

            return (
                `• ${item.name} — $${item.price.toFixed(2)}`
            );

        }).join("\n");


    return `
🛒 NUEVO PEDIDO — ${storeName}

${products}

💰 TOTAL: $${total.toFixed(2)}

📌 El cliente desea realizar el pedido.

━━━━━━━━━━━━━━━━━━
Pedido generado desde KeyNova.
`;
}


/* ================= WHATSAPP ================= */

function sendWhatsApp() {

    const number =
        localStorage.getItem(
            "whatsapp"
        );


    if (!number) {

        alert(
            "El administrador todavía no ha configurado WhatsApp."
        );

        return;
    }


    if (cart.length === 0) {

        alert(
            "El carrito está vacío."
        );

        return;
    }


    const message =
        encodeURIComponent(
            createOrderMessage()
        );


    window.open(
        `https://wa.me/${number}?text=${message}`,
        "_blank"
    );
}


/* ================= DISCORD ================= */

/*
    IMPORTANTE:

    NO colocar aquí el webhook de Discord.

    Un webhook dentro del JavaScript público
    puede ser visto por cualquier visitante.

    La estructura correcta será:

    Página
       ↓
    /api/order
       ↓
    Servidor
       ↓
    Discord

    Cuando tengas el backend, esta función
    enviará automáticamente el pedido.
*/

async function sendOrder() {

    if (cart.length === 0) {

        alert(
            "El carrito está vacío."
        );

        return;
    }


    const message =
        createOrderMessage();


    try {

        const response =
            await fetch(
                "/api/order",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        message: message
                    })
                }
            );


        if (!response.ok) {
            throw new Error(
                "Error del servidor"
            );
        }


        alert(
            "✅ Pedido enviado correctamente."
        );


        cart = [];

        updateCart();

        closeCheckout();


    } catch (error) {

        console.error(error);

        alert(
            "El sistema de pedidos todavía no está conectado al servidor."
        );
    }
}


/* ================= RESEÑAS ================= */

function selectRating(rating) {

    selectedRating = rating;


    const buttons =
        document.querySelectorAll(
            "#starsInput button"
        );


    buttons.forEach(
        (button, index) => {

            button.classList.toggle(
                "active",
                index < rating
            );

        }
    );
}


function submitReview() {

    const input =
        document.getElementById(
            "reviewText"
        );


    const text =
        input.value.trim();


    if (!text) {

        alert(
            "Escribe algo antes de publicar."
        );

        input.focus();

        return;
    }


    if (text.length < 3) {

        alert(
            "El comentario es demasiado corto."
        );

        return;
    }


    const reviews =
        JSON.parse(
            localStorage.getItem(
                "reviews"
            ) || "[]"
        );


    reviews.unshift({

        rating:
            selectedRating,

        text:
            text,

        date:
            new Date()
                .toLocaleDateString(
                    "es-EC"
                ),

        anonymous:
            true

    });


    localStorage.setItem(
        "reviews",
        JSON.stringify(reviews)
    );


    input.value = "";


    selectRating(5);

    renderReviews();


    showNotification(
        "⭐ Reseña publicada de forma anónima."
    );
}


function renderReviews() {

    const reviews =
        JSON.parse(
            localStorage.getItem(
                "reviews"
            ) || "[]"
        );


    const container =
        document.getElementById(
            "reviewsContainer"
        );


    if (reviews.length === 0) {

        container.innerHTML = `
            <div class="review">

                <div class="review-stars">
                    ★★★★★
                </div>

                <p>
                    Todavía no hay reseñas.
                    Sé la primera persona en compartir
                    su experiencia.
                </p>

                <small>
                    👤 Cliente anónimo
                </small>

            </div>
        `;

        updateRatingStats([]);

        return;
    }


    container.innerHTML =
        reviews.map(review => {

            const stars =
                "★".repeat(
                    review.rating
                ) +
                "☆".repeat(
                    5 - review.rating
                );


            return `
                <article class="review">

                    <div class="review-stars">
                        ${stars}
                    </div>

                    <p>
                        ${escapeHTML(review.text)}
                    </p>

                    <small>
                        👤 Cliente anónimo ·
                        ${escapeHTML(review.date)}
                    </small>

                </article>
            `;

        }).join("");


    updateRatingStats(reviews);
}


function updateRatingStats(reviews) {

    const count =
        reviews.length;


    document.getElementById(
        "reviewCount"
    ).textContent =
        `${count} reseña${count === 1 ? "" : "s"}`;


    if (count === 0) {

        document.getElementById(
            "averageRating"
        ).textContent = "5.0";


        for (
            let rating = 1;
            rating <= 5;
            rating++
        ) {

            document.getElementById(
                `bar${rating}`
            ).style.width = "0%";
        }

        return;
    }


    const total =
        reviews.reduce(
            (sum, review) =>
                sum + review.rating,
            0
        );


    const average =
        total / count;


    document.getElementById(
        "averageRating"
    ).textContent =
        average.toFixed(1);


    for (
        let rating = 1;
        rating <= 5;
        rating++
    ) {

        const amount =
            reviews.filter(
                review =>
                    review.rating === rating
            ).length;


        const percentage =
            (amount / count) * 100;


        document.getElementById(
            `bar${rating}`
        ).style.width =
            `${percentage}%`;
    }
}


/* ================= ADMIN ================= */

function openAdmin() {

    const password =
        prompt(
            "Introduce la contraseña del panel:"
        );


    /*
        CAMBIA ESTA CONTRASEÑA.

        IMPORTANTE:
        Para una administración realmente segura,
        la contraseña debe estar en el servidor.
    */

    if (
        password !==
        "1234"
    ) {

        if (password !== null) {

            alert(
                "❌ Contraseña incorrecta."
            );

        }

        return;
    }


    document.getElementById(
        "adminWhatsapp"
    ).value =
        localStorage.getItem(
            "whatsapp"
        ) || "";


    document.getElementById(
        "adminStoreName"
    ).value =
        localStorage.getItem(
            "storeName"
        ) || "KeyNova";


    document
        .getElementById("adminOverlay")
        .classList.add("show");


    document.body.style.overflow =
        "hidden";
}


function closeAdmin() {

    document
        .getElementById("adminOverlay")
        .classList.remove("show");

    document.body.style.overflow =
        "";
}


function closeAdminOutside(event) {

    if (
        event.target.id ===
        "adminOverlay"
    ) {
        closeAdmin();
    }
}


function saveAdmin() {

    const whatsapp =
        document.getElementById(
            "adminWhatsapp"
        ).value.trim();


    const storeName =
        document.getElementById(
            "adminStoreName"
        ).value.trim();


    localStorage.setItem(
        "whatsapp",
        whatsapp
    );


    localStorage.setItem(
        "storeName",
        storeName || "KeyNova"
    );


    alert(
        "✅ Configuración guardada."
    );


    closeAdmin();
}


function clearReviews() {

    const confirmDelete =
        confirm(
            "¿Seguro que quieres eliminar TODAS las reseñas?"
        );


    if (!confirmDelete) {
        return;
    }


    localStorage.removeItem(
        "reviews"
    );


    renderReviews();


    alert(
        "🗑 Reseñas eliminadas."
    );
}


/* ================= NOTIFICACIÓN ================= */

function showNotification(message) {

    const existing =
        document.querySelector(
            ".toast-notification"
        );


    if (existing) {
        existing.remove();
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        "toast-notification";


    toast.textContent =
        message;


    Object.assign(
        toast.style,
        {
            position: "fixed",
            bottom: "25px",
            right: "25px",
            zIndex: "999",
            padding: "13px 18px",
            background: "#111c2d",
            border: "1px solid rgba(96,165,250,.25)",
            color: "white",
            borderRadius: "11px",
            fontSize: "11px",
            fontWeight: "700",
            boxShadow: "0 15px 40px rgba(0,0,0,.35)",
            animation: "toastIn .25s ease"
        }
    );


    document.body.appendChild(toast);


    setTimeout(() => {

        toast.style.opacity = "0";

        toast.style.transform =
            "translateY(10px)";

        toast.style.transition =
            ".25s";

        setTimeout(
            () => toast.remove(),
            250
        );

    }, 2200);
}


/* ================= ESTILOS DE NOTIFICACIÓN ================= */

const toastStyle =
    document.createElement("style");

toastStyle.textContent = `
    @keyframes toastIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }

        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

document.head.appendChild(
    toastStyle
);


/* ================= TECLADO ================= */

document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            closeCart();
            closeCheckout();
            closeAdmin();

        }

    }
);


/* ================= INICIO ================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateCart();

        renderReviews();

        selectRating(5);

    }
);