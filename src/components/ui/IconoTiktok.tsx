/** Glifo de TikTok con el mismo trazo que el resto de los íconos (lucide ya no trae marcas). */
export function IconoTiktok({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 3v11.5a4.5 4.5 0 1 1-4.5-4.5" />
      <path d="M15 3c.4 2.6 2.2 4.4 5 4.6" />
    </svg>
  )
}
