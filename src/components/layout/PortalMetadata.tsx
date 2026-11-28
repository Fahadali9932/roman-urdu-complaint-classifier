import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getPortalMetadata, SITE_NAME } from '../../lib/portalMetadata';

export function PortalMetadata() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const meta = getPortalMetadata(import.meta.env.VITE_PORTAL_TARGET || 'all',
      import.meta.env.VITE_PUBLIC_SITE_URL || '', import.meta.env.VITE_ENABLE_INDEXING === 'true', pathname);
    document.title = meta.title;
    function tag(key: string, value: string, property = false) {
      const attr = property ? 'property' : 'name';
      let node = document.head.querySelector<HTMLMetaElement>('meta['+attr+'="'+key+'"]');
      if (!value) { node?.remove(); return; }
      if (!node) { node = document.createElement('meta'); node.setAttribute(attr,key); document.head.appendChild(node); }
      node.content = value;
    }
    tag('description',meta.description); tag('robots',meta.robots);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!meta.canonical) canonical?.remove();
    else { if(!canonical) { canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical); } canonical.href=meta.canonical; }
    const og: Record<string,string> = {'type':'website','site_name':SITE_NAME,'locale':'en_PK','locale:alternate':'ur_PK','title':meta.title,'description':meta.description,'url':meta.canonical,'image':meta.image,'image:alt':'Awaaz-e-Awam project branding'};
    const twitter: Record<string,string> = {card:'summary_large_image',title:meta.title,description:meta.description,image:meta.image,'image:alt':'Awaaz-e-Awam project branding'};
    for(const [k,v] of Object.entries(og)) tag('og:'+k,meta.social?v:'',true);
    for(const [k,v] of Object.entries(twitter)) tag('twitter:'+k,meta.social?v:'');
    if(pathname!=='/' || !meta.social) document.head.querySelector('script[type="application/ld+json"]')?.remove();
  },[pathname]);
  return null;
}
