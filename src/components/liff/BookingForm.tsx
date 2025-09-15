"use client";

import React from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";

type BookingFormData = {
  address: string;
  bookingDate: string; // เลือกวันที่แบบปฏิทิน (YYYY-MM-DD)
  note: string;
};

export default function BookingForm({
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
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<BookingFormData>({
    mode: "onChange",
    defaultValues: {
      address: "",
      bookingDate: new Date().toISOString().slice(0, 10), // ค่าเริ่มต้นเป็นวันปัจจุบัน
      note: "",
    },
  });

  const watchedBookingDate = watch("bookingDate");

  // helpers
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const tomorrowISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  async function onSubmit(data: BookingFormData) {
    setMsg(null);
    if (!idToken) return setMsg("กรุณาเข้าสู่ระบบด้วย LINE ก่อน");
    if (!data.bookingDate) {
      return setMsg("กรุณาเลือกวันที่");
    }

    setSubmitting(true);
    try {
      const payload = {
        address: data.address,
        bookingDate: data.bookingDate,
        note: data.note,
      };

      const res = await fetch("/api/liff/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setSuccess(true);
      setMsg("ส่งคำขอจองนัดเรียบร้อย");
      reset({
        address: "",
        bookingDate: new Date().toISOString().slice(0, 10),
        note: "",
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
            จองนัดเจาะเลือดที่บ้าน
          </h1>
          <p className="text-sm text-gray-600">
            เลือกวันได้ทันที ใช้เวลากรอกไม่ถึง 1 นาที
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
              {/* icon drop */}
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 2s6 6.59 6 10.5A6 6 0 1 1 6 12.5C6 8.59 12 2 12 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="m-0 text-base font-semibold">
                รายละเอียดการนัดหมาย
              </h2>
              <p className="text-xs text-gray-500">
                ยืนยันวันและที่อยู่สำหรับให้บริการ
              </p>
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

          <div className="grid grid-cols-1 gap-4">
            {/* Address */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ที่อยู่สำหรับให้บริการ
              </label>
              <textarea
                {...register("address", {
                  required: "กรุณาระบุที่อยู่",
                  minLength: {
                    value: 6,
                    message:
                      "กรุณาระบุที่อยู่ให้ครบถ้วน (อย่างน้อย 6 ตัวอักษร)",
                  },
                })}
                className={`block w-full min-h-28 rounded-md border px-3 py-2 text-sm shadow-sm focus:border-[#46688b] focus:outline-none focus:ring-2 focus:ring-[#46688b]/30 ${
                  errors.address ? "border-rose-300" : "border-gray-300"
                }`}
                placeholder="บ้านเลขที่ ซอย/ถนน เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                autoComplete="street-address"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                ตัวอย่าง: 123/4 หมู่บ้านสุขใจ ถ.รามคำแหง แขวง/เขต บางกะปิ กทม.
                10240
              </p>
              {errors.address && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.address.message}
                </p>
              )}
            </div>

            {/* Date picker */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                วันที่นัดหมาย
              </label>
              <input
                {...register("bookingDate", {
                  required: "กรุณาเลือกวันที่นัดหมาย",
                })}
                type="date"
                className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-[#46688b] focus:outline-none focus:ring-2 focus:ring-[#46688b]/30 ${
                  errors.bookingDate ? "border-rose-300" : "border-gray-300"
                }`}
                min={todayISO()}
              />
              {errors.bookingDate && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.bookingDate.message}
                </p>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                หมายเหตุ (ตัวเลือก)
              </label>
              <input
                {...register("note")}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#46688b] focus:outline-none focus:ring-2 focus:ring-[#46688b]/30"
                placeholder="เช่น ช่วงเวลาที่สะดวก 08:00–10:00 / มีสัตว์เลี้ยง"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
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
              {submitting ? "กำลังส่ง…" : "ส่งคำขอจองนัด"}
            </button>

            {success && (
              <Link
                href="/profile"
                className="inline-flex items-center justify-center rounded-md border border-[#46688b]/20 bg-white px-4 py-2 text-sm font-medium text-[#46688b] shadow-sm hover:bg-[#46688b]/5 focus:outline-none focus:ring-2 focus:ring-[#46688b] focus:ring-offset-2"
              >
                กลับไปดูโปรไฟล์
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

          {/* Trust bar */}
          <div className="mt-6 flex items-center gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2l7 4v6c0 5-3.5 9.5-7 10-3.5-.5-7-5-7-10V6l7-4z"
              />
            </svg>
            นัดหมายยืดหยุ่น • พยาบาลวิชาชีพให้บริการถึงบ้าน
          </div>
        </form>
      </div>
    </section>
  );
}
