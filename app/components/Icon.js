export default function Icon({ name = 'dot', className = '' }) {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24' };
  switch (name) {
    case 'plus':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41L12 5 3.41 13.59A2 2 0 003 15v4a2 2 0 002 2h4c.53 0 1.04-.21 1.41-.59L20.59 13.41z" />
          <circle cx="7.5" cy="10.5" r="1" />
        </svg>
      );
    case 'savings':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v6" />
          <path d="M20 12a8 8 0 10-16 0 8 8 0 0016 0z" />
          <path d="M9 12h6" />
        </svg>
      );
    case 'ai':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M8 12h8M12 8v8" />
        </svg>
      );
    case 'bolt':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case 'job':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
          <path d="M8 7V5a4 4 0 0 1 8 0v2" />
        </svg>
      );
    case 'allowance':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1v22" />
          <path d="M4 7h16" />
        </svg>
      );
    case 'gift':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M12 7v13" />
          <path d="M12 7c2-4 6-4 8 0" />
        </svg>
      );
    case 'side':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h18" />
          <path d="M6 6v12" />
        </svg>
      );
    case 'savings':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="10" r="3" />
          <path d="M12 13v6" />
        </svg>
      );
    case 'food':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v11" />
          <path d="M16 2v11" />
          <path d="M3 13h18" />
        </svg>
      );
    case 'transport':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="7" width="18" height="8" rx="2" />
          <path d="M5 17v2" /><path d="M19 17v2" />
        </svg>
      );
    case 'entertainment':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16v10H4z" />
          <path d="M8 11h8" />
        </svg>
      );
    case 'subscriptions':
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="M7 8v8" /><path d="M17 8v8" />
        </svg>
      );
    default:
      return (
        <svg {...common} className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="6" />
        </svg>
      );
  }
}
