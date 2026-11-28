import type { Plugin, ResolvedConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { getPortalMetadata, metadataMarkup, PUBLIC_PAGES, SITE_NAME, SITE_DESCRIPTION, escapeHtml } from '../src/lib/portalMetadata';

const start = '<!-- portal-metadata:start -->';
const end = '<!-- portal-metadata:end -->';
function replaceHead(html: string, markup: string) {
  const a = html.indexOf(start), b = html.indexOf(end);
  if (a < 0 || b <= a) throw new Error('Portal metadata markers missing');
  return html.slice(0,a+start.length)+'\n    '+markup+'\n    '+html.slice(b);
}
export function portalMetadataPlugin(target: string, origin: string, enabled: boolean): Plugin {
  let config: ResolvedConfig;
  const rootMeta = getPortalMetadata(target, origin, enabled);
  const manifest = target === 'citizen' ? '/citizen.webmanifest' : '/manifest.webmanifest';
  function markup(route: string) {
    const meta = getPortalMetadata(target, origin, enabled, route);
    const structured = meta.social && route === '/' ? '\n    <script type="application/ld+json">'+JSON.stringify({
      '@context':'https://schema.org','@type':'WebSite',name:SITE_NAME,url:meta.origin+'/',description:SITE_DESCRIPTION,inLanguage:['en','ur']
    }).replace(/</g,'\\u003c')+'</script>' : '';
    return metadataMarkup(meta)+structured;
  }
  return {
    name: 'awaaz-portal-metadata',
    configResolved(c) { config = c; },
    transformIndexHtml: { order: 'post', handler(html) {
      return replaceHead(html,markup('/')).replace('href="/manifest.webmanifest"', 'href="'+manifest+'"');
    }},
    closeBundle() {
      if (config.command !== 'build') return;
      const dir = path.resolve(config.root,config.build.outDir);
      const root = fs.readFileSync(path.join(dir,'index.html'),'utf8');
      const indexed = rootMeta.social;
      // Separate static HTML heads for direct crawler/share requests; same SPA entry.
      if (target === 'citizen') {
        for (const route of Object.keys(PUBLIC_PAGES).filter(p=>p!=='/')) {
          const folder = path.join(dir,route.slice(1));
          fs.mkdirSync(folder,{recursive:true});
          fs.writeFileSync(path.join(folder,'index.html'),replaceHead(root,markup(route)));
        }
        fs.writeFileSync(path.join(dir,'citizen.webmanifest'),JSON.stringify({
          name:'Awaaz-e-Awam — Citizen Portal',short_name:'Awaaz-e-Awam',description:SITE_DESCRIPTION,
          start_url:'/',scope:'/',display:'standalone',background_color:'#ffffff',theme_color:'#761D30',
          icons:[{src:'/android-chrome-192x192.png',sizes:'192x192',type:'image/png'},{src:'/android-chrome-512x512.png',sizes:'512x512',type:'image/png'}]
        },null,2));
      }
      const privatePaths = ['/admin','/department','/dashboard','/login','/register','/reset-password','/track','/submit','/write-complaint','/karachi-map','/dev'];
      // Permit crawling noindex pages so crawlers can actually see the exclusion directive.
      fs.writeFileSync(path.join(dir,'robots.txt'),'User-agent: *\n'+(indexed?'Allow: /\nSitemap: '+rootMeta.origin+'/sitemap.xml\n':'Disallow: /\n'));
      const sitemap = path.join(dir,'sitemap.xml');
      if (indexed) fs.writeFileSync(sitemap,'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+Object.keys(PUBLIC_PAGES).map(p=>'<url><loc>'+escapeHtml(rootMeta.origin+p)+'</loc></url>').join('')+'</urlset>\n');
      else if(fs.existsSync(sitemap)) fs.unlinkSync(sitemap);
      const noindex = '  X-Robots-Tag: noindex, nofollow, noarchive\n';
      fs.writeFileSync(path.join(dir,'_headers'), indexed ? privatePaths.map(p=>p+'\n'+noindex+p+'/*\n'+noindex).join('\n') : '/*\n'+noindex);
    },
  };
}
