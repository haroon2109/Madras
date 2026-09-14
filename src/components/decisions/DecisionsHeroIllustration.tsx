import Image from "next/image";

export default function DecisionsHeroIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <Image
        src="/images/weather_data_analytics.jpg"
        alt="Weather analytics interface for Chennai rainfall decisions"
        fill
        sizes="(max-width: 1024px) 100vw, 560px"
        className="object-cover object-center"
      />
    </div>
  );
}
