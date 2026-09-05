const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = origin && !origin.includes("githubusercontent.com") ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function withCors(response, request) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(request)).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), request);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/reviews") {
      return withCors(json({ error: "Not found" }, 404), request);
    }

    if (!env.DB) {
      return withCors(json({ error: "D1 database is not configured." }, 500), request);
    }

    if (request.method === "GET") {
      const rawLimit = Number(url.searchParams.get("limit") || 50);
      const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 50, 1), 100);
      const result = await env.DB.prepare(
        "SELECT id, rating, text, created_at FROM reviews ORDER BY id DESC LIMIT ?"
      ).bind(limit).all();
      return withCors(json(result.results || []), request);
    }

    if (request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return withCors(json({ error: "JSON inválido." }, 400), request);
      }

      const rating = Number(body?.rating);
      const text = String(body?.text || "").trim();

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return withCors(json({ error: "La calificación debe ser de 1 a 5." }, 400), request);
      }
      if (text.length < 3 || text.length > 300) {
        return withCors(json({ error: "La reseña debe tener entre 3 y 300 caracteres." }, 400), request);
      }

      const now = new Date().toISOString();
      const result = await env.DB.prepare(
        "INSERT INTO reviews (rating, text, created_at) VALUES (?, ?, ?)"
      ).bind(rating, text, now).run();

      return withCors(json({
        ok: true,
        id: result.meta?.last_row_id ?? null,
        rating,
        text,
        created_at: now
      }, 201), request);
    }

    return withCors(json({ error: "Method not allowed" }, 405), request);
  }
};
