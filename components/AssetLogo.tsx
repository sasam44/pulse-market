import type { Asset } from "@/lib/types";

export default function AssetLogo({ asset, size = 36 }: { asset: Asset; size?: number }) {
  if (asset.type === "crypto" && asset.image) {
    return (
      <img
        src={asset.image}
        alt={asset.name}
        width={size}
        height={size}
        className="rounded-full shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full grid place-items-center text-white font-bold shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: asset.type === "stock" ? "linear-gradient(135deg,var(--accent-2),#9b6cf7)" : "linear-gradient(135deg,var(--accent),#6c8cf7)",
      }}
    >
      {asset.symbol.slice(0, 2)}
    </div>
  );
}
