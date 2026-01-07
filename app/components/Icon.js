export default function Icon({ name = 'dot', className = '' }) {
  const common = { width: 28, height: 28, viewBox: '0 0 24 24' };
  switch (name) {
    case 'wallet':
    case 'allowance':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <rect x="2" y="7" width="20" height="10" rx="2" />
          <rect x="16" y="9" width="4" height="6" rx="1" fill="#021" />
        </svg>
      );
    case 'receipt':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M4 3h12v18l-2-1-2 1-2-1-2 1-2-1V3z" />
          <path d="M7 7h8M7 11h8" stroke="#021" strokeWidth="1" fill="none" />
        </svg>
      );
    case 'target':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" fill="#021" />
        </svg>
      );
    case 'bar-chart':
    case 'chart':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <rect x="4" y="13" width="3" height="7" rx="1" />
          <rect x="9" y="9" width="3" height="11" rx="1" />
          <rect x="14" y="5" width="3" height="15" rx="1" />
        </svg>
      );
    case 'bot':
    case 'robot':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <rect x="4" y="4" width="16" height="12" rx="3" />
          <rect x="8" y="2" width="8" height="3" rx="1" fill="#021" />
          <circle cx="9" cy="10" r="1.2" fill="#021" />
          <circle cx="15" cy="10" r="1.2" fill="#021" />
        </svg>
      );
    case 'zap':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M13 2L3 14h7l-1 8L21 10h-7l-1-8z" />
        </svg>
      );
    case 'utensils':
    case 'food':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M7 2v10" stroke="#021" strokeWidth="1.5" fill="none" />
          <path d="M11 2v10" stroke="#021" strokeWidth="1.5" fill="none" />
          <path d="M3 18c1-4 7-4 8 0" />
        </svg>
      );
    case 'bus':
    case 'transport':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <rect x="3" y="6" width="18" height="10" rx="2" />
          <circle cx="7" cy="18" r="1.6" fill="#021" />
          <circle cx="17" cy="18" r="1.6" fill="#021" />
        </svg>
      );
    case 'gamepad':
    case 'entertainment':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <rect x="3" y="7" width="18" height="10" rx="3" />
          <circle cx="9" cy="12" r="1.2" fill="#021" />
          <rect x="14" y="11" width="1.2" height="1.2" fill="#021" />
        </svg>
      );
    case 'repeat':
    case 'subscriptions':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M21 15v4h-4" stroke="#021" strokeWidth="1.2" fill="none" />
          <path d="M3 9v-4h4" stroke="#021" strokeWidth="1.2" fill="none" />
          <path d="M7 5a7 7 0 0 1 10 0" stroke="#021" strokeWidth="1.2" fill="none" />
        </svg>
      );
    case 'more-horizontal':
    case 'other':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      );
    case 'briefcase':
    case 'job':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <rect x="3" y="7" width="18" height="11" rx="2" />
          <rect x="8" y="4" width="8" height="4" rx="1" fill="#021" />
        </svg>
      );
    case 'gift':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <rect x="3" y="7" width="18" height="10" rx="2" />
          <path d="M12 7v10" stroke="#021" strokeWidth="1" fill="none" />
          <path d="M3 11h18" stroke="#021" strokeWidth="1" fill="none" />
        </svg>
      );
    case 'rocket':
    case 'side':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M12 2s4 4 6 6c0 0-2 2-6 6-4-4-6-6-6-6 2-2 6-6 6-6z" />
          <circle cx="7" cy="17" r="1.4" fill="#021" />
        </svg>
      );
    default:
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <circle cx="12" cy="12" r="6" />
        </svg>
      );
  }
}
