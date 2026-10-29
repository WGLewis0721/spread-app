import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The conversation preview is the working implementation, with only its outer
// phone frame and offline media adapted. No second interaction implementation.
const source = readFileSync(fileURLToPath(new URL('../three-action.html', import.meta.url)), 'utf8');
const style = source.match(/<style>([\s\S]*?)<\/style>/)[1];
const markup = source.split('<body>')[1].split('<script>')[0];
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace("function photo(c,cls='person-photo'){return `${illustration(c)}<img class=\"${cls}\" src=\"${imgUrl(c)}\" alt=\"\" loading=\"lazy\" onerror=\"this.style.display='none'\">`}", 'function photo(c){return illustration(c)}')
  .replace('const $=id=>document.getElementById(id);', "const previewRoot=document.getElementById('contact-deck-live');const $=id=>previewRoot.querySelector('#'+id);")
  .replaceAll('document.querySelectorAll(', 'previewRoot.querySelectorAll(');
const frame = `
#contact-deck-live{width:100%;max-width:430px;margin:0 auto;position:relative;overflow:hidden;color-scheme:light dark}
#contact-deck-live .desktop{display:block;padding:0;min-height:0;width:100%}
#contact-deck-live .editorial,#contact-deck-live .aside{display:none}
#contact-deck-live .device{height:760px;width:100%;max-width:430px;border:0;border-radius:28px;box-shadow:none}
#contact-deck-live .screen{inset:0;border-radius:28px;--deck-top:152px;--deck-bottom:99px}
#contact-deck-live .status{height:50px;padding:10px 27px 0}
#contact-deck-live .dynamic,#contact-deck-live .home-indicator{display:none}
`;
const target = process.argv[2] || '/workspace/contact-deck-live.html';
writeFileSync(target, `<div id="contact-deck-live" class="viz-dotted-background">\n<style>${style}\n${frame}</style>\n${markup}\n<script>${script}</script>\n</div>\n`);
console.log(`Preview generated: ${target}`);
