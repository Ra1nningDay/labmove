"use client";

import React from "react";
import SignupForm from "@/components/liff/SignupForm";
import BookingForm from "@/components/liff/BookingForm";

type Mode = "" | "signup" | "booking";

export default function LiffUnifiedPage() {
  const [mode, setMode] = React.useState<Mode>("");
  const [ready, setReady] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [idToken, setIdToken] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [modeLoaded, setModeLoaded] = React.useState(false);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const spMode = (url.searchParams.get("mode") || "").toLowerCase() as Mode;
    let inferred: Mode = spMode;
    if (!inferred) {
      const state = url.searchParams.get("liff.state");
      if (state) {
        try {
          const decoded = decodeURIComponent(state);
          if (/^https?:\/\//i.test(decoded)) {
            const u = new URL(decoded);
            const m = (u.searchParams.get("mode") || "").toLowerCase();
            if (m === "signup" || m === "booking") inferred = m as Mode;
          } else {
            const clean = decoded.startsWith("?") ? decoded.slice(1) : decoded;
            const sp = new URLSearchParams(clean);
            const m = (sp.get("mode") || "").toLowerCase();
            if (m === "signup" || m === "booking") inferred = m as Mode;
          }
        } catch {}
      }
    }
    setMode(inferred);
    setModeLoaded(true);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        const url = new URL(window.location.href);
        const liffId =
          url.searchParams.get("liffId") || process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) throw new Error("Missing LIFF ID");
        await liff.init({ liffId });
        if (!mounted) return;
        const inClient = liff.isInClient();
        const logged = liff.isLoggedIn();
        if (inClient) {
          // In LINE app: avoid auto-login; token should be available if LIFF has openid scope.
          setIsLoggedIn(true);
          setIdToken(liff.getIDToken() || "");
        } else {
          setIsLoggedIn(logged);
          if (logged) setIdToken(liff.getIDToken() || "");
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

  // Show loader while determining mode or LIFF not ready
  if (!modeLoaded || (!ready && !error)) {
    return (
      <main style={{ maxWidth: 520, margin: "24px auto", padding: 16 }}>
        {/* <h1 style={{ margin: 0 }}>LabMove</h1> */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 32,
            padding: 24,
          }}
        >
          <div
            className="spinner"
            style={{
              width: 32,
              height: 32,
              border: "3px solid #f3f3f3",
              borderTop: "3px solid #4f46e5",
              borderRadius: "50%",
            }}
          />
          <p
            style={{
              marginTop: 16,
              color: "#666",
              textAlign: "center",
            }}
          >
            {/* {!modeLoaded ? "กำลังโหลด..." : "กำลังเชื่อมต่อ LINE..."} */}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 520, margin: "24px auto", padding: 16 }}>
      <h1 style={{ margin: 0 }}></h1>
      {error && (
        <div
          style={{
            background: "#ffecec",
            color: "#c00",
            padding: 12,
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          {error}
        </div>
      )}

      {mode === "signup" && (
        <SignupForm
          ready={ready}
          isLoggedIn={isLoggedIn}
          idToken={idToken}
          onLogin={handleLogin}
        />
      )}
      {mode === "booking" && (
        <BookingForm
          ready={ready}
          isLoggedIn={isLoggedIn}
          idToken={idToken}
          onLogin={handleLogin}
        />
      )}

      {!mode && modeLoaded && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: "#666" }}>เลือกโหมดที่ต้องการใช้งาน</p>
          <div style={{ display: "flex", gap: 12 }}>
            <a href="?mode=signup">เปิดสมัครสมาชิก</a>
            <a href="?mode=booking">เปิดจองนัด</a>
          </div>
        </div>
      )}
    </main>
  );
}
