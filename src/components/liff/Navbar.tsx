"use client";

import React from "react";
import { Car } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="bg-gradient-to-r from-blue-400 via-blue-500 to-red-500 p-4 rounded-b-2xl shadow-lg mb-6">
      <div className="flex items-center justify-center max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {/* Lab Icon */}
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">
            <Car className="text-white w-5 h-5" />
          </div>

          {/* Brand Name */}
          <h1 className="text-white text-2xl font-bold tracking-wide drop-shadow-md">
            LabMove
          </h1>
        </div>
      </div>
    </nav>
  );
}
