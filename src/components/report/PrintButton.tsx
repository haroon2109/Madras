"use client";

/** Print/PDF button: opens the browser print dialog (save as PDF). */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-[#1A73E8] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#202124]"
    >
      Print / PDF
    </button>
  );
}
