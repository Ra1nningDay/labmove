"use client";

import React from "react";
import { useForm } from "react-hook-form";

type SignupFormData = {
  consent: boolean;
  name: string;
  phone: string;
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

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<SignupFormData>({
    mode: "onChange",
    defaultValues: {
      consent: false,
      name: "",
      phone: "",
      hn: "",
      hospital: "",
      referral: "",
    },
  });

  async function onSubmit(data: SignupFormData) {
    setMsg(null);
    if (!idToken) return setMsg("กรุณา Login ผ่าน LINE ก่อน");
    setSubmitting(true);
    try {
      const res = await fetch("/api/liff/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setMsg("ส่งข้อมูลสมัครสมาชิกเรียบร้อย");
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
        <h2 className="m-0 text-lg font-semibold">สมัครสมาชิก</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
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
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="เช่น สมชาย ใจดี"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                เบอร์โทร
              </label>
              <input
                {...register("phone", {
                  required: "กรุณาระบุเบอร์โทร",
                  validate: (value) => {
                    const phoneOnly = value.replace(/[^0-9]/g, "");
                    if (phoneOnly.length < 9) {
                      return "เบอร์โทรต้องมีอย่างน้อย 9 หลัก";
                    }
                    return true;
                  },
                })}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="เช่น 0812345678"
                inputMode="tel"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  HN (ถ้ามี)
                </label>
                <input
                  {...register("hn")}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="ระบุถ้ามี"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  โรงพยาบาล (ถ้ามี)
                </label>
                <input
                  {...register("hospital")}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="ระบุถ้ามี"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ผู้แนะนำ/ฝ่ายขาย (ถ้ามี)
              </label>
              <input
                {...register("referral")}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ระบุชื่อผู้แนะนำถ้ามี"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              {...register("consent", {
                required: "กรุณายินยอมการใช้งานข้อมูลส่วนบุคคล",
              })}
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>ยินยอมให้เก็บและใช้ข้อมูลเพื่อการให้บริการ</span>
          </label>
          {errors.consent && (
            <p className="mt-1 text-xs text-red-600">
              {errors.consent.message}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {!isLoggedIn && (
              <button
                type="button"
                onClick={onLogin}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Login with LINE
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || !ready || !isLoggedIn || !isValid}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "กำลังส่ง…" : "ส่งข้อมูลสมัครสมาชิก"}
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
