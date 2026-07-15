
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 9300, hash: '22f2bd39d770956cd28389f428b2603ed13b2b6107f4d0a3cb49c9da3efdfd7c', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 957, hash: 'e6614a401e4610c2a7588451fc4c4c46988e0623af421dd821ddae42a7bdc9df', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 37819, hash: '551e6b3e911babc005062819f5ac84e3b1b19b37a59bdf24fb446eabd9543376', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'styles-5K457AJY.css': {size: 37387, hash: 'RcUbHgowEsw', text: () => import('./assets-chunks/styles-5K457AJY_css.mjs').then(m => m.default)}
  },
};
