// Inline stroke SVGs copied from the design canvas. No icon library.
type P = { size?: number; className?: string; strokeWidth?: number };

const svg = (size: number, strokeWidth: number, className: string | undefined, children: React.ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    aria-hidden="true"
    className={className}
  >
    {children}
  </svg>
);

export const Mic = ({ size = 20, strokeWidth = 2, className }: P) =>
  svg(size, strokeWidth, className, <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></>);

export const Plus = ({ size = 20, strokeWidth = 2.2, className }: P) =>
  svg(size, strokeWidth, className, <path d="M12 5v14M5 12h14" />);

export const Tick = ({ size = 14, strokeWidth = 2.5, className }: P) =>
  svg(size, strokeWidth, className, <path d="M20 6L9 17l-5-5" />);

export const Back = ({ size = 20, strokeWidth = 2, className }: P) =>
  svg(size, strokeWidth, className, <path d="M15 18l-6-6 6-6" />);

export const Chevron = ({ size = 18, strokeWidth = 2, className }: P) =>
  svg(size, strokeWidth, className, <path d="M9 6l6 6-6 6" />);

export const Close = ({ size = 18, strokeWidth = 2, className }: P) =>
  svg(size, strokeWidth, className, <path d="M18 6L6 18M6 6l12 12" />);

export const Warning = ({ size = 18, strokeWidth = 2.2, className }: P) =>
  svg(size, strokeWidth, className, <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />);

export const Today = ({ size = 22, strokeWidth = 1.8, className }: P) =>
  svg(size, strokeWidth, className, <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.8 2.8L16 9.8" /></>);

export const Sun =({ size = 22, strokeWidth = 1.8, className }: P) =>
  svg(size, strokeWidth, className, <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);

export const Grid = ({ size = 22, strokeWidth = 1.8, className }: P) =>
  svg(size, strokeWidth, className, <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></>);

export const Bulb = ({ size = 22, strokeWidth = 1.8, className }: P) =>
  svg(size, strokeWidth, className, <path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5V16h8v-2.5A6 6 0 0012 3z" />);

export const Pulse = ({ size = 22, strokeWidth = 1.8, className }: P) =>
  svg(size, strokeWidth, className, <path d="M3 12h4l3-8 4 16 3-8h4" />);
