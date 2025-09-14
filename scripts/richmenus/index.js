// Minimal LINE rich menu CLI for this repo
// Usage via package.json scripts, requires:
// - env LINE_CHANNEL_ACCESS_TOKEN
// - env NEXT_PUBLIC_LIFF_ID

import fs from "fs";
import path from "path";

// Load .env locally if present (minimal parser)
(() => {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        if (!line || line.trim().startsWith("#")) continue;
        const i = line.indexOf("=");
        if (i === -1) continue;
        const k = line.slice(0, i).trim();
        let v = line.slice(i + 1);
        // remove surrounding quotes
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        if (!(k in process.env)) process.env[k] = v;
      }
    }
  } catch {}
})();

const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;

if (!ACCESS_TOKEN) {
  console.error("Missing LINE_CHANNEL_ACCESS_TOKEN");
  process.exit(1);
}

async function lineFetch(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${init.method || "GET"} ${url} -> ${res.status} ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

function buildAreas() {
  if (!LIFF_ID) throw new Error("Missing NEXT_PUBLIC_LIFF_ID");
  // 2500x1686 grid
  const rowH = 843;
  const colW1 = 833; // 833 + 834 + 833 = 2500
  const colW2 = 834;
  const topLeftW = colW1 + colW2; // 1666
  return [
    // พูดคุยกับผู้ช่วย (message)
    {
      bounds: { x: 0, y: 0, width: topLeftW, height: rowH },
      action: { type: "message", text: "คุยกับผู้ช่วย" },
    },
    // สมัครสมาชิก (LIFF)
    {
      bounds: { x: topLeftW, y: 0, width: colW2, height: rowH },
      action: {
        type: "uri",
        uri: `https://liff.line.me/${LIFF_ID}?mode=signup`,
      },
    },
    // จองนัดเจาะเลือด (LIFF)
    {
      bounds: { x: 0, y: rowH, width: colW1, height: rowH },
      action: {
        type: "uri",
        uri: `https://liff.line.me/${LIFF_ID}?mode=booking`,
      },
    },
    // รายละเอียดนัด (postback)
    {
      bounds: { x: colW1, y: rowH, width: colW2, height: rowH },
      action: {
        type: "postback",
        data: JSON.stringify({ action: "booking_details" }),
      },
    },
    // โปรไฟล์ (postback)
    {
      bounds: { x: colW1 + colW2, y: rowH, width: colW1, height: rowH },
      action: {
        type: "postback",
        data: JSON.stringify({ action: "profile_show" }),
      },
    },
  ];
}

async function createMenu() {
  const body = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "menu",
    chatBarText: "เมนูหลัก",
    areas: buildAreas(),
  };
  const { richMenuId } = await lineFetch(
    "https://api.line.me/v2/bot/richmenu",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  return richMenuId;
}

async function uploadImage(richMenuId) {
  const imgPath = path.join(
    process.cwd(),
    "public",
    "richmenu",
    "richmenu.png"
  );
  if (!fs.existsSync(imgPath)) throw new Error(`Image not found: ${imgPath}`);
  const buf = fs.readFileSync(imgPath);
  // Confirm the menu exists before upload (propagation guard)
  await waitUntilExists(richMenuId, 10_000);
  // Image upload/download uses api-data host per LINE docs
  await lineFetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: buf,
    }
  );
}

async function setDefault(richMenuId) {
  await lineFetch(
    `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
    {
      method: "POST",
    }
  );
}

async function ensureAlias(richMenuId, aliasId = "menu") {
  // Try to create; if exists, update
  try {
    await lineFetch("https://api.line.me/v2/bot/richmenu/alias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ richMenuAliasId: aliasId, richMenuId }),
    });
  } catch {
    // Update existing alias
    await lineFetch(`https://api.line.me/v2/bot/richmenu/alias/${aliasId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ richMenuId }),
    });
  }
}

async function list() {
  const res = await lineFetch("https://api.line.me/v2/bot/richmenu/list");
  const alias = await lineFetch(
    "https://api.line.me/v2/bot/richmenu/alias/list"
  ).catch(() => ({ aliases: [] }));
  console.log(JSON.stringify({ list: res, aliases: alias }, null, 2));
}

async function deleteAll() {
  const res = await lineFetch("https://api.line.me/v2/bot/richmenu/list");
  const ids = (res.richmenus || []).map((m) => m.richMenuId);
  for (const id of ids) {
    await lineFetch(`https://api.line.me/v2/bot/richmenu/${id}`, {
      method: "DELETE",
    });
  }
  console.log(`Deleted ${ids.length} rich menu(s)`);
}

async function deleteOthers(keepAlias = "menu") {
  const alias = await lineFetch(
    "https://api.line.me/v2/bot/richmenu/alias/list"
  ).catch(() => ({ aliases: [] }));
  const keep = (alias.aliases || []).find(
    (a) => a.richMenuAliasId === keepAlias
  );
  const keepId = keep?.richMenuId;
  const res = await lineFetch("https://api.line.me/v2/bot/richmenu/list");
  const ids = (res.richmenus || []).map((m) => m.richMenuId);
  for (const id of ids) {
    if (id !== keepId)
      await lineFetch(`https://api.line.me/v2/bot/richmenu/${id}`, {
        method: "DELETE",
      });
  }
  console.log(`Deleted others, kept: ${keepId || "none"}`);
}

async function uploadByAlias(aliasId = "menu") {
  const alias = await lineFetch(
    "https://api.line.me/v2/bot/richmenu/alias/list"
  ).catch(() => ({ aliases: [] }));
  const a = (alias.aliases || []).find((x) => x.richMenuAliasId === aliasId);
  if (!a) throw new Error(`Alias not found: ${aliasId}`);
  await uploadImage(a.richMenuId);
  console.log("Uploaded image to", aliasId, a.richMenuId);
}

async function createAll() {
  const id = await createMenu();
  await uploadImage(id);
  await ensureAlias(id, "menu");
  await setDefault(id);
  console.log("Created and set default rich menu:", id);
}

async function main() {
  const cmd = process.argv[2];
  try {
    switch (cmd) {
      case "create-all":
        await createAll();
        break;
      case "list":
        await list();
        break;
      case "delete-all":
        await deleteAll();
        break;
      case "delete-others":
        await deleteOthers();
        break;
      case "set-default": {
        const id = process.argv[3];
        if (!id) throw new Error("Usage: set-default <richMenuId>");
        await setDefault(id);
        console.log("Set default to", id);
        break;
      }
      case "upload-image": {
        const alias = process.argv[3] || "menu";
        await uploadByAlias(alias);
        break;
      }
      case "whoami": {
        const info = await lineFetch("https://api.line.me/v2/bot/info");
        console.log(JSON.stringify(info, null, 2));
        break;
      }
      case "get": {
        const id = process.argv[3];
        if (!id) throw new Error("Usage: get <richMenuId>");
        const data = await getRichMenu(id);
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case "upload-id": {
        const id = process.argv[3];
        if (!id) throw new Error("Usage: upload-id <richMenuId>");
        await uploadImage(id);
        console.log("Uploaded image to", id);
        break;
      }
      default:
        console.log("Usage: node scripts/richmenus/index.js <command>");
        console.log(
          "Commands: create-all | list | whoami | get <id> | upload-id <id> | delete-all | delete-others | set-default <id> | upload-image [alias]"
        );
    }
  } catch (e) {
    console.error("[richmenu] Error:", e.message || e);
    process.exit(1);
  }
}

main();

async function getRichMenu(id) {
  return lineFetch(`https://api.line.me/v2/bot/richmenu/${id}`);
}

async function waitUntilExists(id, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await getRichMenu(id);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  // one last attempt; will throw if not found
  await getRichMenu(id);
}
