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

// Variáveis globais
let entries = [];
let deferredPrompt = null;
let isOnline = navigator.onLine;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Inicializar aplicação
function initApp() {
    console.log('Inicializando Diário de Bordo PWA');
    
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
    
    // Verificar se já está instalado
    if (isAppInstalled()) {
        console.log('App já está instalado');
        installButton.style.display = 'none';
    }
    
    // Configurar modal
    setupModal();
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
    
    // Forçar atualização do service worker quando a página ganhar foco
    window.addEventListener('focus', () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) {
                    reg.update();
                }
            });
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
}

// Carregar entradas do localStorage
function loadEntries() {
    const savedEntries = localStorage.getItem('diarioEntries');
    if (savedEntries) {
        try {
            entries = JSON.parse(savedEntries);
            renderEntries();
        } catch (error) {
            console.error('Erro ao carregar entradas:', error);
            entries = [];
        }
    }
}

// Salvar entradas no localStorage
function saveEntries() {
    try {
        localStorage.setItem('diarioEntries', JSON.stringify(entries));
        updateEntriesCounter();
    } catch (error) {
        console.error('Erro ao salvar entradas:', error);
        showNotification('Erro ao salvar entrada. Tente novamente.', 'error');
    }
}

// Renderizar entradas na tela
function renderEntries(filteredEntries = null) {
    const entriesToRender = filteredEntries || entries;
    
    // Verificar se há entradas para mostrar
    if (entriesToRender.length === 0) {
        entriesList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    // Esconder estado vazio
    emptyState.style.display = 'none';
    
    // Ordenar entradas por data (mais recentes primeiro)
    const sortedEntries = [...entriesToRender].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // Gerar HTML das entradas
    let entriesHTML = '';
    
    sortedEntries.forEach((entry) => {
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString('pt-BR');
        
        entriesHTML += `
            <div class="entry-card" data-id="${entry.id}">
                <div class="entry-header">
                    <h3 class="entry-title">${entry.title}</h3>
                    <span class="entry-date">${formattedDate}</span>
                </div>
                <p class="entry-description">${entry.description}</p>
                <div class="entry-actions">
                    <button class="btn btn-danger" onclick="deleteEntry('${entry.id}')">
                        Excluir
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
    
    // Obter valores do formulário
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const date = document.getElementById('date').value;
    
    // Validar dados
    if (!title || !description || !date) {
        showNotification('Por favor, preencha todos os campos!', 'error');
        return;
    }
    
    // Criar nova entrada
    const newEntry = {
        id: generateId(),
        title,
        description,
        date,
        createdAt: new Date().toISOString()
    };
    
    // Adicionar à lista e salvar
    entries.unshift(newEntry);
    saveEntries();
    renderEntries();
    
    // Limpar formulário
    entryForm.reset();
    
    // Definir data atual como padrão
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Mostrar notificação
    showNotification('Entrada adicionada com sucesso!');
    
    // Rolar para a nova entrada
    setTimeout(() => {
        const newEntryElement = document.querySelector(`[data-id="${newEntry.id}"]`);
        if (newEntryElement) {
            newEntryElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 100);
}

// Gerar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Excluir entrada
function deleteEntry(id) {
    if (confirm('Tem certeza que deseja excluir esta entrada?')) {
        // Filtrar entrada a ser removida
        entries = entries.filter(entry => entry.id !== id);
        
        // Salvar e renderizar
        saveEntries();
        renderEntries();
        
        // Mostrar notificação
        showNotification('Entrada excluída com sucesso!');
    }
}

// Filtrar entradas por data
function handleFilterDate() {
    const filterValue = filterDate.value;
    
    if (!filterValue) {
        renderEntries();
        return;
    }
    
    const filteredEntries = entries.filter(entry => {
        return entry.date === filterValue;
    });
    
    renderEntries(filteredEntries);
}

// Atualizar contador de entradas
function updateEntriesCounter() {
    totalEntries.textContent = entries.length;
}

// Mostrar notificação
function showNotification(message, type = 'success') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Adicionar ao corpo
    document.body.appendChild(notification);
    
    // Mostrar notificação
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 3000);
}

// Atualizar status de conexão
function updateConnectionStatus() {
    isOnline = navigator.onLine;
    
    if (isOnline) {
        statusText.textContent = 'Online';
        statusDot.className = 'status-dot online';
    } else {
        statusText.textContent = 'Offline';
        statusDot.className = 'status-dot offline';
        showNotification('Você está offline. As entradas serão salvas localmente.', 'info');
    }
}

// Registrar Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Registrar service worker
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('Service Worker registrado com sucesso:', registration.scope);
                    
                    // Verificar se há uma nova versão do service worker
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('Nova versão do Service Worker encontrada:', newWorker);
                        
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('Nova versão do Service Worker instalada. Recarregue para atualizar.');
                            }
                        });
                    });
                })
                .catch(error => {
                    console.log('Falha ao registrar Service Worker:', error);
                });
        });
    } else {
        console.log('Service Worker não suportado neste navegador');
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
    console.log('Evento beforeinstallprompt disparado');
    
    // Prevenir que o prompt apareça automaticamente
    e.preventDefault();
    
    // Armazenar o evento para usar depois
    deferredPrompt = e;
    
    // Verificar se já está instalado
    if (isAppInstalled()) {
        console.log('App já instalado, escondendo botão');
        installButton.style.display = 'none';
        return;
    }
    
    // Mostrar botão de instalação
    console.log('Mostrando botão de instalação');
    installButton.style.display = 'block';
    
    // Adicionar listener para quando o app for instalado
    window.addEventListener('appinstalled', () => {
        console.log('App instalado com sucesso via beforeinstallprompt');
        deferredPrompt = null;
        installButton.style.display = 'none';
    });
}

// Instalar PWA
async function installPWA() {
    console.log('Tentando instalar PWA...');
    
    if (!deferredPrompt) {
        console.log('Nenhum prompt de instalação disponível, mostrando instruções manuais');
        showInstallInstructions();
        return;
    }
    
    try {
        // Mostrar prompt de instalação
        console.log('Mostrando prompt de instalação');
        deferredPrompt.prompt();
        
        // Aguardar resposta do usuário
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
            console.log('Usuário aceitou a instalação');
            showNotification('Diário de Bordo instalado com sucesso! 🎉');
            installButton.style.display = 'none';
        } else {
            console.log('Usuário recusou a instalação');
            showNotification('Instalação cancelada. Você pode instalar depois clicando no botão "Instalar App".', 'info');
        }
        
        deferredPrompt = null;
    } catch (error) {
        console.error('Erro ao instalar PWA:', error);
        showNotification('Não foi possível instalar o aplicativo. Tente novamente mais tarde.', 'error');
        showInstallInstructions();
    }
}

// Mostrar instruções de instalação manuais
function showInstallInstructions() {
    const userAgent = navigator.userAgent.toLowerCase();
    let instructions = '';
    
    if (/android/.test(userAgent)) {
        instructions = `
            <h3>📱 Como instalar no Android:</h3>
            <ol>
                <li>Toque no menu (três pontos) no canto superior direito do Chrome</li>
                <li>Selecione <strong>"Adicionar à tela inicial"</strong></li>
                <li>Toque em <strong>"Adicionar"</strong> para confirmar</li>
                <li>O aplicativo aparecerá na sua tela inicial</li>
            </ol>
            <div class="tip">
                💡 Dica: Alguns dispositivos Android podem mostrar "Instalar aplicativo" em vez de "Adicionar à tela inicial".
            </div>
        `;
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
        instructions = `
            <h3>📱 Como instalar no iOS (iPhone/iPad):</h3>
            <ol>
                <li>Toque no ícone de compartilhar <strong>(📤)</strong> na parte inferior do Safari</li>
                <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
                <li>Toque em <strong>"Adicionar"</strong> no canto superior direito</li>
                <li>O aplicativo aparecerá na sua tela inicial</li>
            </ol>
            <div class="tip">
                💡 Dica: Use o Safari, pois outros navegadores no iOS podem não suportar instalação de PWA.
            </div>
        `;
    } else if (/chrome/.test(userAgent)) {
        instructions = `
            <h3>💻 Como instalar no Chrome Desktop:</h3>
            <div class="browser-section">
                <h4>Método 1: Barra de endereço</h4>
                <div class="steps">
                    <div class="step">
                        <strong>Passo 1:</strong> Procure o ícone de instalação na barra de endereço:
                        <div class="icon-demo">https://seusite.com <span class="install-icon">⊡</span></div>
                    </div>
                    <div class="step">
                        <strong>Passo 2:</strong> Clique no ícone <span class="install-icon">⊡</span>
                    </div>
                    <div class="step">
                        <strong>Passo 3:</strong> Clique em <strong>"Instalar"</strong>
                    </div>
                </div>
            </div>
            
            <div class="browser-section">
                <h4>Método 2: Menu do Chrome</h4>
                <div class="steps">
                    <div class="step">
                        <strong>Passo 1:</strong> Clique no menu (três pontos) no canto superior direito
                    </div>
                    <div class="step">
                        <strong>Passo 2:</strong> Vá em <strong>"Mais ferramentas"</strong>
                    </div>
                    <div class="step">
                        <strong>Passo 3:</strong> Selecione <strong>"Criar atalho..."</strong>
                    </div>
                    <div class="step">
                        <strong>Passo 4:</strong> Marque <strong>"Abrir como janela"</strong> e clique em <strong>"Criar"</strong>
                    </div>
                </div>
            </div>
            
            <div class="tip">
                💡 Dica: Após instalar, o aplicativo aparecerá no menu Iniciar do Windows e poderá ser executado como um programa normal.
            </div>
        `;
    } else if (/firefox/.test(userAgent)) {
        instructions = `
            <h3>🦊 Como instalar no Firefox:</h3>
            <div class="browser-section">
                <h4>Método 1: Barra de endereço</h4>
                <div class="steps">
                    <div class="step">
                        <strong>Passo 1:</strong> Procure o ícone <strong>"+"</strong> ou <strong>"Instalar"</strong> na barra de endereço
                    </div>
                    <div class="step">
                        <strong>Passo 2:</strong> Clique no ícone e selecione <strong>"Instalar"</strong>
                    </div>
                </div>
            </div>
            
            <div class="browser-section">
                <h4>Método 2: Menu do Firefox</h4>
                <div class="steps">
                    <div class="step">
                        <strong>Passo 1:</strong> Clique no menu (três linhas) no canto superior direito
                    </div>
                    <div class="step">
                        <strong>Passo 2:</strong> Selecione <strong>"Instalar Diário de Bordo"</strong>
                    </div>
                </div>
            </div>
        `;
    } else if (/edg/.test(userAgent)) {
        instructions = `
            <h3>🌐 Como instalar no Microsoft Edge:</h3>
            <div class="steps">
                <div class="step">
                    <strong>Passo 1:</strong> Clique no ícone de instalação na barra de endereço ou menu (três pontos)
                </div>
                <div class="step">
                    <strong>Passo 2:</strong> Selecione <strong>"Instalar"</strong> ou <strong>"Instalar este site como um aplicativo"</strong>
                </div>
                <div class="step">
                    <strong>Passo 3:</strong> Confirme a instalação
                </div>
            </div>
        `;
    } else {
        instructions = `
            <h3>🌍 Instruções gerais para instalação:</h3>
            <p>Para instalar este aplicativo como PWA (Aplicativo Web Progressivo):</p>
            <ul>
                <li>Procure na barra de endereço do seu navegador por um ícone de instalação (geralmente <span class="install-icon">⊡</span> ou <strong>+</strong>)</li>
                <li>Ou verifique no menu do navegador a opção <strong>"Instalar"</strong>, <strong>"Adicionar à tela inicial"</strong> ou similar</li>
                <li>Em dispositivos móveis, use o menu de compartilhamento</li>
            </ul>
            <div class="tip">
                💡 Dica: O aplicativo funciona 100% offline após instalado e pode ser usado como um app nativo.
            </div>
        `;
    }
    
    installInstructions.innerHTML = instructions;
    installModal.style.display = 'flex';
}

// Debug do PWA (útil para desenvolvedores)
function debugPWA() {
    console.log('=== DEBUG DO PWA ===');
    console.log('URL atual:', window.location.href);
    console.log('Protocolo:', window.location.protocol);
    console.log('Deferred prompt disponível:', !!deferredPrompt);
    console.log('App instalado:', isAppInstalled());
    console.log('Display mode:', window.matchMedia('(display-mode: standalone)').matches);
    console.log('Standalone (iOS):', window.navigator.standalone);
    console.log('Service Worker suportado:', 'serviceWorker' in navigator);
    console.log('Online:', navigator.onLine);
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration()
            .then(reg => {
                console.log('Service Worker registrado:', !!reg);
                if (reg) {
                    console.log('Scope:', reg.scope);
                    reg.update();
                }
            })
            .catch(err => console.error('Erro ao verificar Service Worker:', err));
    }
}

// Verificar periodicamente se há mudanças no status de instalação
setInterval(() => {
    if (isAppInstalled() && installButton.style.display !== 'none') {
        console.log('App foi instalado, escondendo botão');
        installButton.style.display = 'none';
    }
}, 3000);

// Evento quando o app é instalado
window.addEventListener('appinstalled', () => {
    console.log('Diário de Bordo foi instalado com sucesso!');
    installButton.style.display = 'none';
    showNotification('Diário de Bordo instalado! Agora você pode usá-lo como um aplicativo nativo.', 'success');
});

// Expor função de debug globalmente (para testes)
window.debugPWA = debugPWA;

// Adicionar botão de debug temporário (remova em produção)
const debugBtn = document.createElement('button');
debugBtn.textContent = 'Debug';
debugBtn.style.position = 'fixed';
debugBtn.style.bottom = '60px';
debugBtn.style.right = '10px';
debugBtn.style.zIndex = '9999';
debugBtn.style.padding = '5px 10px';
debugBtn.style.fontSize = '10px';
debugBtn.style.backgroundColor = '#666';
debugBtn.style.color = 'white';
debugBtn.style.border = 'none';
debugBtn.style.borderRadius = '3px';
debugBtn.onclick = debugPWA;
document.body.appendChild(debugBtn);