const DEFAULT = { lat: 12.9716, lng: 77.5946 };
const ZOOM = 15;

function worldPoint(lat: number, lng: number) {
  const n = 2 ** ZOOM;
  const x = ((lng + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  return { x, y };
}

function fromWorld(x: number, y: number) {
  const n = 2 ** ZOOM;
  const lng = (x / n) * 360 - 180;
  const merc = Math.PI * (1 - (2 * y) / n);
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(merc));
  return { lat, lng };
}

export function MapPinPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (next: { lat: number; lng: number }) => void;
}) {
  const point = worldPoint(lat, lng);
  const tileX = Math.floor(point.x);
  const tileY = Math.floor(point.y);
  const left = (point.x - tileX) * 256;
  const top = (point.y - tileY) * 256;

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-label="Map. Click to place the visit pin."
        className="relative block h-64 w-64 overflow-hidden rounded-xl border border-border"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = tileX + (event.clientX - rect.left) / 256;
          const y = tileY + (event.clientY - rect.top) / 256;
          onChange(fromWorld(x, y));
        }}
      >
        <img
          alt=""
          className="pointer-events-none h-64 w-64 max-w-none"
          src={`https://tile.openstreetmap.org/${ZOOM}/${tileX}/${tileY}.png`}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary"
          style={{ left, top }}
        />
      </button>
      <p className="text-xs text-muted-foreground">© OpenStreetMap contributors</p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["North", 0.002, 0],
            ["South", -0.002, 0],
            ["East", 0, 0.002],
            ["West", 0, -0.002],
          ] as const
        ).map(([label, dLat, dLng]) => (
          <button
            key={label}
            type="button"
            className="min-h-11 rounded-lg border border-border px-3 text-sm"
            onClick={() => onChange({ lat: lat + dLat, lng: lng + dLng })}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const DEFAULT_PIN = DEFAULT;
