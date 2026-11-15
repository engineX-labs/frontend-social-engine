export function Marca() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5 text-[17px] font-extrabold tracking-tight">
      <svg
        width="24"
        height="24"
        viewBox="0 0 16 16"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2.5 2.5 13 13" stroke="currentColor" />
        <path d="M2.5 13.5 13 3M7.5 3H13v5.5" className="stroke-accent" />
      </svg>
      <span className="whitespace-nowrap">social engine</span>
      <span className="rotulo hidden border-l border-line pl-2.5 lg:inline">engineX</span>
    </span>
  )
}
