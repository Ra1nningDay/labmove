"use client";

import React from "react";
import { useForm } from "react-hook-form";

type BookingFormData = {
  address: string;
  datePreference: string;
  bookingDate: string;
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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<BookingFormData>({
    mode: "onChange",
    defaultValues: {
      address: "",
      datePreference: "",
      bookingDate: "",
      note: "",
    },
  });

  const watchedDatePreference = watch("datePreference");
  const watchedBookingDate = watch("bookingDate");

  async function onSubmit(data: BookingFormData) {
    setMsg(null);
    if (!idToken) return setMsg("กรุณา Login ผ่าน LINE ก่อน");
    if (!data.datePreference && !data.bookingDate)
      return setMsg(
        "กรุณาระบุวัน (เร็วที่สุด/วันนี้/พรุ่งนี้ หรือเลือกวันที่)"
      );
    setSubmitting(true);
    try {
      const payload: any = {
        address: data.address,
        note: data.note,
      };
      if (data.bookingDate) payload.bookingDate = data.bookingDate;
      else payload.datePreference = data.datePreference || "เร็วที่สุด";

      const res = await fetch("/api/liff/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setMsg("ส่งคำขอจองนัดเรียบร้อย");
      reset(); // Reset form after successful submission
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "ไม่สามารถส่งข้อมูลได้");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-4">
      <div className="mx-auto w-full max-w-xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="m-0 text-lg font-semibold">จองนัดเจาะเลือด</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3">
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
                className="block w-full min-h-24 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="บ้านเลขที่ ถนน เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
              />
              {errors.address && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.address.message}
                </p>
              )}
            </div>
            {/* <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  ละติจูด (ตัวเลือก)
                </label>
                <input
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="เช่น 13.7563"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  ลองจิจูด (ตัวเลือก)
                </label>
                <input
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="เช่น 100.5018"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  inputMode="decimal"
                />
              </div>
            </div> */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  วันแบบข้อความ
                </label>
                <input
                  {...register("datePreference", {
                    validate: (value) => {
                      // ต้องมีอย่างน้อย datePreference หรือ bookingDate
                      if (!value && !watchedBookingDate) {
                        return "กรุณาระบุวันที่ต้องการ (ข้อความหรือเลือกวันที่)";
                      }
                      return true;
                    },
                  })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="เร็วที่สุด/วันนี้/พรุ่งนี้"
                />
                <p className="mt-1 text-xs text-gray-500">
                  หรือเลือกวันที่ด้านขวา
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  เลือกวันที่
                </label>
                <input
                  {...register("bookingDate", {
                    validate: (value) => {
                      // ต้องมีอย่างน้อย datePreference หรือ bookingDate
                      if (!value && !watchedDatePreference) {
                        return "กรุณาระบุวันที่ต้องการ (ข้อความหรือเลือกวันที่)";
                      }
                      return true;
                    },
                  })}
                  type="date"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            {(errors.datePreference || errors.bookingDate) && (
              <p className="mt-1 text-xs text-red-600">
                {errors.datePreference?.message || errors.bookingDate?.message}
              </p>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                หมายเหตุ (ตัวเลือก)
              </label>
              <input
                {...register("note")}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ข้อมูลเพิ่มเติม เช่น ช่วงเวลาที่สะดวก"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {/* {!isLoggedIn && (
              <button
                type="button"
                onClick={onLogin}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Login with LINE
              </button>
            )} */}
            <button
              type="submit"
              disabled={submitting || !ready || !isLoggedIn || !isValid}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "กำลังส่ง…" : "ส่งคำขอจองนัด"}
            </button>
          </div>

          {msg && (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {msg}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
