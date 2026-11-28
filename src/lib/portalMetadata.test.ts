import { describe, it, expect } from 'vitest';
import { getPortalMetadata, metadataMarkup, PUBLIC_PAGES, publicOrigin } from './portalMetadata';
const origin = 'https://civic.example.org';
describe('portal metadata',()=>{
  it('fails closed without a verified configuration',()=>{
    for(const [url,enabled] of [['',true],[origin,false],['http://example.org',true],['https://example.org/path',true]] as const)
      expect(getPortalMetadata('citizen',url,enabled).robots).toContain('noindex');
  });
  it('indexes only explicit public citizen pages with absolute URLs',()=>{
    for(const route of Object.keys(PUBLIC_PAGES)){
      const m=getPortalMetadata('citizen',origin,true,route);
      expect(m.canonical).toBe(origin+route);expect(m.image).toBe(origin+'/og-image.png');expect(m.robots).toContain('index, follow');
    }
  });
  it('never indexes staff, private routes, or unknown routes',()=>{
    for(const target of ['all','management','fieldwork','citizen']) for(const route of ['/admin/login','/department/head','/track/SECRET','/dashboard','/login','/submit','/unknown']){
      const m=getPortalMetadata(target,origin,true,route);expect(m.robots).toContain('noindex');expect(m.canonical).toBe('');expect(metadataMarkup(m)).not.toContain('SECRET');
    }
    expect(getPortalMetadata('management',origin,true).social).toBe(false);
  });
  it('rejects invalid origins and emits escaped metadata',()=>{
    expect(publicOrigin('https://user:pass@example.org')).toBe('');
    expect(publicOrigin('https://example.org/?q=1')).toBe('');
    const markup=metadataMarkup(getPortalMetadata('citizen',origin,true));
    expect(markup).toContain('og:image');expect(markup).toContain('twitter:card');expect(markup).toContain('rel="canonical"');
  });
});
