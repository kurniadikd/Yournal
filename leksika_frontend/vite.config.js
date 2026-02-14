import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { obfuscator } from 'rollup-obfuscator'
import viteCompression from 'vite-plugin-compression'

/**
 * Mendapatkan informasi versi dari Git
 * Format: v1.0.0 atau v1.0.0-5-g1234abc (jika ada commit setelah tag)
 */
function getGitVersion() {
  try {
    // Coba dapatkan versi dari git describe (tag terdekat + commit info)
    const gitDescribe = execSync('git describe --tags --always', { encoding: 'utf-8' }).trim();
    
    // Dapatkan commit hash pendek
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    
    // Cek apakah ada perubahan yang belum di-commit
    let isDirty = false;
    try {
      execSync('git diff --quiet HEAD', { encoding: 'utf-8' });
    } catch {
      isDirty = true;
    }

    return {
      version: gitDescribe,
      commit: commitHash,
      isDirty,
      fullVersion: isDirty ? `${gitDescribe}-dirty` : gitDescribe,
    };
  } catch (error) {
    // Fallback ke package.json jika git tidak tersedia
    console.warn('Git not available, falling back to package.json version');
    return null;
  }
}

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')
  
  const gitInfo = getGitVersion();
  const isProduction = mode === 'production' || mode === 'pro';
  
  // Tentukan versi yang akan digunakan
  let appVersion = '1.0.0'; // Default fallback
  let commitHash = '';
  let buildTime = new Date().toISOString();
  
  if (gitInfo) {
    appVersion = gitInfo.version.replace(/^v/, ''); // Hapus prefix 'v' jika ada
    commitHash = gitInfo.commit;
  }
  
  console.log(`📦 Building with version: ${appVersion} (${commitHash || 'no-git'})`);
  if (isProduction) {
    console.log('🔒 Obfuscation enabled for production build (Logs disabled)');
  }

  return {
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
    },
    plugins: [
      vue(),
      vueDevTools({
        launchEditor: 'antigravity'
      }),
      // Obfuscation sementara dimatikan untuk debugging
      // isProduction && obfuscator({
      //   options: {
      //     // Moderate obfuscation - balance antara keamanan dan performa
      //     compact: true,
      //     controlFlowFlattening: true,
      //     controlFlowFlatteningThreshold: 0.5,
      //     deadCodeInjection: true,
      //     deadCodeInjectionThreshold: 0.3,
      //     debugProtection: false, // Bisa diaktifkan, tapi memperlambat debugging
      //     disableConsoleOutput: true, // Hapus console.log
      //     identifierNamesGenerator: 'hexadecimal',
      //     renameGlobals: false, // Jangan rename globals untuk kompatibilitas
      //     rotateStringArray: true,
      //     selfDefending: false, // Bisa menyebabkan masalah, hati-hati
      //     shuffleStringArray: true,
      //     splitStrings: true,
      //     splitStringsChunkLength: 10,
      //     stringArray: true,
      //     stringArrayEncoding: ['base64'],
      //     stringArrayIndexShift: true,
      //     stringArrayRotate: true,
      //     stringArrayShuffle: true,
      //     stringArrayWrappersCount: 2,
      //     stringArrayWrappersChainedCalls: true,
      //     stringArrayWrappersParametersMaxCount: 4,
      //     stringArrayWrappersType: 'function',
      //     stringArrayThreshold: 0.75,
      //     transformObjectKeys: true,
      //     unicodeEscapeSequence: false,
      //   },
      // }),
      // Compression hanya untuk production (gzip + brotli)
      isProduction && viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024, // Hanya compress file > 1KB
      }),
      isProduction && viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
      }),
    ].filter(Boolean),
    
    // Build configuration
    build: {
      sourcemap: !isProduction, // Disable source maps di production
      minify: isProduction ? 'esbuild' : false,
      cssMinify: isProduction,
      rollupOptions: {
        output: {
          // Optimized chunk naming
          chunkFileNames: isProduction ? 'assets/[name]-[hash].js' : 'assets/[name]-[hash].js',
          entryFileNames: isProduction ? 'assets/[name]-[hash].js' : 'assets/[name]-[hash].js',
          assetFileNames: isProduction ? 'assets/[name]-[hash].[ext]' : 'assets/[name]-[hash].[ext]',
          
          // Manual Chunks untuk memecah bundle besar
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // 1. Core Vue Framework & State Management
              if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router') || id.includes('vue-i18n') || id.includes('@vueuse')) {
                return 'vendor-core';
              }
              
              // 2. Data Fetching & State
              if (id.includes('@tanstack') || id.includes('vue-query')) {
                return 'vendor-data';
              }

              // 3. Tiptap Editor (Rich Text Editor)
              if (id.includes('@tiptap') || id.includes('prosemirror')) {
                return 'vendor-tiptap';
              }

              // 4. UI Components & Headless UI
              if (id.includes('@headlessui') || id.includes('@floating-ui') || id.includes('heroicons') || id.includes('@material') || id.includes('vue-country-dropdown') || id.includes('vue-virtual-scroller') || id.includes('vee-validate')) {
                return 'vendor-ui';
              }

              // 5. Utilities (Lodash, Moment, Axios, Zod)
              if (id.includes('lodash') || id.includes('moment') || id.includes('axios') || id.includes('zod') || id.includes('cyrillic-to-translit')) {
                return 'vendor-utils';
              }

              // 6. Charting / Visualization (jika ada, misal mermaid)
              if (id.includes('mermaid') || id.includes('chart.js')) {
                return 'vendor-charts';
              }

              // 7. Security & Auth (Turnstile, Fingerprint)
              if (id.includes('vue-turnstile') || id.includes('fingerprintjs')) {
                return 'vendor-security';
              }

              // 8. Media & Interactive (Cropper, Draggable, QR)
              if (id.includes('cropper') || id.includes('draggable') || id.includes('qrcode')) {
                return 'vendor-interactive';
              }

              // Default vendor chunk for others
              return 'vendor-common';
            }
          },
        },
      },
    },
    
    // Preview configuration (untuk production preview via Cloudflare Tunnel)
    preview: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: ['leksika.id', 'www.leksika.id', 'localhost'],
    },
    
    // Inject version info sebagai environment variables
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __COMMIT_HASH__: JSON.stringify(commitHash),
      __BUILD_TIME__: JSON.stringify(buildTime),
      __IS_DEV__: JSON.stringify(mode === 'development' || mode === 'dev'),
      // BYPASS: Use Cloudflare Test Key in Development (0x...AA always passes)
      // This prevents 600010 errors when developing on local IP (192.168.x.x)
      'import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY': JSON.stringify(
        mode === 'development' || mode === 'dev'
          ? '1x00000000000000000000AA' // Test Key
          : env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY // Production Key from .env
      ),
    },
    
    server: {
      // Development server menggunakan port 5174 agar bisa jalan bersamaan dengan production (5173)
      port: 5174,
      // Memungkinkan akses dari IP lokal
      host: '0.0.0.0', 
      proxy: {
        '/api': {
          // [PERBAIKAN] Mengubah 'localhost' menjadi '127.0.0.1' untuk stabilitas WS di lingkungan non-localhost.
          target: 'http://127.0.0.1:8001', 
          changeOrigin: true,
          // WAJIB: Memastikan WebSocket Handshake di-upgrade.
          ws: true,
          // Timeout yang besar untuk proses AI Fixation yang lama
          timeout: 300000, 
          proxyTimeout: 300000,
          // [FIX] Sanitize headers untuk menghindari "invalid Header provided" error
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              // Silently ignore connection errors
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Remove potentially problematic headers
              const headersToRemove = [
                'sec-ch-ua',
                'sec-ch-ua-mobile', 
                'sec-ch-ua-platform',
                'sec-fetch-site',
                'sec-fetch-mode',
                'sec-fetch-dest',
                'sec-fetch-user',
              ];
              headersToRemove.forEach(header => {
                if (proxyReq.getHeader(header)) {
                  proxyReq.removeHeader(header);
                }
              });
            });
          },
        },
        '/media': {
          // Proxy untuk akses file statis dari backend (appdata folder)
          target: 'http://127.0.0.1:8001', 
          changeOrigin: true,
          secure: false,
          // Log untuk debugging
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying:', req.method, req.url, '-> http://127.0.0.1:8001' + req.url);
            });
          },
        },
      },
    },
    css: {
      postcss: './postcss.config.js',
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
})