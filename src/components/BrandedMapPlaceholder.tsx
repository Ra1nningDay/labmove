import React from "react";
import { Button } from "@/components/ui/button";

interface BrandedMapPlaceholderProps {
  onOpenMap?: () => void;
  isLoading?: boolean;
}

export function BrandedMapPlaceholder({
  onOpenMap,
  isLoading = false,
}: BrandedMapPlaceholderProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50/90 via-white/80 to-green-50/90 backdrop-blur-sm">
      {/* Brand/Title Section */}
      <div className="text-center mb-8 px-4">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 tracking-tight">
            LabMove
          </h3>
        </div>
        <p className="text-gray-600 text-base max-w-[320px] leading-relaxed">
          แผนที่อัจฉริยะสำหรับการจัดการเส้นทางเจาะเลือดถึงบ้าน
        </p>
      </div>

      {/* Interactive CTA */}
      <div className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          onClick={onOpenMap}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 text-lg font-medium shadow-xl transition-all duration-300 hover:shadow-2xl cursor-pointer"
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              กำลังโหลด...
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              เปิดแผนที่
            </div>
          )}
        </Button>

        {/* {isLoading && (
          <div className="text-sm text-gray-600 bg-white/80 px-6 py-3 rounded-full border shadow-md animate-pulse">
            กำลังเตรียมแผนที่อัจฉริยะ...
          </div>
        )} */}
      </div>

      {/* Feature Hints */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>ตำแหน่งงาน</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>เจ้าหน้าที่</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span>เส้นทาง</span>
          </div>
        </div>
      </div>
    </div>
  );
}
