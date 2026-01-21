// Nome do cache
const CACHE_NAME = 'diario-de-bordo-v1.0';

// Arquivos para cache (app shell)
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  
  // Realizar instalação
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando arquivos do app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Instalação concluída');
        // Ativar imediatamente após instalação
        return self.skipWaiting();
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  
  // Remover caches antigos
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Ativação concluída');
      // Garantir que o Service Worker controle a página imediatamente
      return self.clients.claim();
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
  // Ignorar requisições não-GET
  if (event.request.method !== 'GET') return;
  
  // Para URLs da API, usar estratégia network-first
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clonar a resposta para salvar no cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Se offline, tentar buscar do cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Para recursos estáticos, usar estratégia cache-first
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se encontrou no cache, retornar
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Se não encontrou, buscar na rede
        return fetch(event.request)
          .then(response => {
            // Verificar se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar a resposta para salvar no cache
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Se offline e não encontrado no cache, retornar página offline
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Sincronização em segundo plano (quando conexão retorna)
self.addEventListener('sync', event => {
  console.log('[Service Worker] Sincronização em segundo plano:', event.tag);
  
  if (event.tag === 'sync-entries') {
    event.waitUntil(syncEntries());
  }
});

// Função para sincronizar entradas (exemplo)
function syncEntries() {
  // Aqui você implementaria a sincronização com um servidor
  console.log('[Service Worker] Sincronizando entradas...');
  return Promise.resolve();
}