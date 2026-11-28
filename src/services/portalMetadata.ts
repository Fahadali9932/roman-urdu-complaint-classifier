export type PortalMetadata = {
  title: string;
  description: string;
  robots: string;
  canonicalUrl: string | null;
  isPublic: boolean;
};

const PUBLIC_CITIZEN_PAGES: Record<string, Pick<PortalMetadata, 'title' | 'description'>> = {
  '/': {
    title: 'Awaaz-e-Awam | Karachi Civic Complaint Portal',
    description: 'Report Karachi civic issues in Roman Urdu and understand how Awaaz-e-Awam routes them for review. A Greenwich University student project.',
  },
  '/about': {
    title: 'About Awaaz-e-Awam | Karachi Civic Complaint Portal',
    description: 'Learn about Awaaz-e-Awam, a Greenwich University project for safer civic-complaint intake and routing in Karachi.',
  },
  '/contact': {
    title: 'Contact Awaaz-e-Awam | Karachi Civic Complaint Portal',
    description: 'Contact the Awaaz-e-Awam project team for general information about this Greenwich University civic-complaint project.',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | Awaaz-e-Awam',
    description: 'Read how Awaaz-e-Awam handles citizen complaint information and privacy.',
  },
  '/terms-of-use': {
    title: 'Terms of Use | Awaaz-e-Awam',
    description: 'Read the terms governing use of the Awaaz-e-Awam citizen complaint portal.',
  },
};

const PRIVATE_ROBOTS = 'noindex,nofollow,noarchive';
const PUBLIC_ROBOTS = 'index,follow,max-image-preview:large';

export function normalizeCitizenOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.pathname !== '/' || url.search || url.hash) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function getPortalMetadata(pathname: string, citizenOrigin?: string): PortalMetadata {
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const publicPage = PUBLIC_CITIZEN_PAGES[normalizedPath];
  const normalizedOrigin = normalizeCitizenOrigin(citizenOrigin);
  const isPublic = Boolean(publicPage);

  if (!publicPage) {
    return {
      title: 'Awaaz-e-Awam | Private Portal',
      description: 'This Awaaz-e-Awam route is private and is not intended for search indexing.',
      robots: PRIVATE_ROBOTS,
      canonicalUrl: null,
      isPublic: false,
    };
  }

  return {
    ...publicPage,
    robots: normalizedOrigin ? PUBLIC_ROBOTS : PRIVATE_ROBOTS,
    canonicalUrl: normalizedOrigin ? `${normalizedOrigin}${normalizedPath === '/' ? '' : normalizedPath}` : null,
    isPublic,
  };
}
