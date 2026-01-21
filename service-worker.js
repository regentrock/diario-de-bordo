// Nome do cache (atualize a versão quando fizer mudanças)
const CACHE_NAME = 'diario-bordo-v2.0';
const APP_NAME = 'Diário de Bordo';

// Arquivos ESSENCIAIS para cache (sem caminhos relativos complexos)
const CORE_ASSETS = [
  '/',  // IMPORTANTE: raiz do site
  'index.html',
  'style.css',
  'script.js',
  'manifest.json'
];

// Ícones (adicione conforme disponível)
const ICON_ASSETS = [
  'icons/icon-72x72.png',
  'icons/icon-96x96.png',
  'icons/icon-128x128.png',
  'icons/icon-144x144.png',
  'icons/icon-152x152.png',
  'icons/icon-192x192.png',
  'icons/icon-384x384.png',
  'icons/icon-512x512.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log(`[${APP_NAME}] Service Worker instalando...`);
  
  // Força a ativação imediata
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[${APP_NAME}] Cache aberto: ${CACHE_NAME}`);
        
        // Cache apenas os arquivos principais primeiro
        return cache.addAll(CORE_ASSETS)
          .then(() => {
            console.log(`[${APP_NAME}] Arquivos principais cacheados`);
            
            // Tenta cachear ícones, mas não falha se não conseguir
            return Promise.all(
              ICON_ASSETS.map(icon => {
                return cache.add(icon).catch(err => {
                  console.warn(`[${APP_NAME}] Não foi possível cachear ${icon}:`, err);
                  return Promise.resolve();
                });
              })
            );
          })
          .then(() => {
            console.log(`[${APP_NAME}] Instalação completa`);
          });
      })
      .catch(error => {
        console.error(`[${APP_NAME}] Erro durante instalação:`, error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log(`[${APP_NAME}] Service Worker ativando...`);
  
  event.waitUntil(
    Promise.all([
      // Limpa caches antigos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log(`[${APP_NAME}] Removendo cache antigo: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Toma controle de todas as páginas abertas
      self.clients.claim()
    ])
    .then(() => {
      console.log(`[${APP_NAME}] Ativação completa. Pronto para funcionar offline!`);
    })
  );
});

// Estratégia de cache: Network First com fallback para Cache
self.addEventListener('fetch', event => {
  // Não interceptar requisições de dados ou de outras origens
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return;
  }
  
  // Para arquivos HTML, CSS, JS e JSON: Cache First, depois Network
  if (
    event.request.url.match(/\.(html|css|js|json)$/) ||
    event.request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Se tem no cache, retorna (mesmo que esteja desatualizado)
          if (cachedResponse) {
            // Atualiza o cache em segundo plano
            fetchAndCache(event.request);
            return cachedResponse;
          }
          
          // Se não tem no cache, busca na rede
          return fetchAndCache(event.request);
        })
        .catch(() => {
          // Fallback para página offline se disponível
          if (event.request.url.match(/\.html$/)) {
            return caches.match('index.html');
          }
          
          // Fallback genérico
          return new Response('Offline - Diário de Bordo', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }
  
  // Para outros recursos (imagens, etc): Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        return cachedResponse || fetch(event.request);
      })
  );
});

// Função auxiliar para buscar e cachear
function fetchAndCache(request) {
  return fetch(request)
    .then(response => {
      // Verifica se a resposta é válida
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }
      
      // Clona a resposta para cachear
      const responseToCache = response.clone();
      
      caches.open(CACHE_NAME)
        .then(cache => {
          cache.put(request, responseToCache);
          console.log(`[${APP_NAME}] Recurso cacheado: ${request.url}`);
        })
        .catch(err => {
          console.warn(`[${APP_NAME}] Não foi possível cachear ${request.url}:`, err);
        });
      
      return response;
    })
    .catch(error => {
      console.error(`[${APP_NAME}] Erro ao buscar ${request.url}:`, error);
      throw error;
    });
}

// Sincronização em background
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log(`[${APP_NAME}] Sincronizando dados em background...`);
    event.waitUntil(syncPendingData());
  }
});

// Notificações push (para futura implementação)
self.addEventListener('push', event => {
  const options = {
    body: event.data?.text() || 'Novo lembrete do Diário de Bordo',
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: self.location.origin
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(APP_NAME, options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        // Foca em uma janela existente se houver
        for (const client of windowClients) {
          if (client.url === self.location.origin && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Abre uma nova janela se não houver
        if (clients.openWindow) {
          return clients.openWindow(self.location.origin);
        }
      })
  );
});

// Recebe mensagens da página
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Função de sincronização (exemplo)
function syncPendingData() {
  // Aqui você implementaria a sincronização com servidor
  // Por enquanto, apenas registra no console
  console.log(`[${APP_NAME}] Dados sincronizados com sucesso`);
  return Promise.resolve();
}