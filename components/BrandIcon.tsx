type BrandIconProps = {
  className?: string;
};

export function BrandIcon({ className }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="20" fill="#CFE3EF" />
      <path
        d="M10 53C14 45 20 39 27 39C30 39 33 40 36 42C39 35 45 30 52 30C56 30 59 31 62 34V64H10V53Z"
        fill="#7E9179"
      />
      <path
        d="M34 10C24.6112 10 17 17.6112 17 27V41C17 42.6569 18.3431 44 20 44C21.6569 44 23 45.3431 23 47C23 48.6569 24.3431 50 26 50H42C43.6569 50 45 48.6569 45 47C45 45.3431 46.3431 44 48 44C49.6569 44 51 42.6569 51 41V27C51 17.6112 43.3888 10 34 10Z"
        fill="#FFFDF7"
        stroke="#10161A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M25 28C26.5 30 29.5 30 31 28"
        stroke="#10161A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M37 28C38.5 30 41.5 30 43 28"
        stroke="#10161A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="31" y="28" width="2.6" height="9.5" rx="1.3" fill="#10161A" />
      <path
        d="M27 40C29 42 32 43 35 43C38 43 40.5 42 42.5 40"
        stroke="#10161A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M31.5 50V42"
        stroke="#10161A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M41 39L45.5 34"
        stroke="#203321"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 53L22.5 45"
        stroke="#203321"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
