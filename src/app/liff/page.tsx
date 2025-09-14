"use client";

import React from "react";

type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

export default function LiffPage() {
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isInClient, setIsInClient] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [contextType, setContextType] = React.useState<string>("");
  const [idToken, setIdToken] = React.useState<string>("");

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        // liffId priority: query ?liffId=... > env NEXT_PUBLIC_LIFF_ID
        const url = new URL(window.location.href);
        const liffId =
          url.searchParams.get("liffId") || process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId)
          throw new Error(
            "Missing LIFF ID. Provide NEXT_PUBLIC_LIFF_ID or ?liffId=..."
          );
        await liff.init({ liffId });
        if (!mounted) return;
        setIsInClient(liff.isInClient());
        setIsLoggedIn(liff.isLoggedIn());
        setContextType(liff.getContext()?.type ?? "");
        if (!liff.isLoggedIn()) {
          // In browser (outside LINE), allow user to press Login button
        } else {
          try {
            const p = await liff.getProfile();
            setProfile({
              userId: p.userId,
              displayName: p.displayName,
              pictureUrl: p.pictureUrl,
              statusMessage: p.statusMessage,
            });
            setIdToken(liff.getIDToken() || "");
          } catch {}
        }
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogin() {
    const liff = (await import("@line/liff")).default;
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href });
    }
  }

  async function handleLogout() {
    const liff = (await import("@line/liff")).default;
    if (liff.isLoggedIn()) {
      liff.logout();
      window.location.reload();
    }
  }

  async function refreshProfile() {
    const liff = (await import("@line/liff")).default;
    try {
      const p = await liff.getProfile();
      setProfile({
        userId: p.userId,
        displayName: p.displayName,
        pictureUrl: p.pictureUrl,
        statusMessage: p.statusMessage,
      });
      setIdToken(liff.getIDToken() || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function sendMessage() {
    const liff = (await import("@line/liff")).default;
    if (!liff.isInClient()) {
      alert("Please open in LINE app to send messages.");
      return;
    }
    await liff.sendMessages([
      { type: "text", text: "✅ LIFF ทดสอบส่งข้อความสำเร็จ" },
    ]);
    alert("ส่งข้อความกลับห้องแชตแล้ว");
  }

  async function sharePicker() {
    const liff = (await import("@line/liff")).default;
    if (!(await liff.isApiAvailable("shareTargetPicker"))) {
      alert("shareTargetPicker ไม่พร้อมใช้งาน");
      return;
    }
    await liff.shareTargetPicker([
      { type: "text", text: "แชร์จาก Labmove LIFF 🎉" },
    ]);
  }

  async function closeWindow() {
    const liff = (await import("@line/liff")).default;
    if (liff.isInClient()) liff.closeWindow();
    else window.close();
  }

  return (
    <main
      style={{
        maxWidth: 520,
        margin: "24px auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <h1 style={{ margin: 0 }}>Labmove LIFF</h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        ตัวอย่างหน้าทดสอบ LIFF สำหรับเปิดใน LINE
      </p>

      {error && (
        <div
          style={{
            background: "#ffecec",
            color: "#c00",
            padding: 12,
            borderRadius: 8,
            margin: "12px 0",
          }}
        >
          Error: {error}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: 12,
        }}
      >
        <button
          onClick={handleLogin}
          disabled={!ready || isLoggedIn}
          style={{ padding: 12 }}
        >
          Login
        </button>
        <button
          onClick={handleLogout}
          disabled={!ready || !isLoggedIn}
          style={{ padding: 12 }}
        >
          Logout
        </button>
        <button
          onClick={refreshProfile}
          disabled={!ready || !isLoggedIn}
          style={{ padding: 12 }}
        >
          Get Profile
        </button>
        <button onClick={sendMessage} disabled={!ready} style={{ padding: 12 }}>
          Send Message
        </button>
        <button onClick={sharePicker} disabled={!ready} style={{ padding: 12 }}>
          Share Picker
        </button>
        <button onClick={closeWindow} style={{ padding: 12 }}>
          Close
        </button>
      </section>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: "#f7f7f7",
          borderRadius: 8,
        }}
      >
        <div>Ready: {String(ready)}</div>
        <div>In LINE App: {String(isInClient)}</div>
        <div>Logged in: {String(isLoggedIn)}</div>
        <div>Context: {contextType || "-"}</div>
      </div>

      {profile && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#eef8ff",
            borderRadius: 8,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Profile</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {profile.pictureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.pictureUrl}
                alt="avatar"
                width={56}
                height={56}
                style={{ borderRadius: "50%" }}
              />
            )}
            <div>
              <div>
                <strong>{profile.displayName}</strong>
              </div>
              <div style={{ color: "#666", fontSize: 12 }}>
                {profile.userId}
              </div>
              {profile.statusMessage && (
                <div style={{ marginTop: 6 }}>{profile.statusMessage}</div>
              )}
            </div>
          </div>
          {idToken && (
            <details style={{ marginTop: 8 }}>
              <summary>ID Token</summary>
              <code style={{ wordBreak: "break-all", fontSize: 12 }}>
                {idToken}
              </code>
            </details>
          )}
        </div>
      )}

      {!isInClient && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#fff9e6",
            border: "1px solid #ffe08a",
            borderRadius: 8,
          }}
        >
          <b>คำแนะนำ:</b> เปิดหน้านี้ด้วย LIFF URL ในห้องแชต OA เพื่อใช้งานครบ
          (ส่งข้อความ/ปิดหน้าต่าง)
        </div>
      )}
    </main>
  );
}
