import Image from "next/image";

export function RitsAiLogo({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/rits_ai_logo/rits_ai_logo_blue_color_transparent_background_only_logo_no_text.png"
      alt="Rits AI"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
