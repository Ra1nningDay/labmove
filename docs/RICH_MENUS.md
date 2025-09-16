# Rich Menu (Single Menu)

- One canonical rich menu with alias `menu` only (no auto switching to avoid confusion).
- Size: full `2500x1686` arranged as a 3x2 grid (six touch areas).
- Each area opens LIFF using `https://liff.line.me/<LIFF_ID>?mode=<intent>`.
- Placeholder image is generated programmatically (brand colors, tiles, simple icons). You can replace with designed PNG later without changing the layout.

## Commands

- `pnpm richmenu:create-all` — create the single `menu` rich menu and set it as default.
- `pnpm richmenu:list` — list current rich menus and aliases.
- `pnpm richmenu:delete-others` — delete all menus except the current `menu` alias.
- `pnpm richmenu:set-default menu` — set default explicitly.
- `pnpm richmenu:delete-all` — delete everything (use with care).

## Notes

- Requires env: `LINE_CHANNEL_ACCESS_TOKEN`, `NEXT_PUBLIC_LIFF_ID`.
- Image size is `2500x1686`. The layout assumes 3 columns × 2 rows.
- Keep flows deterministic; when intents change, update both Flex templates and these rich menu links.

## Areas (3x2)

1. สมัครใช้งาน → `mode=signup`
2. จองนัดเจาะเลือด → `mode=booking`
3. โปรไฟล์ → `mode=profile`
4. แก้ไขที่อยู่ → `mode=edit_address`
5. แก้ไขวันที่ → `mode=edit_date`
