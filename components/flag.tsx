import Image from "next/image";

export function Flag({ iso, size = 20 }: { iso: string; size?: number }) {
  return (
    <span
      className="inline-block flex-shrink-0 overflow-hidden rounded-full bg-surface-card"
      style={{ width: size, height: size }}
    >
      <Image
        src={`/flags/${iso}.svg`}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </span>
  );
}