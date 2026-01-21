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

// Variáveis globais
let entries = [];
let deferredPrompt;
let isOnline = navigator.onLine;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Inicializar aplicação
function initApp() {
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
}

// Carregar entradas do localStorage
function loadEntries() {
    const savedEntries = localStorage.getItem('diarioEntries');
    if (savedEntries) {
        entries = JSON.parse(savedEntries);
        renderEntries();
    }
}

// Salvar entradas no localStorage
function saveEntries() {
    localStorage.setItem('diarioEntries', JSON.stringify(entries));
    updateEntriesCounter();
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
    
    sortedEntries.forEach((entry, index) => {
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
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registrado com sucesso:', registration);
                })
                .catch(error => {
                    console.log('Falha ao registrar Service Worker:', error);
                });
        });
    }
}

// Manipular prompt de instalação
function handleBeforeInstallPrompt(e) {
    // Prevenir que o prompt apareça automaticamente
    e.preventDefault();
    
    // Armazenar o evento para usar depois
    deferredPrompt = e;
    
    // Mostrar botão de instalação
    installButton.style.display = 'block';
}

// Instalar PWA
function installPWA() {
    if (!deferredPrompt) {
        return;
    }
    
    // Mostrar prompt de instalação
    deferredPrompt.prompt();
    
    // Aguardar resposta do usuário
    deferredPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
            console.log('Usuário aceitou a instalação');
            showNotification('Aplicativo instalado com sucesso!');
            installButton.style.display = 'none';
        } else {
            console.log('Usuário recusou a instalação');
        }
        
        deferredPrompt = null;
    });
}

// Verificar se a aplicação já está instalada
window.addEventListener('appinstalled', () => {
    console.log('PWA instalado com sucesso');
    installButton.style.display = 'none';
    deferredPrompt = null;
});