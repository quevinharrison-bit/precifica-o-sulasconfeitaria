/**
 * dashboard.js - Painel de Controle e Visão Geral
 */

(() => {
  let ingredientsCount = 0;
  let basesCount = 0;
  let productsList = [];

  window.dashboard = {
    /**
     * Inicializa o painel
     */
    async init() {
      await window.dashboard.loadData();
    },

    /**
     * Carrega dados do IndexedDB
     */
    async loadData() {
      const ingredients = await window.db.getAll('ingredients');
      const bases = await window.db.getAll('bases');
      productsList = await window.db.getAll('products');

      ingredientsCount = ingredients.length;
      basesCount = bases.length;
    },

    /**
     * Renderiza a página do dashboard
     */
    render() {
      const mainContent = document.getElementById('main-content');

      // Calcular estatísticas
      const totalProducts = productsList.length;
      
      let avgMargin = 0;
      let avgProfitValue = 0;
      let avgCpvPercent = 0;
      let avgIndirectPercent = 0;
      let avgLaborPercent = 0;

      if (totalProducts > 0) {
        let marginSum = 0;
        let profitSum = 0;
        let totalCpvSum = 0;
        let totalIndirectSum = 0;
        let totalLaborSum = 0;
        let totalSalesSum = 0;

        productsList.forEach(p => {
          const salePrice = p.finalPriceSet || p.finalPriceSuggested;
          marginSum += p.profitPercent;
          profitSum += p.profitValue;
          
          totalSalesSum += salePrice;
          totalCpvSum += p.cpv;
          totalIndirectSum += p.cpv * (p.indirectCostPercent / 100);
          totalLaborSum += p.laborCostCalculated;
        });

        avgMargin = marginSum / totalProducts;
        avgProfitValue = profitSum / totalProducts;

        if (totalSalesSum > 0) {
          avgCpvPercent = (totalCpvSum / totalSalesSum) * 100;
          avgIndirectPercent = (totalIndirectSum / totalSalesSum) * 100;
          avgLaborPercent = (totalLaborSum / totalSalesSum) * 100;
        }
      }

      // Top 3 Produtos Mais Lucrativos (por valor absoluto)
      const topProducts = [...productsList]
        .sort((a, b) => b.profitValue - a.profitValue)
        .slice(0, 3);

      mainContent.innerHTML = `
        <div class="page-fade-in space-y-5">
          
          <!-- Boas-vindas -->
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-black tracking-tight text-sweet-900">Olá, Confeiteira!</h2>
              <p class="text-xs text-sweet-600">Confira o resumo financeiro dos seus produtos</p>
            </div>
            <div class="text-right">
              <span class="text-xs font-bold text-sweet-500 bg-pink-50 border border-pink-100 px-3 py-1.5 rounded-xl block">
                ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          </div>

          <!-- Grade de Indicadores Rápidos -->
          <div class="grid grid-cols-3 gap-2.5">
            <div class="bg-white p-3 rounded-2xl border border-sweet-200/50 shadow-sm flex flex-col justify-between">
              <span class="text-[9px] font-bold text-sweet-600 uppercase tracking-wider">Insumos</span>
              <div class="mt-1 flex items-baseline gap-1">
                <span class="text-lg font-black">${ingredientsCount}</span>
                <span class="text-[9px] text-sweet-600 font-medium">itens</span>
              </div>
            </div>
            
            <div class="bg-white p-3 rounded-2xl border border-sweet-200/50 shadow-sm flex flex-col justify-between">
              <span class="text-[9px] font-bold text-sweet-600 uppercase tracking-wider">Bases</span>
              <div class="mt-1 flex items-baseline gap-1">
                <span class="text-lg font-black">${basesCount}</span>
                <span class="text-[9px] text-sweet-600 font-medium">salvas</span>
              </div>
            </div>

            <div class="bg-white p-3 rounded-2xl border border-sweet-200/50 shadow-sm flex flex-col justify-between">
              <span class="text-[9px] font-bold text-sweet-600 uppercase tracking-wider">Produtos</span>
              <div class="mt-1 flex items-baseline gap-1">
                <span class="text-lg font-black">${totalProducts}</span>
                <span class="text-[9px] text-sweet-600 font-medium">ativos</span>
              </div>
            </div>
          </div>

          <!-- Gráfico de Distribuição Média de Preço -->
          <div class="bg-white p-4.5 rounded-3xl border border-sweet-200/60 shadow-sm space-y-4">
            <div>
              <h3 class="text-sm font-bold text-sweet-900">Distribuição Média de Custos</h3>
              <p class="text-[10px] text-sweet-600">Como se divide o preço médio das suas vendas</p>
            </div>
            
            ${totalProducts === 0 ? window.dashboard.renderNoDataChart() : window.dashboard.renderDonutChart(avgCpvPercent, avgIndirectPercent, avgLaborPercent, avgMargin, avgProfitValue)}
          </div>

          <!-- Produtos em Destaque (Mais Lucrativos) -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-sweet-800 uppercase tracking-wider">Top 3 Produtos Lucrativos</h3>
              <span class="text-[10px] font-medium text-sweet-600">Ordenado por lucro líquido</span>
            </div>
            
            <div class="space-y-2">
              ${topProducts.length === 0 ? `
                <div class="bg-white p-4 text-center border border-dashed border-sweet-200 rounded-2xl text-xs text-sweet-600">
                  Os produtos mais lucrativos aparecerão aqui após você precificá-los.
                </div>
              ` : topProducts.map((p, idx) => window.dashboard.renderTopProductRow(p, idx)).join('')}
            </div>
          </div>

          <!-- Ações e Atalhos Rápidos -->
          <div class="space-y-3 pb-4">
            <h3 class="text-xs font-bold text-sweet-800 uppercase tracking-wider">Ações Rápidas</h3>
            <div class="grid grid-cols-2 gap-3">
              <button onclick="window.appActions.navigate('ingredients', true)" 
                class="bg-white hover:bg-sweet-100/30 p-3 rounded-2xl border border-sweet-200 flex items-center gap-3 text-left transition-colors">
                <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                  <i data-lucide="plus" class="w-4 h-4"></i>
                </div>
                <div>
                  <span class="block text-xs font-bold text-sweet-900 leading-tight">Novo Insumo</span>
                  <span class="text-[9px] text-sweet-600">Cadastrar matéria-prima</span>
                </div>
              </button>

              <button onclick="window.appActions.navigate('bases', true)" 
                class="bg-white hover:bg-sweet-100/30 p-3 rounded-2xl border border-sweet-200 flex items-center gap-3 text-left transition-colors">
                <div class="w-8 h-8 rounded-xl bg-pink-50 text-sweet-500 flex items-center justify-center">
                  <i data-lucide="plus" class="w-4 h-4"></i>
                </div>
                <div>
                  <span class="block text-xs font-bold text-sweet-900 leading-tight">Nova Base</span>
                  <span class="text-[9px] text-sweet-600">Criar sub-receita</span>
                </div>
              </button>

              <button onclick="window.appActions.navigate('products', true)" 
                class="bg-white hover:bg-sweet-100/30 p-3 rounded-2xl border border-sweet-200 flex items-center gap-3 text-left transition-colors">
                <div class="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
                  <i data-lucide="calculator" class="w-4 h-4"></i>
                </div>
                <div>
                  <span class="block text-xs font-bold text-sweet-900 leading-tight">Precificar</span>
                  <span class="text-[9px] text-sweet-600">Calcular preço de venda</span>
                </div>
              </button>

              <button id="btn-settings-dash" 
                class="bg-white hover:bg-sweet-100/30 p-3 rounded-2xl border border-sweet-200 flex items-center gap-3 text-left transition-colors">
                <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <i data-lucide="sliders" class="w-4 h-4"></i>
                </div>
                <div>
                  <span class="block text-xs font-bold text-sweet-900 leading-tight">Configurações</span>
                  <span class="text-[9px] text-sweet-600">Taxas e valor de hora</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      window.dashboard.registerEvents();
    },

    /**
     * Renders a top product card
     */
    renderTopProductRow(product, index) {
      const salePrice = product.finalPriceSet || product.finalPriceSuggested;
      const medals = ['🥇', '🥈', '🥉'];
      
      return `
        <div class="bg-white p-3 rounded-2xl border border-sweet-200/50 shadow-sm flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="text-sm font-semibold">${medals[index]}</span>
            <div>
              <h4 class="text-xs font-bold text-sweet-900">${product.name}</h4>
              <p class="text-[10px] text-sweet-600">
                Vendido por: <span class="font-bold text-sweet-900">${window.app.formatCurrency(salePrice)}</span>
              </p>
            </div>
          </div>
          <div class="text-right">
            <span class="block text-[9px] font-semibold text-sweet-600 uppercase">Lucro Líquido</span>
            <span class="text-xs font-bold text-emerald-600">${window.app.formatCurrency(product.profitValue)}</span>
          </div>
        </div>
      `;
    },

    /**
     * Renders empty state chart
     */
    renderNoDataChart() {
      return `
        <div class="flex flex-col items-center justify-center py-6 text-center">
          <div class="w-16 h-16 opacity-30 text-sweet-800 flex items-center justify-center">
            <i data-lucide="pie-chart" class="w-12 h-12"></i>
          </div>
          <p class="text-xs text-sweet-600 max-w-xs mt-2">
            Cadastre e precifique seus produtos finais para ver os gráficos de lucratividade e distribuição de custos.
          </p>
        </div>
      `;
    },

    /**
     * Generates a beautiful SVG donut chart dynamically
     */
    renderDonutChart(cpv, indirect, labor, margin, avgProfitVal) {
      const total = cpv + indirect + labor + Math.max(0, margin);
      if (total === 0) return window.dashboard.renderNoDataChart();

      const pCpv = cpv;
      const pIndirect = indirect;
      const pLabor = labor;
      const pMargin = Math.max(0, margin);
      
      const r = 50;
      const circumference = 2 * Math.PI * r;

      const dashCpv = (pCpv / 100) * circumference;
      const offsetCpv = 0;

      const dashIndirect = (pIndirect / 100) * circumference;
      const offsetIndirect = dashCpv;

      const dashLabor = (pLabor / 100) * circumference;
      const offsetLabor = dashCpv + dashIndirect;

      const dashMargin = (pMargin / 100) * circumference;
      const offsetMargin = dashCpv + dashIndirect + dashLabor;

      return `
        <div class="flex items-center gap-4">
          <div class="w-32 h-32 flex-shrink-0 relative">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="${r}" fill="none" stroke="#f1ebe9" stroke-width="12" />
              
              <circle cx="60" cy="60" r="${r}" fill="none" stroke="#3b82f6" stroke-width="12"
                stroke-dasharray="${dashCpv} ${circumference}"
                stroke-dashoffset="-${offsetCpv}"
                stroke-linecap="round" />

              <circle cx="60" cy="60" r="${r}" fill="none" stroke="#f59e0b" stroke-width="12"
                stroke-dasharray="${dashIndirect} ${circumference}"
                stroke-dashoffset="-${offsetIndirect}"
                stroke-linecap="round" />

              <circle cx="60" cy="60" r="${r}" fill="none" stroke="#8b5cf6" stroke-width="12"
                stroke-dasharray="${dashLabor} ${circumference}"
                stroke-dashoffset="-${offsetLabor}"
                stroke-linecap="round" />

              <circle cx="60" cy="60" r="${r}" fill="none" stroke="#ec4899" stroke-width="12"
                stroke-dasharray="${dashMargin} ${circumference}"
                stroke-dashoffset="-${offsetMargin}"
                stroke-linecap="round" />
            </svg>
            
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span class="text-[9px] text-sweet-600 font-semibold uppercase leading-none">Lucro Médio</span>
              <span class="text-xs font-black text-emerald-600 mt-0.5">${window.app.formatCurrency(avgProfitVal)}</span>
            </div>
          </div>

          <div class="flex-1 space-y-1.5 text-[11px] font-semibold">
            <div class="flex items-center justify-between text-sweet-900">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-[#ec4899] block"></span>
                <span>Lucro Líquido:</span>
              </div>
              <span>${pMargin.toFixed(0)}%</span>
            </div>

            <div class="flex items-center justify-between text-sweet-900">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-[#3b82f6] block"></span>
                <span>Matéria-Prima:</span>
              </div>
              <span>${pCpv.toFixed(0)}%</span>
            </div>

            <div class="flex items-center justify-between text-sweet-900">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-[#f59e0b] block"></span>
                <span>Gastos Gerais:</span>
              </div>
              <span>${pIndirect.toFixed(0)}%</span>
            </div>

            <div class="flex items-center justify-between text-sweet-900">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] block"></span>
                <span>Mão de Obra:</span>
              </div>
              <span>${pLabor.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      `;
    },

    /**
     * Registra eventos do Dashboard
     */
    registerEvents() {
      const btnSettingsDash = document.getElementById('btn-settings-dash');
      if (btnSettingsDash) {
        btnSettingsDash.addEventListener('click', () => {
          document.getElementById('btn-settings').click();
        });
      }

      window.appActions = window.appActions || {};
      window.appActions.navigate = (tab, loadModal = false) => {
        const navBtn = document.querySelector(`[data-tab="${tab}"]`);
        if (navBtn) {
          navBtn.click();
          
          if (loadModal) {
            setTimeout(() => {
              if (tab === 'ingredients') {
                const btn = document.getElementById('btn-add-ingredient');
                if (btn) btn.click();
              } else if (tab === 'bases') {
                const btn = document.getElementById('btn-add-base');
                if (btn) btn.click();
              } else if (tab === 'products') {
                const btn = document.getElementById('btn-add-product');
                if (btn) btn.click();
              }
            }, 150);
          }
        }
      };
    }
  };
})();
