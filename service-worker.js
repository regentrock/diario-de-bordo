// Nome do cache (mude a versão quando atualizar)
const CACHE_NAME = 'diario-de-bordo-v1.2';

// Arquivos para cache (app shell) - IMPORTANTE: usar ./ para GitHub Pages
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...', CACHE_NAME);
  
  // Forçar ativação imediata
  self.skipWaiting();
  
  // Cachear arquivos importantes
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando arquivos do app shell');
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log('[Service Worker] Todos os recursos foram cacheados');
          })
          .catch(error => {
            console.error('[Service Worker] Erro ao cachear arquivos:', error);
          });
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  
  // Limpar caches antigos
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
      // Tomar controle de todas as páginas abertas
      return self.clients.claim();
    })
  );
});

// Interceptar requisições (estratégia: Cache First, depois Network)
self.addEventListener('fetch', event => {
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar requisições do chrome-extension
  if (event.request.url.includes('chrome-extension://')) return;
  
  // Para requisições de mesma origem
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Se encontrou no cache, retornar
          if (cachedResponse) {
            console.log('[Service Worker] Servindo do cache:', event.request.url);
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
                  console.log('[Service Worker] Cacheando nova resposta:', event.request.url);
                });
              
              return response;
            })
            .catch(error => {
              console.error('[Service Worker] Erro ao buscar:', error);
              
              // Se for uma página HTML, retornar a página offline
              if (event.request.headers.get('accept').includes('text/html')) {
                return caches.match('./index.html');
              }
              
              // Para outros tipos de arquivo, pode retornar um fallback
              if (event.request.url.match(/\.(css|js)$/)) {
                return new Response('/* Offline */', {
                  headers: { 'Content-Type': 'text/css' }
                });
              }
              
              return new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain'
                })
              });
            });
        })
    );
  }
});

// Sincronização em segundo plano (quando conexão retorna)
self.addEventListener('sync', event => {
  console.log('[Service Worker] Sincronização em segundo plano:', event.tag);
  
  if (event.tag === 'sync-entries') {
    event.waitUntil(syncEntries());
  }
});

// Receber mensagens da página
self.addEventListener('message', event => {
  console.log('[Service Worker] Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => {
          return cache.addAll(event.data.urls);
        })
    );
  }
});

// Função para sincronizar dados (exemplo para expansão futura)
function syncEntries() {
  // Esta função pode ser expandida para sincronizar com um servidor
  // quando o usuário voltar a ficar online
  console.log('[Service Worker] Sincronizando entradas...');
  
  // Por enquanto, apenas log
  return Promise.resolve('Sincronização concluída');
}

// Push notifications (para expansão futura)
self.addEventListener('push', event => {
  console.log('[Service Worker] Push notification recebida:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do Diário de Bordo',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir Diário'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Diário de Bordo', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notificação clicada:', event.notification.tag);
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    })
    .then(clientList => {
      for (const client of clientList) {
        if (client.url === './' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});