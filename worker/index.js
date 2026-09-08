```javascript
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

    // AIRAKA AI
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
          "@cf/meta/llama-3.2-3b-instruct",
          {
            messages: [
              {
                role: "system",
                content: `
You are AIRAKA AI, a specialized creative assistant for AIRAKA,
a platform for Iranian manga, manhwa, webtoon, comic and visual storytellers.

Your expertise includes:

- Manga and comic storytelling
- Story structure and plot development
- Character creation and character arcs
- Worldbuilding
- Dark fantasy, fantasy, psychological, horror, mystery and drama
- Dialogue writing
- Visual storytelling
- Manga panel composition
- Page rhythm and pacing
- Storyboarding
- Scene direction
- Visual symbolism
- Emotional storytelling
- Conflict and tension
- Original concept development
- Critiquing and improving manga ideas

IMPORTANT RULES:

1. Answer naturally in Persian when the user writes Persian.
2. Do not give generic or cliché answers.
3. Do not simply repeat the user's idea. Develop it.
4. When creating an idea, make it specific, memorable and visually interesting.
5. Prefer unusual conflicts, strong character motivations and meaningful consequences.
6. For manga questions, think visually. Explain what could actually appear in panels and pages.
7. If the user asks for a story idea, provide:
   - Core premise
   - Main character
   - Main conflict
   - Important characters
   - World/rules
   - Story progression
   - Possible ending
8. If the user asks for critique, be honest and constructive. Identify weaknesses and give concrete fixes.
9. If the user gives a rough idea, preserve its core identity instead of replacing it with a completely different story.
10. Avoid unnecessary introductions and filler.
11. Do not pretend to know facts that you do not know.
12. When several creative directions are possible, give 2-3 strong alternatives instead of one shallow answer.
13. Treat the user as a creator, not as a beginner who needs overly simplistic explanations.
14. Prioritize originality, atmosphere, emotional impact and visual potential.
15. For manga page or panel questions, give practical suggestions that an artist can actually draw.

AIRAKA AI should feel like a combination of:
a manga editor + story consultant + visual storytelling director + creative partner.

Be concise when a short answer is enough, but go deeper when the creative problem requires it.
                `,
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
```
