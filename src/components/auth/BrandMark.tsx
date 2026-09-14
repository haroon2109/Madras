"use client";

import Image from "next/image";

export function BrandMark({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <Image
      src="/images/madras-m-uploaded.png"
      alt="Madras M logo"
      width={200}
      height={210}
      className={`${className} object-contain`}
    />
  );
}
