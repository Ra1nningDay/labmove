"use client";

import React from "react";
import SignupForm from "@/components/liff/SignupForm";
import BookingForm from "@/components/liff/BookingForm";
import Navbar from "@/components/liff/Navbar";

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
        <Navbar />
        <main className="max-w-lg mx-auto">
          <div className="flex flex-col items-center mt-8 p-6">
            <div className="spinner w-8 h-8 border-3 border-gray-200 border-t-indigo-600 rounded-full" />
            <p className="mt-4 text-gray-600 text-center">
              {!modeLoaded ? "กำลังโหลด..." : "กำลังเชื่อมต่อ LINE..."}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      <Navbar />
      <main className="max-w-lg mx-auto">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mt-3">
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
          <div className="mt-3 p-6 bg-white rounded-2xl shadow-lg text-center">
            <h2 className="text-xl font-semibold text-blue-600 mb-4">
              เลือกบริการที่ต้องการ
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              เลือกโหมดที่ต้องการใช้งาน
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="?mode=signup"
                className="block py-3 px-5 bg-gradient-to-r from-blue-400 to-blue-500 text-white no-underline rounded-lg font-medium hover:from-blue-500 hover:to-blue-600 transition-all duration-200 hover:scale-105"
              >
                📝 สมัครสมาชิก
              </a>
              <a
                href="?mode=booking"
                className="block py-3 px-5 bg-gradient-to-r from-red-400 to-red-500 text-white no-underline rounded-lg font-medium hover:from-red-500 hover:to-red-600 transition-all duration-200 hover:scale-105"
              >
                📅 จองนัดเจาะเลือด
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
