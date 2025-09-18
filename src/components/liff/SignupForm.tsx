"use client";

import React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";

type SignupFormData = {
  consent: boolean;
  name: string;
  phone: string;
  address?: string;
  hn: string;
  hospital: string;
  referral: string;
};

export default function SignupForm({
  ready,
  isLoggedIn,
  idToken,
  onLogin,
}: {
  ready: boolean;
  isLoggedIn: boolean;
  idToken: string;
  onLogin: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setError,
  } = useForm<SignupFormData>({
    mode: "onChange",
    defaultValues: {
      consent: false,
      name: "",
      phone: "",
      address: "",
      hn: "",
      hospital: "",
      referral: "",
    },
  });

  async function onSubmit(data: SignupFormData) {
    setMsg(null);
    if (!idToken) {
      setError("consent", { type: "manual", message: "" });
      setMsg("กรุณาเข้าสู่ระบบด้วย LINE ก่อน");
      return;
    }
    setSubmitting(true);
    try {
      // Build payload according to LiffSignupRequest contract
      const payload = {
        accessToken: idToken,
        patient: {
          name: data.name.trim(),
          phone: data.phone.replace(/[^0-9]/g, ""),
          address: (data.address || "").trim(),
          hn: data.hn?.trim() || undefined,
          hospital: data.hospital?.trim() || undefined,
        },
        consent: {
          terms_accepted: !!data.consent,
          privacy_accepted: !!data.consent,
        },
        preferences: {
          notifications_enabled: true,
          preferred_contact_method: "line" as const,
        },
      };

      const res = await fetch("/api/liff/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization header is optional for server, keep for future use
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setSuccess(true);
      setMsg("สมัครสมาชิกสำเร็จ — พร้อมจองนัดได้เลย");
      reset({
        consent: false,
        name: "",
        phone: "",
        address: "",
        hn: "",
        hospital: "",
        referral: "",
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "ไม่สามารถส่งข้อมูลได้");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto mt-4 w-full max-w-xl px-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#46688b]">
            สมัครสมาชิก Labmove
          </h1>
          <p className="text-sm text-gray-600">
            เพื่อรับบริการเจาะเลือดที่บ้านอย่างปลอดภัยและรวดเร็ว
          </p>
        </div>
        {/* <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isLoggedIn
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
          aria-live="polite"
        >
          {isLoggedIn ? "เข้าสู่ระบบด้วย LINE แล้ว" : "ยังไม่ได้เข้าสู่ระบบ"}
        </span> */}
      </div>

      {/* Card */}
      <div className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf0f5] text-[#46688b]">
              {/* simple drop icon */}
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 2s6 6.59 6 10.5A6 6 0 1 1 6 12.5C6 8.59 12 2 12 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="m-0 text-base font-semibold">ข้อมูลผู้สมัคร</h2>
              <p className="text-xs text-gray-500">ใช้เวลาประมาณ 1 นาที</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6">
          {/* Error summary */}
          {!!Object.keys(errors).length && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              กรุณาตรวจสอบข้อมูลที่ไฮไลต์
            </div>
          )}

          {/* Group: Main */}
          <fieldset className="mb-5">
            <legend className="mb-2 text-sm font-medium text-gray-700">
              ข้อมูลหลัก
            </legend>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="mb-1 block text-sm text-gray-700">
                  ชื่อ-นามสกุล
                </label>
                <input
                  {...register("name", {
                    required: "กรุณาระบุชื่อ-นามสกุล",
                    minLength: {
                      value: 2,
                      message: "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร",
                    },
                  })}
                  className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-[#46688b] focus:outline-none focus:ring-2 focus:ring-[#46688b]/30 ${
                    errors.name ? "border-rose-300" : "border-gray-300"
                  }`}
                  placeholder="เช่น สมหญิง ใจดี"
                  autoComplete="name"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-700">
                  เบอร์โทร
                </label>
                <input
                  {...register("phone", {
                    required: "กรุณาระบุเบอร์โทร",
                    pattern: {
                      // รองรับเบอร์ไทย 9-10 หลัก (ตัดสัญลักษณ์ได้)
                      value: /^(?:\+?66|0)?\d{8,9}$/,
                      message: "กรุณากรอกเบอร์โทรให้ถูกต้อง",
                    },
                  })}
                  className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-[#46688b] focus:outline-none focus:ring-2 focus:ring-[#46688b]/30 ${
                    errors.phone ? "border-rose-300" : "border-gray-300"
                  }`}
                  placeholder="เช่น 0812345678"
                  inputMode="tel"
                  autoComplete="tel"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  ระบบจะใช้เบอร์นี้สำหรับการติดต่อและแจ้งเตือนนัดหมาย
                </p>
                {errors.phone && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-700">
                  ที่อยู่สำหรับติดต่อ (สามารถเว้นว่างและกรอกภายหลัง)
                </label>
                <input
                  {...register("address")}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#46688b] focus:outline-none focus:ring-2 focus:ring-[#46688b]/30"
                  placeholder="เช่น 123/45 ถนนสุขภาพ แขวงสุขใจ เขตสุขภาพ กรุงเทพฯ"
                  autoComplete="street-address"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  ใช้สำหรับการนัดหมายถึงบ้าน หากไม่สะดวกกรอกตอนนี้ สามารถเพิ่มภายหลังได้
                </p>
              </div>
            </div>
          </fieldset>

          {/* Group: Optional */}
          <fieldset className="mb-5">
            <legend className="mb-2 text-sm font-medium text-gray-700">
              ข้อมูลเพิ่มเติม (ไม่บังคับ)
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-700">HN</label>
                <input
                  {...register("hn")}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#46688b] focus:outline-none focus:ring-2 focus:ring-[#46688b]/30"
                  placeholder="ถ้ามี"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-700">
                  โรงพยาบาล
                </label>
                <input
                  {...register("hospital")}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#46688b] focus:outline-none focus:ring-2 focus:ring-[#46688b]/30"
                  placeholder="ถ้ามี"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-gray-700">
                  ผู้แนะนำ/ฝ่ายขาย
                </label>
                <input
                  {...register("referral")}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#46688b] focus:outline-none focus:ring-2 focus:ring-[#46688b]/30"
                  placeholder="ระบุชื่อผู้แนะนำ (ถ้ามี)"
                />
              </div>
            </div>
          </fieldset>

          {/* Consent */}
          <div className="mb-2 rounded-lg bg-[#f6fbf7] px-3 py-2">
            <label className="flex items-start gap-2 text-sm">
              <input
                {...register("consent", {
                  required: "กรุณายินยอมการใช้งานข้อมูลส่วนบุคคล",
                })}
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#78b54a] focus:ring-[#78b54a]"
                aria-invalid={!!errors.consent}
              />
              <span className="text-gray-700">
                ยินยอมให้เก็บและใช้ข้อมูลเพื่อการให้บริการ ตาม{" "}
                <Link className="underline" href="/privacy" target="_blank">
                  นโยบายความเป็นส่วนตัว
                </Link>
              </span>
            </label>
            {errors.consent && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.consent.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!isLoggedIn && (
              <button
                type="button"
                onClick={onLogin}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#46688b] focus:ring-offset-2"
              >
                เข้าสู่ระบบด้วย LINE
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || !ready || !isLoggedIn || !isValid}
              className="inline-flex w-full items-center justify-center rounded-md bg-[#46688b] px-4 py-2 text-sm font-medium text-white shadow-sm hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#46688b] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                    />
                  </svg>
                  กำลังส่ง…
                </>
              ) : (
                "ส่งข้อมูลสมัครสมาชิก"
              )}
            </button>

            {success && (
              <Link
                href="/booking"
                className="inline-flex items-center justify-center rounded-md border border-[#46688b]/20 bg-white px-4 py-2 text-sm font-medium text-[#46688b] shadow-sm hover:bg-[#46688b]/5 focus:outline-none focus:ring-2 focus:ring-[#46688b] focus:ring-offset-2"
              >
                จองนัดทันที
              </Link>
            )}
          </div>

          {/* Inline feedback */}
          {msg && (
            <div
              className={`mt-3 rounded-md px-3 py-2 text-sm ${
                success
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-800"
              }`}
              role="status"
            >
              {msg}
            </div>
          )}

          {/* Footer trust bar */}
          <div className="mt-6 flex items-center gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2l7 4v6c0 5-3.5 9.5-7 10-3.5-.5-7-5-7-10V6l7-4z"
              />
            </svg>
            ข้อมูลถูกเก็บอย่างปลอดภัย • เจ้าหน้าที่พยาบาลได้รับใบอนุญาต
          </div>
        </form>
      </div>
    </section>
  );
}
