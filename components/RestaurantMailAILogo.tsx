export default function RestaurantMailAILogo({
  className = "w-6 h-6",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9" fill="#1E3A5F" />
      <rect
        x="6"
        y="8"
        width="20"
        height="14"
        rx="2.5"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      <path
        d="M7 10.5L16 16.5L25 10.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="25" r="2" fill="#F59E0B" />
    </svg>
  );
}
