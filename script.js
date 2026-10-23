/* =====================================================
   KEYNOVA — TIENDA
   Carrito + checkout + WhatsApp + reseñas globales
===================================================== */
let cart = [];
let selectedRating = 5;
const WHATSAPP_NUMBER = "593981101365";
const REVIEWS_API = "/api/reviews";

function escapeHTML(text) {
    return String(text).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function money(value){ return Number(value).toFixed(2); }

function addToCart(name,price){
    const numericPrice=Number(price);
    if(!name||!Number.isFinite(numericPrice)||numericPrice<0)return;
    if(cart.some(item=>item.name===name)){showNotification(`${name} ya está en tu carrito.`);openCart();return;}
    cart.push({name,price:numericPrice}); updateCart(); showNotification(`${name} añadido al carrito ✓`);
}
function addBundle(){
    if(cart.some(item=>item.name==="Windows + Office")){showNotification("El pack ya está en tu carrito.");openCart();return;}
    cart.push({name:"Windows + Office",price:23.99}); updateCart(); showNotification("Pack Windows + Office añadido ✓");
}
function removeItem(index){if(!Number.isInteger(index)||index<0||index>=cart.length)return;cart.splice(index,1);updateCart();}
function updateCart(){
    const container=document.getElementById("cartItems"),count=document.getElementById("cartCount"),totalElement=document.getElementById("cartTotal");
    if(!container||!count||!totalElement)return;
    count.textContent=cart.length;
    if(cart.length===0){container.innerHTML=`<div class="empty-cart">🛒<br><br>Tu carrito está vacío.</div>`;totalElement.textContent="$0.00";return;}
    let total=0;
    container.innerHTML=cart.map((item,index)=>{total+=Number(item.price);return `<div class="cart-item"><div class="cart-item-info"><strong>${escapeHTML(item.name)}</strong><small>Producto digital</small></div><div class="cart-item-price"><strong>$${money(item.price)}</strong><button class="remove-item" type="button" onclick="removeItem(${index})">Eliminar</button></div></div>`;}).join("");
    totalElement.textContent=`$${money(total)}`;
}
function enterStore(){document.body.classList.add("shopping-mode");window.scrollTo({top:0,behavior:"smooth"});}
function showLanding(){document.body.classList.remove("shopping-mode");window.scrollTo({top:0,behavior:"smooth"});}

function openCart(){document.getElementById("cartOverlay")?.classList.add("show");document.body.style.overflow="hidden";}
function closeCart(){document.getElementById("cartOverlay")?.classList.remove("show");document.body.style.overflow="";}
function closeCartOutside(event){if(event.target?.id==="cartOverlay")closeCart();}

function checkout(){
    if(cart.length===0){showNotification("Tu carrito está vacío.");return;}
    let total=0;
    const products=cart.map(item=>{total+=Number(item.price);return `• ${item.name} — $${money(item.price)}`;}).join("\n");
    const firstPayment=total/2;
    const summary=document.getElementById("checkoutSummary");
    if(summary)summary.textContent=`${products}\n\nTOTAL: $${money(total)}\n\n💳 PayPal\n💵 50% al iniciar: $${money(firstPayment)}\n💵 50% al finalizar: $${money(total-firstPayment)}`;
    closeCart();document.getElementById("checkoutOverlay")?.classList.add("show");document.body.style.overflow="hidden";
}
function closeCheckout(){document.getElementById("checkoutOverlay")?.classList.remove("show");document.body.style.overflow="";}
function closeCheckoutOutside(event){if(event.target?.id==="checkoutOverlay")closeCheckout();}

function createOrderMessage(){
    if(cart.length===0)return "";
    let total=0;
    const products=cart.map(item=>{total+=Number(item.price);return `• ${item.name} — $${money(item.price)}`;}).join("\n");
    const firstPayment=total/2,finalPayment=total-firstPayment;
    return `🛒 NUEVO PEDIDO — KeyNova\n\n${products}\n\n💰 TOTAL: $${money(total)}\n\n💳 Método de pago: PayPal\n💵 50% al iniciar: $${money(firstPayment)}\n💵 50% al finalizar: $${money(finalPayment)}\n\n🔧 Servicio remoto\n⏱️ Duración aproximada: 20–35 minutos\n🌐 Modalidad: 100% remota\n🔐 El cliente puede ver la actividad en tiempo real y finalizar la conexión cuando quiera.\n\n📱 Pedido generado desde KeyNova.`;
}
function sendWhatsApp(){
    if(cart.length===0){showNotification("Añade un producto antes de continuar.");return;}
    const url=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(createOrderMessage())}`;
    window.location.href=url;
}

/* ================= RESEÑAS GLOBALES ================= */
function selectRating(rating){
    selectedRating=Math.max(1,Math.min(5,Number(rating)));
    document.querySelectorAll("#starsInput button").forEach((button,index)=>button.classList.toggle("active",index<selectedRating));
}
async function submitReview(){
    const input=document.getElementById("reviewText"),text=input?.value.trim()||"";
    if(text.length<3){showNotification("Escribe una opinión de al menos 3 caracteres.");input?.focus();return;}
    if(text.length>300){showNotification("La reseña no puede superar 300 caracteres.");return;}
    const button=document.querySelector(".review-button");if(button)button.disabled=true;
    try{
        const response=await fetch(REVIEWS_API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rating:selectedRating,text})});
        if(!response.ok)throw new Error("No se pudo publicar la reseña.");
        input.value="";selectRating(5);await renderReviews();showNotification("⭐ Reseña publicada correctamente.");
    }catch(error){console.error(error);showNotification("No se pudo publicar la reseña. Comprueba la conexión del servicio.");}
    finally{if(button)button.disabled=false;}
}
async function renderReviews(){
    const container=document.getElementById("reviewsContainer");if(!container)return;
    try{
        const response=await fetch(`${REVIEWS_API}?limit=50`,{cache:"no-store"});if(!response.ok)throw new Error("API no disponible");
        const reviews=await response.json();
        if(!Array.isArray(reviews)||reviews.length===0){container.innerHTML=`<div class="review"><div class="review-stars">★★★★★</div><p>Todavía no hay reseñas. Sé la primera persona en compartir su experiencia.</p><small>👤 Cliente anónimo</small></div>`;updateRatingStats([]);return;}
        container.innerHTML=reviews.map(review=>{const rating=Math.max(1,Math.min(5,Number(review.rating))),stars="★".repeat(rating)+"☆".repeat(5-rating),date=review.created_at?new Date(review.created_at).toLocaleDateString("es-EC"):"";return `<article class="review"><div class="review-stars">${stars}</div><p>${escapeHTML(review.text)}</p><small>👤 Cliente anónimo${date?` · ${escapeHTML(date)}`:""}</small></article>`;}).join("");
        updateRatingStats(reviews);
    }catch(error){
        console.error(error);
        container.innerHTML="";
        updateRatingStats([]);
    }
}
function updateRatingStats(reviews){
    const count=reviews.length,countElement=document.getElementById("reviewCount"),averageElement=document.getElementById("averageRating");if(!countElement||!averageElement)return;
    countElement.textContent=`${count} reseña${count===1?"":"s"}`;
    if(count===0){averageElement.textContent="—";for(let rating=1;rating<=5;rating++){const bar=document.getElementById(`bar${rating}`);if(bar)bar.style.width="0%";}return;}
    const total=reviews.reduce((sum,review)=>sum+Number(review.rating),0);averageElement.textContent=(total/count).toFixed(1);
    for(let rating=1;rating<=5;rating++){const amount=reviews.filter(review=>Number(review.rating)===rating).length,bar=document.getElementById(`bar${rating}`);if(bar)bar.style.width=`${amount/count*100}%`;}
}

/* ================= LOGO KEYNOVA ================= */
function renderKeyNovaLogo(){
    const svg=`<svg viewBox="0 0 64 64" aria-label="KeyNova" role="img" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="knLogoGradient" x1="8" y1="6" x2="56" y2="58"><stop offset="0" stop-color="#a5f3fc"/><stop offset=".48" stop-color="#60a5fa"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs><rect x="3" y="3" width="58" height="58" rx="18" fill="#0b1220" stroke="url(#knLogoGradient)" stroke-opacity=".7"/><path d="M17 16v32M17 32l19-16M17 32l19 16" fill="none" stroke="url(#knLogoGradient)" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M37 19l10 13-10 13" fill="none" stroke="#f0f9ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="47" cy="32" r="3" fill="#a5f3fc"/></svg>`;
    document.querySelectorAll(".logo-icon").forEach(el=>{el.innerHTML=svg;el.classList.add("kn-logo-modern");});
}

function showNotification(message){
    document.querySelector(".toast-notification")?.remove();const toast=document.createElement("div");toast.className="toast-notification";toast.textContent=message;
    Object.assign(toast.style,{position:"fixed",bottom:"25px",right:"25px",zIndex:"9999",padding:"13px 18px",background:"#111c2d",border:"1px solid rgba(96,165,250,.25)",color:"white",borderRadius:"11px",fontSize:"11px",fontWeight:"700",boxShadow:"0 15px 40px rgba(0,0,0,.35)",animation:"toastIn .25s ease"});document.body.appendChild(toast);
    setTimeout(()=>{toast.style.opacity="0";toast.style.transform="translateY(10px)";toast.style.transition=".25s";setTimeout(()=>toast.remove(),250);},2500);
}
const toastStyle=document.createElement("style");toastStyle.textContent=`@keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.kn-logo-modern{display:grid!important;place-items:center!important}.kn-logo-modern svg{width:100%;height:100%;display:block}.kn-logo-modern:after{display:none!important}`;document.head.appendChild(toastStyle);
document.addEventListener("keydown",event=>{if(event.key==="Escape"){closeCart();closeCheckout();}});
document.addEventListener("DOMContentLoaded",()=>{updateCart();selectRating(5);renderKeyNovaLogo();renderReviews();});
