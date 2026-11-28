import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getPortalMetadata } from '../../services/portalMetadata';

const citizenOrigin = import.meta.env.VITE_PUBLIC_CITIZEN_ORIGIN;

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
}

function setCanonical(url: string | null) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!url) {
    existing?.remove();
    return;
  }
  const link = existing ?? document.createElement('link');
  link.rel = 'canonical';
  link.href = url;
  if (!existing) document.head.append(link);
}

export const DocumentMetadata: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = getPortalMetadata(pathname, citizenOrigin);
    setMeta('name', 'description', metadata.description);
    setMeta('name', 'robots', metadata.robots);
    setMeta('property', 'og:title', metadata.title);
    setMeta('property', 'og:description', metadata.description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:locale', 'en_PK');
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:title', metadata.title);
    setMeta('name', 'twitter:description', metadata.description);
    setCanonical(metadata.canonicalUrl);
  }, [pathname]);

  return null;
};
