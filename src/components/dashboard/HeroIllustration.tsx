import Image from "next/image";

export default function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <Image
        src="/images/control_room_weather.jpg"
        alt="ICCC weather control room monitoring Chennai rainfall"
        fill
        sizes="(max-width: 1024px) 100vw, 560px"
        className="object-cover object-center"
      />
    </div>
  );
}
