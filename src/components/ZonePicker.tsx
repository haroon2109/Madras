"use client";

import { useRouter, usePathname } from "next/navigation";

export interface PickerZone {
  id: string;
  number: number;
  name: string;
}

export default function ZonePicker({ zones, selectedId }: { zones: PickerZone[]; selectedId: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(`${pathname}?zone=${e.target.value}`)}
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
    >
      {zones.map((z) => (
        <option key={z.id} value={z.id}>
          Zone {z.number} — {z.name}
        </option>
      ))}
    </select>
  );
}