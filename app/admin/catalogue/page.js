// catalogue/page.js

"use client";

import { useState } from "react";
import ProductForm from "../../components/ProductForm";
import ProductAnalytics from "../../components/ProductAnalytics";

export default function AdminCataloguePage() {
  const [activeView, setActiveView] = useState("catalogue");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
          {/* Left Section - Title and Info */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-blue-600 animate-lightning"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">
                  Product Catalogue
                </h1>
              </div>
            </div>
            <p className="text-base mt-4 text-gray-700">
              Create and manage your product inventory
            </p>
          </div>

          {/* Right Section - View Toggle */}
          <div className="w-full sm:w-auto bg-blue-50 rounded-lg p-4 border border-blue-100 shadow-md">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveView("catalogue")}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeView === "catalogue"
                  ? "bg-white text-blue-700 shadow-sm border border-blue-200"
                  : "text-gray-600 hover:bg-white/50"
                  }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                Catalogue
              </button>
              <button
                onClick={() => setActiveView("analytics")}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeView === "analytics"
                  ? "bg-white text-blue-700 shadow-sm border border-blue-200"
                  : "text-gray-600 hover:bg-white/50"
                  }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Analytics
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === "catalogue" ? <ProductForm /> : <ProductAnalytics />}
    </div>
  );
}
