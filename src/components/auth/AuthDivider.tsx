export function AuthDivider() {
  return (
    <div className="relative my-8">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-[#DADCE0]"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-white px-4 text-[#5F6368]">or</span>
      </div>
    </div>
  );
}
