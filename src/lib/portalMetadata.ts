// Public metadata is deliberately independent from complaint content, identities and query strings.
export const SITE_NAME = 'Awaaz-e-Awam (آوازِ عوام)';
export const SITE_DESCRIPTION = 'Report civic issues in Karachi in Roman Urdu, follow complaint progress and learn how municipal complaint routing works. An independent Greenwich University student project.';
export const PUBLIC_PAGES = {
  '/': ['Awaaz-e-Awam | Karachi Civic Complaint Portal', SITE_DESCRIPTION],
  '/about': ['About Awaaz-e-Awam | Karachi Civic Complaint Portal', 'Learn about the independent student project, its purpose and civic complaint routing.'],
  '/faq': ['Frequently Asked Questions | Awaaz-e-Awam', 'Find answers about submitting and tracking civic complaints in Karachi.'],
  '/contact': ['Contact | Awaaz-e-Awam', 'Find contact information for the Awaaz-e-Awam project.'],
  '/privacy-policy': ['Privacy Policy | Awaaz-e-Awam', 'Read how the Awaaz-e-Awam project handles complaint information and privacy.'],
  '/terms-of-use': ['Terms of Use | Awaaz-e-Awam', 'Read the terms for using the Awaaz-e-Awam civic complaint platform.'],
} as const;
const PRIVATE_TITLES: Record<string, string> = {
  '/submit': 'Write a complaint', '/track': 'Track a complaint', '/dashboard': 'My complaints',
  '/login': 'Sign in', '/register': 'Create an account', '/reset-password': 'Reset password',
  '/karachi-map': 'Karachi issues map',
};
export function publicOrigin(value: string | undefined): string {
  try {
    const u = new URL(value || '');
    if (u.protocol !== 'https:' || u.username || u.password || u.pathname !== '/' || u.search || u.hash ||
        !u.hostname.includes('.') || /(^|\.)(localhost|local|test|invalid|example)$/.test(u.hostname) ||
        u.hostname.endsWith('.vercel.app') && u.hostname.includes('-git-')) return '';
    return u.origin;
  } catch { return ''; }
}
export function getPortalMetadata(target: string, originValue: string, enabled: boolean, pathname = '/') {
  const origin = publicOrigin(originValue);
  const path = pathname.replace(/\/+$/, '') || '/';
  const page = PUBLIC_PAGES[path as keyof typeof PUBLIC_PAGES];
  const citizen = target === 'citizen';
  const index = citizen && Boolean(origin) && enabled && Boolean(page);
  const staffTitle = target === 'management' ? 'Management portal' : target === 'fieldwork' ? 'Officer portal' :
    path.startsWith('/admin') ? 'Administration portal' : path.startsWith('/department') ? 'Staff portal' : '';
  const privateTitle = PRIVATE_TITLES[path] || (path.startsWith('/track/') ? 'Track a complaint' : 'Citizen portal');
  const title = staffTitle ? staffTitle + ' | Awaaz-e-Awam' : page?.[0] || privateTitle + ' | Awaaz-e-Awam';
  const description = staffTitle ? 'Restricted Awaaz-e-Awam staff workspace.' : page?.[1] || 'Awaaz-e-Awam citizen workspace.';
  return { title, description, robots: index ? 'index, follow, max-image-preview:large' : 'noindex, nofollow, noarchive',
    canonical: index ? origin + path : '', image: index ? origin + '/og-image.png' : '',
    social: index, origin, citizen };
}
export function escapeHtml(value: string) {
  return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
export function metadataMarkup(meta: ReturnType<typeof getPortalMetadata>) {
  const e = escapeHtml;
  const tags = ['<title>'+e(meta.title)+'</title>',
    '<meta name="description" content="'+e(meta.description)+'" />',
    '<meta name="robots" content="'+e(meta.robots)+'" />'];
  if (meta.social) {
    tags.push('<link rel="canonical" href="'+e(meta.canonical)+'" />',
      '<meta property="og:type" content="website" />',
      '<meta property="og:site_name" content="'+e(SITE_NAME)+'" />',
      '<meta property="og:locale" content="en_PK" />',
      '<meta property="og:locale:alternate" content="ur_PK" />',
      '<meta property="og:title" content="'+e(meta.title)+'" />',
      '<meta property="og:description" content="'+e(meta.description)+'" />',
      '<meta property="og:url" content="'+e(meta.canonical)+'" />',
      '<meta property="og:image" content="'+e(meta.image)+'" />',
      '<meta property="og:image:width" content="1200" />',
      '<meta property="og:image:height" content="630" />',
      '<meta property="og:image:type" content="image/png" />',
      '<meta property="og:image:alt" content="Awaaz-e-Awam project branding" />',
      '<meta name="twitter:card" content="summary_large_image" />',
      '<meta name="twitter:title" content="'+e(meta.title)+'" />',
      '<meta name="twitter:description" content="'+e(meta.description)+'" />',
      '<meta name="twitter:image" content="'+e(meta.image)+'" />',
      '<meta name="twitter:image:alt" content="Awaaz-e-Awam project branding" />');
  }
  return tags.join('\n    ');
}
