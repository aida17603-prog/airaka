export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // تست اتصال D1
    if (url.pathname === "/api/test") {
      try {
        const result = await env.DB
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
          .all();

        return Response.json({
          success: true,
          message: "AIRAKA API and D1 are connected",
          tables: result.results,
        });
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: "Database connection failed",
          },
          { status: 500 }
        );
      }
    }

    // تست Workers AI
    if (url.pathname === "/api/ai" && request.method === "POST") {
      try {
        const body = await request.json();
        const prompt = body.prompt?.trim();

        if (!prompt) {
          return Response.json(
            {
              success: false,
              error: "Prompt is required",
            },
            { status: 400 }
          );
        }

        const response = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct",
          {
            messages: [
              {
                role: "system",
                content:
                  "You are AIRAKA AI, an assistant for Iranian manga, comic and visual storytellers. Answer clearly and helpfully.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          }
        );

        return Response.json({
          success: true,
          response: response.response,
        });
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message || String(error),
          },
          { status: 500 }
        );
      }
    }

    // ثبت‌نام
    if (url.pathname === "/api/register" && request.method === "POST") {
      try {
        const body = await request.json();

        const username = body.username?.trim();
        const email = body.email?.trim().toLowerCase();
        const password = body.password;

        if (!username || !email || !password) {
          return Response.json(
            {
              success: false,
              error: "همه فیلدها الزامی هستند",
            },
            { status: 400 }
          );
        }

        if (password.length < 8) {
          return Response.json(
            {
              success: false,
              error: "رمز عبور باید حداقل ۸ کاراکتر باشد",
            },
            { status: 400 }
          );
        }

        const existingUser = await env.DB
          .prepare(
            "SELECT id FROM users WHERE username = ? OR email = ?"
          )
          .bind(username, email)
          .first();

        if (existingUser) {
          return Response.json(
            {
              success: false,
              error: "نام کاربری یا ایمیل قبلاً ثبت شده است",
            },
            { status: 409 }
          );
        }

        const passwordHash = await hashPassword(password);

        const result = await env.DB
          .prepare(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)"
          )
          .bind(username, email, passwordHash)
          .run();

        return Response.json({
          success: true,
          message: "ثبت‌نام با موفقیت انجام شد",
          userId: result.meta.last_row_id,
        });
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: "خطایی در ثبت‌نام رخ داد",
          },
          { status: 500 }
        );
      }
    }

    // مسیرهای API ناشناخته
    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        {
          error: "API route not found",
        },
        { status: 404 }
      );
    }

    // نمایش سایت
    return env.ASSETS.fetch(request);
  },
};

async function hashPassword(password) {
  const encoder = new TextEncoder();

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256
  );

  return `pbkdf2$sha256$100000$${toBase64Url(
    salt
  )}$${toBase64Url(new Uint8Array(bits))}`;
}

function toBase64Url(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
