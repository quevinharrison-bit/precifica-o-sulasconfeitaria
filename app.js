/**
 * app.js - Central Controller, Router and State Manager
 */

let activeTab = 'dashboard';

window.app = {
  /**
   * Inicialização da aplicação
   */
  async init() {
    try {
      // 1. Inicializar o banco de dados IndexedDB
      await window.db.init();

      // 2. Inicializar módulos de dados
      await window.ingredients.init();
      await window.bases.init();
      await window.products.init();

      // 3. Registrar eventos comuns de cabeçalho e configurações
      this.registerGlobalEvents();

      // 4. Carregar aba inicial
      await this.switchTab('dashboard');

      // 5. Ocultar o carregador inicial e habilitar navegação
      const loader = document.getElementById('tab-loading');
      if (loader) loader.classList.add('hidden');

    } catch (err) {
      console.error('Falha ao iniciar app:', err);
      this.showToast('Erro grave ao carregar banco de dados local.', 'error');
    }
  },

  /**
   * Roteador de abas simples
   */
  async switchTab(tabName) {
    activeTab = tabName;
    
    // Atualizar UI da barra de navegação inferior
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(btn => {
      const isSelected = btn.getAttribute('data-tab') === tabName;
      if (isSelected) {
        btn.className = 'nav-item flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl text-sweet-500 bg-sweet-100 font-bold transition-all duration-200';
      } else {
        btn.className = 'nav-item flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl text-sweet-600 font-medium hover:text-sweet-900 transition-all duration-200';
      }
    });

    // Mostrar carregador rápido
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="flex flex-col items-center justify-center h-64">
        <div class="w-8 h-8 border-4 border-sweet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    `;

    // Carregar e renderizar dados específicos da aba
    if (tabName === 'dashboard') {
      await window.dashboard.init();
      window.dashboard.render();
    } else if (tabName === 'ingredients') {
      await window.ingredients.init();
      window.ingredients.render();
    } else if (tabName === 'bases') {
      await window.bases.init();
      window.bases.render();
    } else if (tabName === 'products') {
      await window.products.init();
      window.products.render();
    }

    lucide.createIcons();
  },

  /**
   * Registra eventos globais (ex: configurações)
   */
  registerGlobalEvents() {
    // Botões de aba
    const navButtons = document.querySelectorAll('.nav-item');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.getAttribute('data-tab');
        if (tab && tab !== activeTab) {
          this.switchTab(tab);
        }
      });
    });

    // Modal de Configurações
    const btnSettings = document.getElementById('btn-settings');
    const modalSettings = document.getElementById('modal-settings');
    const btnCloseSettings = document.getElementById('close-settings');
    const formSettings = document.getElementById('form-settings');

    if (btnSettings && modalSettings) {
      btnSettings.addEventListener('click', async () => {
        const settings = await window.db.get('settings', 'config');
        if (settings) {
          document.getElementById('settings-workHourRate').value = settings.workHourRate.toFixed(2);
          document.getElementById('settings-indirectCostDefault').value = settings.indirectCostDefault;
          document.getElementById('settings-taxDefault').value = settings.taxDefault;
        }
        modalSettings.classList.remove('hidden');
      });
    }

    if (btnCloseSettings && modalSettings) {
      btnCloseSettings.addEventListener('click', () => {
        modalSettings.classList.add('hidden');
      });
    }

    if (formSettings && modalSettings) {
      formSettings.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const workHourRate = parseFloat(document.getElementById('settings-workHourRate').value) || 0;
        const indirectCostDefault = parseFloat(document.getElementById('settings-indirectCostDefault').value) || 0;
        const taxDefault = parseFloat(document.getElementById('settings-taxDefault').value) || 0;

        try {
          await window.db.put('settings', {
            id: 'config',
            workHourRate,
            indirectCostDefault,
            taxDefault
          });
          
          this.showToast('Configurações salvas!', 'success');
          modalSettings.classList.add('hidden');

          // Recalcular custos dependentes das configurações
          await window.ingredients.recalculateAllBasesAndProducts();
          
          // Recarregar a aba atual
          this.switchTab(activeTab);

        } catch (err) {
          console.error(err);
          this.showToast('Erro ao salvar configurações.', 'error');
        }
      });
    }
  },

  /**
   * Helper para formatar moeda em Reais
   */
  formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      value = 0;
    }
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  },

  /**
   * Sistema de Notificações Toast
   */
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    
    // Classes conforme o tipo
    let typeClasses = 'bg-white border-emerald-100 text-emerald-800 shadow-md';
    let iconName = 'check-circle';
    
    if (type === 'error') {
      typeClasses = 'bg-rose-50 border-rose-100 text-rose-800 shadow-md';
      iconName = 'alert-triangle';
    } else if (type === 'warning') {
      typeClasses = 'bg-amber-50 border-amber-100 text-amber-800 shadow-md';
      iconName = 'alert-circle';
    } else if (type === 'info') {
      typeClasses = 'bg-blue-50 border-blue-100 text-blue-800 shadow-md';
      iconName = 'info';
    }

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-xs font-semibold pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0 ${typeClasses}`;
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    // Trigger de animação de entrada
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    // Temporizador de destruição
    setTimeout(() => {
      toast.classList.add('translate-y-[-8px]', 'opacity-0');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
    }, 2800);
  }
};

// Iniciar a aplicação após o DOM carregar
window.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
