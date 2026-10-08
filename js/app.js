/**
 * app.js - Central Controller, Router, PWA Manager and State Manager
 */

(() => {
  let activeTab = 'dashboard';
  let deferredPrompt = null;

  // Helper interno seguro para renderizar ícones lucide
  function safeCreateIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try {
        window.lucide.createIcons();
      } catch (err) {
        console.warn('Erro ao carregar ícones Lucide:', err);
      }
    }
  }

  // Registrar Service Worker para suporte PWA e modo offline
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        console.log('[PWA] Service Worker registrado com sucesso no escopo:', reg.scope);
      }).catch((err) => {
        console.warn('[PWA] Falha no registro do Service Worker:', err);
      });
    });
  }

  // Capturar evento de instalação do PWA (beforeinstallprompt)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.classList.remove('hidden');
      safeCreateIcons();
    }
  });

  window.app = {
    /**
     * Inicialização da aplicação
     */
    async init() {
      try {
        // 1. Inicializar tema salvo (Modo Escuro / Claro)
        window.app.initTheme();

        // 2. Inicializar o banco de dados IndexedDB (com fallback para LocalStorage)
        await window.db.init();

        // 3. Inicializar módulos de dados
        await window.ingredients.init();
        await window.bases.init();
        await window.products.init();

        // 4. Registrar eventos comuns de cabeçalho, PWA e configurações
        window.app.registerGlobalEvents();
        window.app.registerPwaEvents();

        // 5. Carregar aba inicial
        await window.app.switchTab('dashboard');

        // 6. Ocultar o carregador inicial e habilitar navegação
        const loader = document.getElementById('tab-loading');
        if (loader) loader.classList.add('hidden');

      } catch (err) {
        console.error('Falha ao iniciar app:', err);
        
        const loader = document.getElementById('tab-loading');
        if (loader) loader.classList.add('hidden');

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.innerHTML = `
            <div class="p-6 bg-rose-50 text-rose-800 rounded-2xl border border-rose-200 text-center max-w-sm mx-auto my-12 shadow-sm">
              <div class="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mx-auto mb-3">
                <i data-lucide="alert-triangle" class="w-6 h-6"></i>
              </div>
              <h3 class="font-bold text-sm">Erro de Carregamento</h3>
              <p class="text-xs mt-1 text-rose-700 font-medium">Não foi possível iniciar o aplicativo devido a uma restrição de armazenamento local. Detalhes: ${err.message || err}</p>
              <button onclick="location.reload()" class="mt-4 w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl text-xs transition-colors">
                Tentar Recarregar
              </button>
            </div>
          `;
          safeCreateIcons();
        }
      }
    },

    /**
     * Registra manipulação do banner de instalação do PWA
     */
    registerPwaEvents() {
      const btnInstallPWA = document.getElementById('btn-install-pwa');
      if (btnInstallPWA) {
        btnInstallPWA.addEventListener('click', async () => {
          if (!deferredPrompt) {
            window.app.showToast('Abra a opção do seu navegador e selecione "Adicionar à Tela Inicial".', 'info');
            return;
          }
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            window.app.showToast('Aplicativo instalado com sucesso!', 'success');
          }
          deferredPrompt = null;
          const banner = document.getElementById('pwa-install-banner');
          if (banner) banner.classList.add('hidden');
        });
      }
    },

    /**
     * Inicializa o tema baseado nas preferências salvas no localStorage
     */
    initTheme() {
      const savedTheme = localStorage.getItem('theme') || 'light';
      const btnToggle = document.getElementById('btn-theme-toggle');
      
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        if (btnToggle) {
          btnToggle.innerHTML = `<i data-lucide="sun" class="w-4 h-4"></i>`;
        }
      } else {
        document.documentElement.classList.remove('dark');
        if (btnToggle) {
          btnToggle.innerHTML = `<i data-lucide="moon" class="w-4 h-4"></i>`;
        }
      }
      safeCreateIcons();
    },

    /**
     * Alterna entre modo claro e escuro e salva a preferência
     */
    toggleTheme() {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      
      const btnToggle = document.getElementById('btn-theme-toggle');
      if (btnToggle) {
        btnToggle.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" class="w-4 h-4"></i>`;
      }
      
      safeCreateIcons();
      window.app.showToast(isDark ? 'Modo Escuro ativado!' : 'Modo Claro ativado!', 'info');
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
          btn.className = 'nav-item flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl text-sweet-500 bg-sweet-100 dark:bg-sweet-900 font-bold transition-all duration-200';
        } else {
          btn.className = 'nav-item flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl text-sweet-600 dark:text-sweet-400 font-medium hover:text-sweet-900 transition-all duration-200';
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

      safeCreateIcons();
    },

    /**
     * Registra eventos globais (ex: configurações, alteração de tema e hora confeiteira)
     */
    registerGlobalEvents() {
      // Botões de aba
      const navButtons = document.querySelectorAll('.nav-item');
      navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tab = btn.getAttribute('data-tab');
          if (tab && tab !== activeTab) {
            window.app.switchTab(tab);
          }
        });
      });

      // Botão de Alternar Tema (Escuro/Claro)
      const btnTheme = document.getElementById('btn-theme-toggle');
      if (btnTheme) {
        btnTheme.addEventListener('click', () => {
          window.app.toggleTheme();
        });
      }

      // Modal de Configurações
      const btnSettings = document.getElementById('btn-settings');
      const modalSettings = document.getElementById('modal-settings');
      const btnCloseSettings = document.getElementById('close-settings');
      const formSettings = document.getElementById('form-settings');

      // Inputs da Calculadora de Hora Confeiteira
      const inputSalary = document.getElementById('settings-desiredSalary');
      const inputHours = document.getElementById('settings-monthlyHours');
      const inputRate = document.getElementById('settings-workHourRate');
      const lblRateCalculated = document.getElementById('lbl-settings-hour-rate-calculated');

      const updateHourRateLive = () => {
        const salary = parseFloat(inputSalary.value) || 0;
        const hours = parseFloat(inputHours.value) || 1;
        if (salary > 0 && hours > 0) {
          const calculatedRate = salary / hours;
          inputRate.value = calculatedRate.toFixed(2);
          if (lblRateCalculated) {
            lblRateCalculated.textContent = `${window.app.formatCurrency(calculatedRate)}/h`;
          }
        }
      };

      if (inputSalary && inputHours && inputRate) {
        inputSalary.addEventListener('input', updateHourRateLive);
        inputHours.addEventListener('input', updateHourRateLive);
        inputRate.addEventListener('input', () => {
          const val = parseFloat(inputRate.value) || 0;
          if (lblRateCalculated) {
            lblRateCalculated.textContent = `${window.app.formatCurrency(val)}/h`;
          }
        });
      }

      if (btnSettings && modalSettings) {
        btnSettings.addEventListener('click', async () => {
          const settings = await window.db.get('settings', 'config') || {};
          
          const salary = settings.desiredSalary !== undefined ? settings.desiredSalary : 3000;
          const hours = settings.monthlyHours !== undefined ? settings.monthlyHours : 160;
          const rate = settings.workHourRate !== undefined ? settings.workHourRate : (salary / hours);

          if (inputSalary) inputSalary.value = salary;
          if (inputHours) inputHours.value = hours;
          if (inputRate) inputRate.value = rate.toFixed(2);
          if (lblRateCalculated) lblRateCalculated.textContent = `${window.app.formatCurrency(rate)}/h`;

          document.getElementById('settings-indirectCostDefault').value = settings.indirectCostDefault !== undefined ? settings.indirectCostDefault : 15;
          document.getElementById('settings-taxDefault').value = settings.taxDefault !== undefined ? settings.taxDefault : 5;

          modalSettings.classList.remove('hidden');
          safeCreateIcons();
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
          
          const desiredSalary = parseFloat(inputSalary.value) || 3000;
          const monthlyHours = parseFloat(inputHours.value) || 160;
          const workHourRate = parseFloat(inputRate.value) || (desiredSalary / monthlyHours);
          const indirectCostDefault = parseFloat(document.getElementById('settings-indirectCostDefault').value) || 0;
          const taxDefault = parseFloat(document.getElementById('settings-taxDefault').value) || 0;

          try {
            await window.db.put('settings', {
              id: 'config',
              desiredSalary,
              monthlyHours,
              workHourRate,
              indirectCostDefault,
              taxDefault
            });
            
            window.app.showToast('Configurações de produção salvas!', 'success');
            modalSettings.classList.add('hidden');

            // Recalcular custos dependentes das configurações
            await window.ingredients.recalculateAllBasesAndProducts();
            
            // Recarregar a aba atual
            window.app.switchTab(activeTab);

          } catch (err) {
            console.error(err);
            window.app.showToast('Erro ao salvar configurações.', 'error');
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
      
      let typeClasses = 'bg-white border-emerald-100 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-900 dark:text-emerald-300 shadow-md';
      let iconName = 'check-circle';
      
      if (type === 'error') {
        typeClasses = 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/90 dark:border-rose-900 dark:text-rose-300 shadow-md';
        iconName = 'alert-triangle';
      } else if (type === 'warning') {
        typeClasses = 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-950/90 dark:border-amber-900 dark:text-amber-300 shadow-md';
        iconName = 'alert-circle';
      } else if (type === 'info') {
        typeClasses = 'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-950/90 dark:border-blue-900 dark:text-blue-300 shadow-md';
        iconName = 'info';
      }

      toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-xs font-semibold pointer-events-none transform transition-all duration-300 translate-y-2 opacity-0 ${typeClasses}`;
      toast.innerHTML = `
        <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>
        <span class="flex-1">${message}</span>
      `;

      container.appendChild(toast);
      safeCreateIcons();

      requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
      });

      setTimeout(() => {
        toast.classList.add('translate-y-[-8px]', 'opacity-0');
        toast.addEventListener('transitionend', () => {
          toast.remove();
        });
      }, 2800);
    }
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      window.app.init();
    });
  } else {
    window.app.init();
  }
})();
