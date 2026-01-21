// Elementos do DOM
const entryForm = document.getElementById('entryForm');
const entriesList = document.getElementById('entriesList');
const emptyState = document.getElementById('emptyState');
const totalEntries = document.getElementById('totalEntries');
const filterDate = document.getElementById('filterDate');
const clearFilter = document.getElementById('clearFilter');
const installButton = document.getElementById('installButton');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const installModal = document.getElementById('installModal');
const installInstructions = document.getElementById('installInstructions');
const githubInfo = document.getElementById('githubInfo');

// Variáveis globais
let entries = [];
let deferredPrompt = null;
let isOnline = navigator.onLine;

// Configuração para GitHub Pages
const IS_GITHUB_PAGES = window.location.hostname.includes('github.io');
const REPO_NAME = IS_GITHUB_PAGES ? window.location.pathname.split('/')[1] : '';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Inicializar aplicação
function initApp() {
    console.log('🚀 Inicializando Diário de Bordo PWA');
    console.log('📱 Dispositivo:', getDeviceType());
    console.log('🌐 GitHub Pages:', IS_GITHUB_PAGES);
    console.log('📂 Repositório:', REPO_NAME || 'Local');
    
    // Mostrar info do GitHub Pages se aplicável
    if (IS_GITHUB_PAGES && REPO_NAME) {
        githubInfo.textContent = `GitHub Pages: ${REPO_NAME}`;
        githubInfo.style.fontSize = '0.8em';
        githubInfo.style.marginTop = '5px';
        githubInfo.style.color = '#666';
    }
    
    // Carregar entradas salvas
    loadEntries();
    
    // Configurar data atual como padrão
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Configurar filtro de data
    filterDate.value = '';
    
    // Configurar eventos
    setupEventListeners();
    
    // Verificar status de conexão
    updateConnectionStatus();
    
    // Configurar Service Worker
    registerServiceWorker();
    
    // Atualizar contador de entradas
    updateEntriesCounter();
    
    // Configurar modal
    setupModal();
    
    // Inicializar instalação PWA
    initPWA();
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Formulário de nova entrada
    entryForm.addEventListener('submit', handleFormSubmit);
    
    // Filtro de data
    filterDate.addEventListener('change', handleFilterDate);
    
    // Limpar filtro
    clearFilter.addEventListener('click', () => {
        filterDate.value = '';
        renderEntries();
    });
    
    // Eventos de conexão
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    // Instalação do PWA
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    installButton.addEventListener('click', installPWA);
    
    // Atualizar Service Worker quando a página ganhar foco
    window.addEventListener('focus', () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration()
                .then(reg => reg && reg.update())
                .catch(console.error);
        }
    });
    
    // Lidar com mudanças na visibilidade da página
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadEntries(); // Recarregar dados quando a página ficar visível
        }
    });
}

// Configurar modal
function setupModal() {
    const closeModal = installModal.querySelector('.close-modal');
    
    closeModal.addEventListener('click', () => {
        installModal.style.display = 'none';
    });
    
    // Fechar modal ao clicar fora
    installModal.addEventListener('click', (e) => {
        if (e.target === installModal) {
            installModal.style.display = 'none';
        }
    });
    
    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && installModal.style.display === 'flex') {
            installModal.style.display = 'none';
        }
    });
}

// Inicializar PWA
function initPWA() {
    // Verificar se já está instalado
    if (isAppInstalled()) {
        console.log('📱 App já está instalado como PWA');
        installButton.style.display = 'none';
        
        // Mostrar notificação se for a primeira visita após instalação
        const firstRun = localStorage.getItem('pwaFirstRun');
        if (!firstRun) {
            setTimeout(() => {
                showNotification('✅ Diário de Bordo instalado com sucesso!', 'success');
                localStorage.setItem('pwaFirstRun', 'true');
            }, 1000);
        }
    } else {
        // Verificar se podemos mostrar o botão de instalação
        checkInstallability();
    }
}

// Verificar se o app pode ser instalado
function checkInstallability() {
    // No iOS, o beforeinstallprompt não é suportado
    // Mostramos o botão sempre para instruções manuais
    if (isiOS() || isAndroid()) {
        installButton.style.display = 'block';
        installButton.textContent = '📱 Como Instalar';
    }
}

// Carregar entradas do localStorage
function loadEntries() {
    try {
        const savedEntries = localStorage.getItem('diarioEntries');
        if (savedEntries) {
            entries = JSON.parse(savedEntries);
            console.log(`📝 Carregadas ${entries.length} entradas`);
            renderEntries();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar entradas:', error);
        entries = [];
        showNotification('Erro ao carregar dados salvos', 'error');
    }
}

// Salvar entradas no localStorage
function saveEntries() {
    try {
        localStorage.setItem('diarioEntries', JSON.stringify(entries));
        updateEntriesCounter();
        console.log('💾 Entradas salvas:', entries.length);
    } catch (error) {
        console.error('❌ Erro ao salvar entradas:', error);
        showNotification('Erro ao salvar. Espaço de armazenamento pode estar cheio.', 'error');
    }
}

// Renderizar entradas na tela
function renderEntries(filteredEntries = null) {
    const entriesToRender = filteredEntries || entries;
    
    if (entriesToRender.length === 0) {
        entriesList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Ordenar por data (mais recente primeiro)
    const sortedEntries = [...entriesToRender].sort((a, b) => 
        new Date(b.date + 'T' + (b.createdAt?.split('T')[1] || '00:00:00')) - 
        new Date(a.date + 'T' + (a.createdAt?.split('T')[1] || '00:00:00'))
    );
    
    let entriesHTML = '';
    
    sortedEntries.forEach((entry) => {
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString('pt-BR', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        entriesHTML += `
            <div class="entry-card" data-id="${entry.id}">
                <div class="entry-header">
                    <h3 class="entry-title">${entry.title}</h3>
                    <span class="entry-date">${formattedDate}</span>
                </div>
                <p class="entry-description">${entry.description}</p>
                <div class="entry-actions">
                    <button class="btn btn-danger" onclick="deleteEntry('${entry.id}')">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        `;
    });
    
    entriesList.innerHTML = entriesHTML;
}

// Manipular envio do formulário
function handleFormSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const date = document.getElementById('date').value;
    
    if (!title || !description || !date) {
        showNotification('⚠️ Preencha todos os campos!', 'error');
        return;
    }
    
    const newEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        title,
        description,
        date,
        createdAt: new Date().toISOString()
    };
    
    entries.unshift(newEntry);
    saveEntries();
    renderEntries();
    
    // Limpar formulário
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    
    showNotification('✅ Entrada adicionada!');
    
    // Focar no título para próxima entrada
    setTimeout(() => document.getElementById('title').focus(), 100);
}

// Excluir entrada
function deleteEntry(id) {
    if (confirm('Tem certeza que deseja excluir esta entrada?')) {
        entries = entries.filter(entry => entry.id !== id);
        saveEntries();
        renderEntries();
        showNotification('🗑️ Entrada excluída');
    }
}

// Filtrar entradas por data
function handleFilterDate() {
    const filterValue = filterDate.value;
    
    if (!filterValue) {
        renderEntries();
        return;
    }
    
    const filteredEntries = entries.filter(entry => entry.date === filterValue);
    renderEntries(filteredEntries);
}

// Atualizar contador de entradas
function updateEntriesCounter() {
    totalEntries.textContent = entries.length;
    document.title = entries.length > 0 ? 
        `(${entries.length}) Diário de Bordo` : 
        'Diário de Bordo';
}

// Mostrar notificação
function showNotification(message, type = 'success') {
    // Remove notificação anterior se existir
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.animation = 'slideIn 0.3s ease-out';
    
    document.body.appendChild(notification);
    
    // Animação de entrada
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto-remover após 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Atualizar status de conexão
function updateConnectionStatus() {
    isOnline = navigator.onLine;
    
    if (isOnline) {
        statusText.textContent = '🌐 Online';
        statusDot.className = 'status-dot online';
    } else {
        statusText.textContent = '📴 Offline';
        statusDot.className = 'status-dot offline';
        showNotification('📶 Modo offline ativado. Dados salvos localmente.', 'info');
    }
}

// Registrar Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        const swUrl = IS_GITHUB_PAGES && REPO_NAME ? 
            `/${REPO_NAME}/service-worker.js` : 
            './service-worker.js';
        
        navigator.serviceWorker.register(swUrl)
            .then(registration => {
                console.log('✅ Service Worker registrado:', registration.scope);
                
                // Verificar atualizações
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 Nova versão do Service Worker encontrada');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showNotification('🔄 Nova versão disponível! Recarregue para atualizar.', 'info');
                        }
                    });
                });
            })
            .catch(error => {
                console.error('❌ Falha ao registrar Service Worker:', error);
                
                // Se falhar, tenta registrar sem caminho específico
                if (IS_GITHUB_PAGES) {
                    navigator.serviceWorker.register('/service-worker.js')
                        .then(reg => console.log('✅ Service Worker registrado (fallback):', reg.scope))
                        .catch(err => console.error('❌ Falha no fallback também:', err));
                }
            });
    } else {
        console.log('❌ Service Worker não suportado');
        showNotification('Seu navegador não suporta todas as funcionalidades do app', 'error');
    }
}

// Verificar se o app já está instalado
function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
}

// Manipular prompt de instalação
function handleBeforeInstallPrompt(e) {
    console.log('🎯 Evento beforeinstallprompt disparado');
    
    e.preventDefault();
    deferredPrompt = e;
    
    // Só mostra o botão se não for iOS (iOS não tem beforeinstallprompt)
    if (!isiOS()) {
        installButton.style.display = 'block';
        installButton.textContent = '📲 Instalar App';
    }
    
    // Adicionar listener para quando o app for instalado
    window.addEventListener('appinstalled', () => {
        console.log('🎉 App instalado via beforeinstallprompt');
        deferredPrompt = null;
        installButton.style.display = 'none';
        showNotification('🎉 Diário de Bordo instalado com sucesso!', 'success');
    });
}

// Instalar PWA
async function installPWA() {
    // No iOS, não temos beforeinstallprompt, então mostramos instruções
    if (isiOS()) {
        showInstallInstructions();
        return;
    }
    
    // No Android/Desktop com beforeinstallprompt
    if (deferredPrompt) {
        try {
            deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;
            
            if (choiceResult.outcome === 'accepted') {
                console.log('✅ Usuário aceitou instalação');
                installButton.style.display = 'none';
            } else {
                console.log('❌ Usuário recusou instalação');
                showNotification('Instalação cancelada. Você pode instalar depois pelo menu do navegador.', 'info');
            }
            
            deferredPrompt = null;
        } catch (error) {
            console.error('❌ Erro durante instalação:', error);
            showInstallInstructions();
        }
    } else {
        // Se não tem deferredPrompt, mostra instruções
        showInstallInstructions();
    }
}

// Mostrar instruções de instalação
function showInstallInstructions() {
    let instructions = '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isAndroid()) {
        instructions = `
            <h3>📱 Instalar no Android</h3>
            <ol>
                <li>Toque no <strong>menu (⋯)</strong> no canto superior direito</li>
                <li>Selecione <strong>"Adicionar à tela inicial"</strong></li>
                <li>Toque em <strong>"Adicionar"</strong></li>
                <li>Pronto! O app aparecerá na sua tela inicial</li>
            </ol>
            <div class="tip">
                💡 Dica: Use o <strong>Chrome</strong> para melhor experiência.
            </div>
        `;
    } else if (isiOS()) {
        instructions = `
            <h3>📱 Instalar no iPhone/iPad</h3>
            <ol>
                <li>Abra no <strong>Safari</strong> (não funciona no Chrome iOS)</li>
                <li>Toque no ícone de <strong>compartilhar (□↑)</strong></li>
                <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
                <li>Toque em <strong>"Adicionar"</strong> no canto superior direito</li>
                <li>O app aparecerá na sua tela inicial</li>
            </ol>
            <div class="tip">
                💡 Dica: <strong>Só funciona no Safari</strong>. Não use Chrome ou outros navegadores no iOS.
            </div>
        `;
    } else if (isMobile) {
        instructions = `
            <h3>📱 Instalar no Celular</h3>
            <p>Procure no menu do seu navegador por:</p>
            <ul>
                <li><strong>"Adicionar à tela inicial"</strong> (Android)</li>
                <li><strong>"Instalar aplicativo"</strong></li>
                <li>Ou no menu de compartilhamento</li>
            </ul>
            <div class="tip">
                💡 Use <strong>Chrome no Android</strong> ou <strong>Safari no iOS</strong> para melhor compatibilidade.
            </div>
        `;
    } else {
        instructions = `
            <h3>💻 Instalar no Computador</h3>
            
            <div class="browser-section">
                <h4>Google Chrome / Microsoft Edge:</h4>
                <div class="steps">
                    <div class="step">
                        1. Clique no ícone <span class="install-icon">⊡</span> na barra de endereço
                    </div>
                    <div class="step">
                        2. Ou vá em <strong>Menu → Mais ferramentas → Criar atalho...</strong>
                    </div>
                    <div class="step">
                        3. Marque <strong>"Abrir como janela"</strong> e clique em Criar
                    </div>
                </div>
            </div>
            
            <div class="tip">
                💡 Após instalar, o app aparecerá no Menu Iniciar (Windows) ou Launchpad (Mac).
            </div>
        `;
    }
    
    installInstructions.innerHTML = instructions;
    installModal.style.display = 'flex';
    
    // Focar no modal para acessibilidade
    setTimeout(() => installModal.querySelector('.modal-content').focus(), 100);
}

// Funções auxiliares de detecção
function isiOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
    return /Android/.test(navigator.userAgent);
}

function getDeviceType() {
    if (isiOS()) return 'iOS';
    if (isAndroid()) return 'Android';
    if (/Windows/.test(navigator.userAgent)) return 'Windows';
    if (/Mac/.test(navigator.userAgent)) return 'Mac';
    return 'Outro';
}

// Evento quando o app é instalado
window.addEventListener('appinstalled', () => {
    console.log('🎉 Diário de Bordo instalado!');
    installButton.style.display = 'none';
    
    // Salvar no analytics/localStorage
    localStorage.setItem('pwaInstalled', 'true');
    localStorage.setItem('pwaInstallDate', new Date().toISOString());
});

// Verificar periodicamente se o app foi instalado
setInterval(() => {
    if (isAppInstalled() && installButton.style.display !== 'none') {
        installButton.style.display = 'none';
        console.log('🔍 App detectado como instalado, escondendo botão');
    }
}, 5000);

// Adicionar CSS para animações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Expor funções para debug (remover em produção)
window.debugApp = () => {
    console.log('=== DEBUG DO APP ===');
    console.log('URL:', window.location.href);
    console.log('GitHub Pages:', IS_GITHUB_PAGES);
    console.log('Repo:', REPO_NAME);
    console.log('Service Worker:', 'serviceWorker' in navigator);
    console.log('Instalado:', isAppInstalled());
    console.log('Display Mode:', window.matchMedia('(display-mode: standalone)').matches);
    console.log('Deferred Prompt:', !!deferredPrompt);
    console.log('Device:', getDeviceType());
    console.log='==============';
};