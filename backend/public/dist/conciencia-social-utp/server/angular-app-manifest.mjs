
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
    'index.csr.html': {size: 9300, hash: '34e9fd99d3e96acb7bfe30d6c25be9d5d416d4389a9617839c5839a416c83872', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 957, hash: '7a8e587b5f5030592ca03be59b2697ebb027fd59e5346480f134288dffe121f0', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 37826, hash: 'cbafc443ae4b432e8a3c0484cb59c3c04fbdfbfd1cb5e74a9750b15d67724f2b', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'styles-26HVZEX2.css': {size: 36326, hash: 'LXyaCimaa+w', text: () => import('./assets-chunks/styles-26HVZEX2_css.mjs').then(m => m.default)}
  },
};
