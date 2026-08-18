/**
 * products.js - Módulo de Montagem de Produtos e Precificação Inteligente
 */

let productsList = [];
let ingredientsList = [];
let basesList = [];
let globalSettings = {};

let searchFilter = '';
let currentProductItems = []; // Itens inseridos no produto em edição

window.products = {
  /**
   * Inicializa o módulo de produtos
   */
  async init() {
    await this.loadData();
  },

  /**
   * Carrega dados do IndexedDB
   */
  async loadData() {
    productsList = await window.db.getAll('products');
    ingredientsList = await window.db.getAll('ingredients');
    basesList = await window.db.getAll('bases');
    globalSettings = await window.db.get('settings', 'config') || { workHourRate: 15, indirectCostDefault: 15, taxDefault: 5 };
    productsList.sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Renderiza a página de produtos
   */
  render() {
    const mainContent = document.getElementById('main-content');
    
    const filtered = productsList.filter(item => 
      item.name.toLowerCase().includes(searchFilter.toLowerCase())
    );

    mainContent.innerHTML = `
      <div class="page-fade-in space-y-4">
        <!-- Título e Ações -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold tracking-tight">Produtos Finais</h2>
            <p class="text-xs text-sweet-600">Precifique bolos, doces e kits</p>
          </div>
          <button id="btn-add-product" class="bg-sweet-500 hover:bg-sweet-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
            <i data-lucide="plus" class="w-4 h-4"></i> Precificar Produto
          </button>
        </div>

        <!-- Barra de Busca -->
        <div class="relative">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-sweet-600">
            <i data-lucide="search" class="w-4 h-4"></i>
          </span>
          <input type="search" id="search-products" placeholder="Buscar por produto final..." value="${searchFilter}"
            class="w-full pl-9 pr-4 py-2 bg-white border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-sm font-medium">
        </div>

        <!-- Lista de Produtos -->
        <div class="space-y-2.5" id="products-container">
          ${filtered.length === 0 ? this.renderEmptyState() : filtered.map(item => this.renderProductCard(item)).join('')}
        </div>
      </div>

      <!-- MODAL DE CADASTRO/PRECIFICAÇÃO DO PRODUTO (TELA CHEIA RESPONSIVA) -->
      <div id="modal-product" class="fixed inset-0 z-50 hidden flex items-end sm:items-center justify-center p-0 sm:p-4 bg-sweet-900/60 backdrop-blur-sm">
        <div class="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-xl border border-sweet-200 flex flex-col page-fade-in overflow-hidden">
          
          <!-- Cabeçalho do Modal -->
          <div class="flex items-center justify-between pb-3 border-b border-sweet-100 flex-shrink-0">
            <h3 class="text-base font-bold flex items-center gap-1.5" id="product-modal-title">
              <i data-lucide="tag" class="w-5 h-5 text-sweet-500"></i> Precificar Produto
            </h3>
            <button id="close-product-modal" class="text-sweet-600 hover:text-sweet-900 p-1">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          
          <!-- Formulário (Rolável) -->
          <form id="form-product" class="flex-1 overflow-y-auto custom-scroll py-4 space-y-5 pr-1">
            <input type="hidden" id="product-id">
            
            <!-- Etapa 1: Nome do Produto -->
            <div class="space-y-3">
              <h4 class="text-xs font-bold text-sweet-500 uppercase tracking-wider">1. Informações Básicas</h4>
              <div>
                <label class="block text-xs font-semibold text-sweet-800 mb-1" for="product-name">Nome do Produto para Venda</label>
                <input type="text" id="product-name" required placeholder="Ex: Bolo Decorado Morango Aro 15"
                  class="w-full px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-sm font-medium">
              </div>
            </div>

            <!-- Etapa 2: Composição (Bases, Insumos e Embalagens) -->
            <div class="space-y-3">
              <h4 class="text-xs font-bold text-sweet-500 uppercase tracking-wider">2. Composição e Insumos</h4>
              
              <div class="p-3 bg-sweet-100/50 rounded-2xl border border-sweet-200 space-y-3">
                
                <!-- Adicionar Item Seletor -->
                <div class="grid grid-cols-12 gap-2">
                  <div class="col-span-4">
                    <select id="product-add-item-type"
                      class="w-full px-2.5 py-1.5 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-xs font-medium bg-white">
                      <option value="base">Sub-receita (Base)</option>
                      <option value="ingredient">Ingrediente Avulso</option>
                      <option value="package">Embalagem</option>
                    </select>
                  </div>
                  <div class="col-span-5">
                    <select id="product-add-item-id"
                      class="w-full px-2.5 py-1.5 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-xs font-medium bg-white">
                      <!-- Dinâmico conforme tipo -->
                    </select>
                  </div>
                  <div class="col-span-3 relative">
                    <input type="number" id="product-add-item-qty" step="0.01" min="0.01" placeholder="Qtd"
                      class="w-full pl-2 pr-7 py-1.5 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-xs font-medium">
                    <span class="absolute right-2 top-2 text-[10px] text-sweet-600" id="product-add-unit-badge"></span>
                  </div>
                </div>
                
                <button type="button" id="btn-product-add-item"
                  class="w-full bg-sweet-500 hover:bg-sweet-600 text-white py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                  <i data-lucide="plus-circle" class="w-4 h-4"></i> Adicionar Item na Receita
                </button>

                <!-- Lista de itens do produto -->
                <div class="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scroll" id="product-items-list-container">
                  <p class="text-[11px] text-sweet-600 italic text-center py-2">Nenhum item adicionado.</p>
                </div>

                <!-- Custo Direto Parcial (CPV) -->
                <div class="flex justify-between items-center text-xs font-bold text-sweet-800 border-t border-sweet-200/50 pt-2.5">
                  <span>Custo Direto de Insumos (CPV):</span>
                  <span id="product-cpv-preview" class="text-sweet-900">R$ 0,00</span>
                </div>
              </div>
            </div>

            <!-- Etapa 3: Custos Operacionais e Markup -->
            <div class="space-y-4">
              <h4 class="text-xs font-bold text-sweet-500 uppercase tracking-wider">3. Custos Adicionais e Margens</h4>
              
              <div class="grid grid-cols-2 gap-4">
                <!-- Custos Indiretos -->
                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="text-xs font-semibold text-sweet-800" for="product-indirect-percent">Gastos Gerais (%)</label>
                    <span class="text-[11px] font-bold text-sweet-600" id="lbl-indirect-percent">15%</span>
                  </div>
                  <input type="range" id="product-indirect-percent" min="0" max="50" step="1" value="15" class="w-full">
                  <p class="text-[9px] text-sweet-600">Gás, energia, água, depreciação.</p>
                </div>
                
                <!-- Tempo de Preparo -->
                <div>
                  <label class="block text-xs font-semibold text-sweet-800 mb-1" for="product-labor-time">Tempo de Preparo (min)</label>
                  <div class="relative">
                    <input type="number" id="product-labor-time" min="0" value="30"
                      class="w-full px-3 py-1.5 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-xs font-medium">
                    <span class="absolute right-3 top-2 text-[10px] text-sweet-600">min</span>
                  </div>
                  <p class="text-[9px] text-sweet-600">Valor da hora: R$ <span id="lbl-settings-hour-rate">0,00</span>/h</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <!-- Taxas e Comissões -->
                <div>
                  <label class="block text-xs font-semibold text-sweet-800 mb-1" for="product-tax-percent">Taxas / Venda (%)</label>
                  <div class="relative">
                    <input type="number" id="product-tax-percent" step="0.1" min="0" max="50" value="5"
                      class="w-full pr-7 pl-3 py-1.5 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-xs font-medium">
                    <span class="absolute right-3 top-2 text-[10px] text-sweet-600">%</span>
                  </div>
                  <p class="text-[9px] text-sweet-600">Maquininha, taxas de aplicativos.</p>
                </div>

                <!-- Margem de Lucro Desejada -->
                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="text-xs font-semibold text-sweet-800" for="product-profit-percent">Margem de Lucro (%)</label>
                    <span class="text-[11px] font-bold text-sweet-500" id="lbl-profit-percent">30%</span>
                  </div>
                  <input type="range" id="product-profit-percent" min="0" max="150" step="5" value="30" class="w-full">
                  <p class="text-[9px] text-sweet-600">Margem líquida sugerida.</p>
                </div>
              </div>
            </div>

            <!-- Etapa 4: Painel de Resultados e Gráfico em Tempo Real -->
            <div class="space-y-3">
              <h4 class="text-xs font-bold text-sweet-500 uppercase tracking-wider">4. Análise de Preço e Resultados</h4>
              
              <div class="grid grid-cols-2 gap-3">
                <!-- Custo total de fabricação -->
                <div class="p-3 bg-sweet-100 rounded-2xl border border-sweet-200/50 flex flex-col justify-between">
                  <span class="text-[10px] text-sweet-600 font-semibold uppercase">Custo de Produção</span>
                  <div>
                    <span class="text-base font-bold" id="res-total-cost">R$ 0,00</span>
                    <p class="text-[9px] text-sweet-600 leading-tight">Insumos + Gastos + Mão de Obra</p>
                  </div>
                </div>

                <!-- Preço Sugerido -->
                <div class="p-3 bg-pink-50 rounded-2xl border border-pink-100 flex flex-col justify-between">
                  <span class="text-[10px] text-sweet-600 font-semibold uppercase">Preço Sugerido</span>
                  <div>
                    <span class="text-lg font-black text-sweet-500" id="res-price-suggested">R$ 0,00</span>
                    <p class="text-[9px] text-sweet-600 leading-tight">Cobrirá custos e margens</p>
                  </div>
                </div>
              </div>

              <!-- Definir Preço Próprio de Venda -->
              <div class="p-3.5 bg-white rounded-2xl border border-sweet-200 shadow-sm space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-bold text-sweet-900" for="product-price-set">Preço Praticado de Venda (R$)</label>
                  <button type="button" id="btn-use-suggested" class="text-[10px] text-sweet-500 hover:text-sweet-600 font-bold flex items-center gap-0.5">
                    <i data-lucide="copy" class="w-3 h-3"></i> Usar sugerido
                  </button>
                </div>
                <div class="relative">
                  <span class="absolute left-3 top-2.5 text-sm text-sweet-600 font-medium">R$</span>
                  <input type="number" id="product-price-set" step="0.01" min="0" placeholder="Digite o preço final que vai cobrar"
                    class="w-full pl-9 pr-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-sm font-bold">
                </div>
                
                <!-- Resultados Dinâmicos com Preço Praticado -->
                <div class="grid grid-cols-3 gap-2 pt-2 border-t border-sweet-100 text-center">
                  <div class="p-1">
                    <span class="block text-[9px] text-sweet-600 font-medium">Preço Mínimo</span>
                    <span class="text-xs font-bold text-amber-600" id="res-breakeven">R$ 0,00</span>
                  </div>
                  <div class="p-1">
                    <span class="block text-[9px] text-sweet-600 font-medium">Lucro Líquido</span>
                    <span class="text-xs font-bold text-emerald-600" id="res-profit-value">R$ 0,00</span>
                  </div>
                  <div class="p-1">
                    <span class="block text-[9px] text-sweet-600 font-medium">Margem Real</span>
                    <span class="text-xs font-bold text-emerald-600" id="res-profit-percent">0%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Ficha Técnica Simples -->
            <div id="tech-card-print-area" class="hidden print:block p-8 bg-white text-sweet-900 space-y-4">
              <!-- Renderizado apenas para o fluxo de impressão/PDF -->
            </div>
            
          </form>

          <!-- Rodapé do Modal -->
          <div class="pt-4 border-t border-sweet-100 flex gap-2 flex-shrink-0">
            <button type="button" id="btn-delete-product-modal" class="hidden bg-rose-50 text-rose-600 border border-rose-200 px-4 py-2.5 rounded-xl font-bold hover:bg-rose-100 transition-colors text-xs flex items-center justify-center gap-1.5">
              <i data-lucide="trash-2" class="w-4 h-4"></i> Excluir
            </button>
            <button type="button" id="btn-export-pdf" class="bg-sweet-100 hover:bg-sweet-200 text-sweet-800 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5">
              <i data-lucide="printer" class="w-4 h-4"></i> Ficha Técnica
            </button>
            <button type="button" id="btn-save-product" class="flex-1 bg-sweet-500 hover:bg-sweet-600 text-white py-2.5 rounded-xl font-bold transition-colors shadow-sm text-xs flex items-center justify-center gap-1.5">
              <i data-lucide="check" class="w-4 h-4"></i> Salvar Produto
            </button>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons();
    this.registerEvents();
  },

  /**
   * Estado vazio
   */
  renderEmptyState() {
    return `
      <div class="flex flex-col items-center justify-center py-12 px-4 bg-white border border-dashed border-sweet-300 rounded-2xl text-center">
        <div class="w-12 h-12 bg-sweet-100 rounded-full flex items-center justify-center text-sweet-500 mb-3">
          <i data-lucide="tag" class="w-6 h-6"></i>
        </div>
        <h4 class="text-sm font-bold text-sweet-900">Nenhum produto precificado</h4>
        <p class="text-xs text-sweet-600 mt-1 max-w-xs">
          ${searchFilter ? 'Modifique os termos de busca.' : 'Monte e precifique produtos prontos para a venda agregando insumos, embalagens, despesas fixas e lucro.'}
        </p>
      </div>
    `;
  },

  /**
   * Cartão do Produto
   */
  renderProductCard(item) {
    const finalPrice = item.finalPriceSet || item.finalPriceSuggested;
    const formattedPrice = window.app.formatCurrency(finalPrice);
    const formattedCost = window.app.formatCurrency(item.totalCost);
    const formattedProfit = window.app.formatCurrency(item.profitValue);
    
    let profitBadgeColor = 'bg-emerald-50 text-emerald-700';
    if (item.profitPercent < 15) {
      profitBadgeColor = 'bg-amber-50 text-amber-700';
    }
    if (item.profitValue <= 0) {
      profitBadgeColor = 'bg-rose-50 text-rose-700';
    }

    return `
      <div class="bg-white p-3.5 rounded-2xl border border-sweet-200/50 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]"
        onclick="window.appActions.editProduct('${item.id}')">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-bold text-sweet-900 leading-tight">${item.name}</h4>
            <span class="px-2 py-0.5 rounded-full text-[9px] font-semibold ${profitBadgeColor}">
              Margem: ${item.profitPercent.toFixed(0)}%
            </span>
          </div>
          <p class="text-[11px] text-sweet-600">
            Custo: <span class="font-semibold text-sweet-900">${formattedCost}</span> &bull; Lucro Líquido: <span class="font-bold text-emerald-600">${formattedProfit}</span>
          </p>
        </div>
        <div class="text-right">
          <p class="text-[10px] text-sweet-600 font-medium">Preço Venda</p>
          <p class="text-sm font-extrabold text-sweet-500">${formattedPrice}</p>
        </div>
      </div>
    `;
  },

  /**
   * Recarrega seletores no formulário dependendo do tipo selecionado
   */
  updateItemSelector() {
    const typeSelect = document.getElementById('product-add-item-type');
    const itemSelect = document.getElementById('product-add-item-id');
    const unitBadge = document.getElementById('product-add-unit-badge');

    if (!typeSelect || !itemSelect || !unitBadge) return;

    const type = typeSelect.value;
    itemSelect.innerHTML = '';
    unitBadge.textContent = '';

    if (type === 'base') {
      basesList.forEach(b => {
        const option = document.createElement('option');
        option.value = b.id;
        option.textContent = `${b.name} (${window.app.formatCurrency(b.costPerUnit)}/${b.yieldUnit})`;
        itemSelect.appendChild(option);
      });
    } else if (type === 'ingredient') {
      ingredientsList.filter(i => i.category !== 'Embalagens').forEach(i => {
        const option = document.createElement('option');
        option.value = i.id;
        let useUnit = i.unit === 'kg' ? 'g' : i.unit === 'L' ? 'ml' : i.unit;
        option.textContent = `${i.name} (${window.app.formatCurrency(i.pricePerUnit)}/${useUnit})`;
        itemSelect.appendChild(option);
      });
    } else if (type === 'package') {
      ingredientsList.filter(i => i.category === 'Embalagens').forEach(i => {
        const option = document.createElement('option');
        option.value = i.id;
        let useUnit = i.unit === 'kg' ? 'g' : i.unit === 'L' ? 'ml' : i.unit;
        option.textContent = `${i.name} (${window.app.formatCurrency(i.pricePerUnit)}/${useUnit})`;
        itemSelect.appendChild(option);
      });
    }

    const updateUnitLabel = () => {
      const selectedId = itemSelect.value;
      if (type === 'base') {
        const base = basesList.find(b => b.id === selectedId);
        unitBadge.textContent = base ? base.yieldUnit : '';
      } else {
        const ing = ingredientsList.find(i => i.id === selectedId);
        if (ing) {
          unitBadge.textContent = ing.unit === 'kg' ? 'g' : ing.unit === 'L' ? 'ml' : ing.unit;
        } else {
          unitBadge.textContent = '';
        }
      }
    };

    itemSelect.addEventListener('change', updateUnitLabel);
    updateUnitLabel();
  },

  /**
   * Registra eventos
   */
  registerEvents() {
    // Busca
    const searchInput = document.getElementById('search-products');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchFilter = e.target.value;
        this.render();
        const newSearchInput = document.getElementById('search-products');
        newSearchInput.focus();
        newSearchInput.setSelectionRange(newSearchInput.value.length, newSearchInput.value.length);
      });
    }

    // Modal
    const btnAdd = document.getElementById('btn-add-product');
    if (btnAdd) btnAdd.addEventListener('click', () => this.openModal());

    const btnClose = document.getElementById('close-product-modal');
    if (btnClose) btnClose.addEventListener('click', () => this.closeModal());

    // Seletor de tipo de item
    const typeSelect = document.getElementById('product-add-item-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', () => this.updateItemSelector());
    }

    // Adicionar item à receita
    const btnAddItem = document.getElementById('btn-product-add-item');
    if (btnAddItem) {
      btnAddItem.addEventListener('click', () => {
        const type = document.getElementById('product-add-item-type').value;
        const itemId = document.getElementById('product-add-item-id').value;
        const qtyInput = document.getElementById('product-add-item-qty');
        const qty = parseFloat(qtyInput.value) || 0;

        if (!itemId) {
          window.app.showToast('Selecione um item!', 'warning');
          return;
        }
        if (qty <= 0) {
          window.app.showToast('Informe uma quantidade válida!', 'warning');
          return;
        }

        // Buscar detalhes do item
        let name = '';
        let costPerUnit = 0;
        let unit = '';

        if (type === 'base') {
          const base = basesList.find(b => b.id === itemId);
          if (base) {
            name = base.name;
            costPerUnit = base.costPerUnit;
            unit = base.yieldUnit;
          }
        } else {
          const ing = ingredientsList.find(i => i.id === itemId);
          if (ing) {
            name = ing.name;
            costPerUnit = ing.pricePerUnit;
            unit = ing.unit === 'kg' ? 'g' : ing.unit === 'L' ? 'ml' : ing.unit;
          }
        }

        const existing = currentProductItems.find(item => item.itemId === itemId && item.type === type);
        if (existing) {
          existing.quantity += qty;
        } else {
          currentProductItems.push({
            type,
            itemId,
            name,
            costPerUnit,
            unit,
            quantity: qty
          });
        }

        qtyInput.value = '';
        this.updateProductItemsUI();
        this.recalculatePricing();
      });
    }

    // Controles deslizantes (Sliders)
    const rangeIndirect = document.getElementById('product-indirect-percent');
    const lblIndirect = document.getElementById('lbl-indirect-percent');
    if (rangeIndirect && lblIndirect) {
      rangeIndirect.addEventListener('input', (e) => {
        lblIndirect.textContent = `${e.target.value}%`;
        this.recalculatePricing();
      });
    }

    const rangeProfit = document.getElementById('product-profit-percent');
    const lblProfit = document.getElementById('lbl-profit-percent');
    if (rangeProfit && lblProfit) {
      rangeProfit.addEventListener('input', (e) => {
        lblProfit.textContent = `${e.target.value}%`;
        this.recalculatePricing();
      });
    }

    // Inputs adicionais
    const inputLaborTime = document.getElementById('product-labor-time');
    const inputTax = document.getElementById('product-tax-percent');
    const inputPriceSet = document.getElementById('product-price-set');

    if (inputLaborTime) inputLaborTime.addEventListener('input', () => this.recalculatePricing());
    if (inputTax) inputTax.addEventListener('input', () => this.recalculatePricing());
    if (inputPriceSet) inputPriceSet.addEventListener('input', () => this.recalculatePricing(true));

    // Botão de Usar Preço Sugerido
    const btnUseSuggested = document.getElementById('btn-use-suggested');
    if (btnUseSuggested) {
      btnUseSuggested.addEventListener('click', () => {
        const suggested = parseFloat(document.getElementById('res-price-suggested').textContent.replace('R$', '').replace('.', '').replace(',', '.')) || 0;
        if (suggested > 0) {
          inputPriceSet.value = suggested.toFixed(2);
          this.recalculatePricing(true);
        }
      });
    }

    // Botão Excluir
    const btnDelete = document.getElementById('btn-delete-product-modal');
    if (btnDelete) {
      btnDelete.addEventListener('click', async () => {
        const id = document.getElementById('product-id').value;
        if (id && confirm('Deseja realmente excluir este produto?')) {
          await this.deleteProduct(id);
        }
      });
    }

    // Salvar Produto
    const btnSave = document.getElementById('btn-save-product');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        await this.saveProduct();
      });
    }

    // Exportar PDF
    const btnExport = document.getElementById('btn-export-pdf');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        this.exportTechCard();
      });
    }

    // Ações globais
    window.appActions = window.appActions || {};
    window.appActions.editProduct = (id) => this.openModal(id);
    window.appActions.removeProductItem = (itemId, type) => {
      currentProductItems = currentProductItems.filter(item => !(item.itemId === itemId && item.type === type));
      this.updateProductItemsUI();
      this.recalculatePricing();
    };
  },

  /**
   * Abre o modal
   */
  async openModal(id = null) {
    const modal = document.getElementById('modal-product');
    const form = document.getElementById('form-product');
    const title = document.getElementById('product-modal-title');
    const btnDelete = document.getElementById('btn-delete-product-modal');
    const lblHourRate = document.getElementById('lbl-settings-hour-rate');

    await this.loadData();
    form.reset();
    document.getElementById('product-id').value = '';
    currentProductItems = [];

    lblHourRate.textContent = window.app.formatCurrency(globalSettings.workHourRate).replace('R$', '');

    // Inicializar sliders com os padrões
    document.getElementById('product-indirect-percent').value = globalSettings.indirectCostDefault;
    document.getElementById('lbl-indirect-percent').textContent = `${globalSettings.indirectCostDefault}%`;
    
    document.getElementById('product-tax-percent').value = globalSettings.taxDefault;
    document.getElementById('product-profit-percent').value = 40;
    document.getElementById('lbl-profit-percent').textContent = `40%`;

    this.updateItemSelector();
    this.updateProductItemsUI();
    this.recalculatePricing();

    if (id) {
      const item = productsList.find(p => p.id === id);
      if (item) {
        title.innerHTML = `<i data-lucide="edit" class="w-5 h-5 text-sweet-500"></i> Editar Produto`;
        document.getElementById('product-id').value = item.id;
        document.getElementById('product-name').value = item.name;
        
        const ingredientsMap = new Map(ingredientsList.map(ing => [ing.id, ing]));
        const basesMap = new Map(basesList.map(base => [base.id, base]));

        currentProductItems = item.items.map(pItem => {
          let name = 'Excluído';
          let costPerUnit = 0;
          let unit = '';
          
          if (pItem.type === 'base') {
            const base = basesMap.get(pItem.itemId);
            if (base) {
              name = base.name;
              costPerUnit = base.costPerUnit;
              unit = base.yieldUnit;
            }
          } else {
            const ing = ingredientsMap.get(pItem.itemId);
            if (ing) {
              name = ing.name;
              costPerUnit = ing.pricePerUnit;
              unit = ing.unit === 'kg' ? 'g' : ing.unit === 'L' ? 'ml' : ing.unit;
            }
          }

          return {
            type: pItem.type,
            itemId: pItem.itemId,
            name,
            costPerUnit,
            unit,
            quantity: pItem.quantity
          };
        });

        document.getElementById('product-indirect-percent').value = item.indirectCostPercent;
        document.getElementById('lbl-indirect-percent').textContent = `${item.indirectCostPercent}%`;
        document.getElementById('product-labor-time').value = item.laborTimeMinutes;
        document.getElementById('product-tax-percent').value = item.taxPercent;
        document.getElementById('product-profit-percent').value = item.profitMarginPercent;
        document.getElementById('lbl-profit-percent').textContent = `${item.profitMarginPercent}%`;

        if (item.finalPriceSet) {
          document.getElementById('product-price-set').value = item.finalPriceSet.toFixed(2);
        }

        btnDelete.classList.remove('hidden');
        this.updateProductItemsUI();
        this.recalculatePricing();
        
        if (item.finalPriceSet) {
          this.recalculatePricing(true);
        }
      }
    } else {
      title.innerHTML = `<i data-lucide="tag" class="w-5 h-5 text-sweet-500"></i> Precificar Produto`;
      btnDelete.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    lucide.createIcons();
  },

  /**
   * Fecha o modal
   */
  closeModal() {
    document.getElementById('modal-product').classList.add('hidden');
  },

  /**
   * Atualiza a lista de itens inseridos
   */
  updateProductItemsUI() {
    const listContainer = document.getElementById('product-items-list-container');
    if (!listContainer) return;

    if (currentProductItems.length === 0) {
      listContainer.innerHTML = `<p class="text-[11px] text-sweet-600 italic text-center py-3">Nenhum item adicionado.</p>`;
      return;
    }

    listContainer.innerHTML = currentProductItems.map(item => {
      const cost = item.quantity * item.costPerUnit;
      
      let typeBadge = '';
      if (item.type === 'base') typeBadge = '<span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-pink-50 text-sweet-500 mr-1.5">Base</span>';
      else if (item.type === 'package') typeBadge = '<span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-50 text-purple-600 mr-1.5">Emb</span>';
      else typeBadge = '<span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-50 text-blue-600 mr-1.5">Insumo</span>';

      return `
        <div class="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-sweet-200/50 text-[11px] font-medium">
          <div class="flex-1 min-w-0 pr-2">
            <span class="block text-sweet-900 truncate font-semibold">${typeBadge}${item.name}</span>
            <span class="text-sweet-600">${item.quantity}${item.unit} &times; ${window.app.formatCurrency(item.costPerUnit)}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-sweet-900">${window.app.formatCurrency(cost)}</span>
            <button type="button" onclick="window.appActions.removeProductItem('${item.itemId}', '${item.type}')"
              class="w-5 h-5 text-rose-500 hover:bg-rose-50 rounded-full flex items-center justify-center transition-colors">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    lucide.createIcons();
  },

  /**
   * Recalcula a precificação em tempo real
   */
  recalculatePricing(priceSetUpdated = false) {
    const cpvPreview = document.getElementById('product-cpv-preview');
    
    const indirectPercentInput = document.getElementById('product-indirect-percent');
    const laborTimeInput = document.getElementById('product-labor-time');
    const taxPercentInput = document.getElementById('product-tax-percent');
    const profitPercentInput = document.getElementById('product-profit-percent');
    
    const resTotalCost = document.getElementById('res-total-cost');
    const resPriceSuggested = document.getElementById('res-price-suggested');
    const inputPriceSet = document.getElementById('product-price-set');
    const resBreakeven = document.getElementById('res-breakeven');
    const resProfitVal = document.getElementById('res-profit-value');
    const resProfitPct = document.getElementById('res-profit-percent');

    if (!cpvPreview || !resTotalCost || !resPriceSuggested) return;

    let cpv = 0;
    currentProductItems.forEach(item => {
      cpv += item.quantity * item.costPerUnit;
    });
    cpvPreview.textContent = window.app.formatCurrency(cpv);

    const indirectPct = parseFloat(indirectPercentInput.value) || 0;
    const laborTime = parseFloat(laborTimeInput.value) || 0;
    const taxPct = parseFloat(taxPercentInput.value) || 0;
    const profitPct = parseFloat(profitPercentInput.value) || 0;

    const indirectCost = cpv * (indirectPct / 100);
    const laborCost = (laborTime / 60) * globalSettings.workHourRate;
    
    const totalCost = cpv + indirectCost + laborCost;
    resTotalCost.textContent = window.app.formatCurrency(totalCost);

    const taxFactor = taxPct / 100;
    const profitFactor = profitPct / 100;
    const divisor = 1 - taxFactor - profitFactor;
    
    let priceSuggested = 0;
    if (divisor > 0) {
      priceSuggested = totalCost / divisor;
      resPriceSuggested.textContent = window.app.formatCurrency(priceSuggested);
      resPriceSuggested.classList.remove('text-rose-500');
    } else {
      resPriceSuggested.textContent = 'Indefinido';
      resPriceSuggested.classList.add('text-rose-500');
      priceSuggested = totalCost;
    }

    const breakevenDivisor = 1 - taxFactor;
    let breakevenPrice = 0;
    if (breakevenDivisor > 0) {
      breakevenPrice = totalCost / breakevenDivisor;
      resBreakeven.textContent = window.app.formatCurrency(breakevenPrice);
    } else {
      resBreakeven.textContent = window.app.formatCurrency(totalCost);
    }

    let priceSet = parseFloat(inputPriceSet.value) || 0;
    const priceToEvaluate = priceSet > 0 ? priceSet : priceSuggested;
    
    const taxesPaid = priceToEvaluate * taxFactor;
    const profitValue = priceToEvaluate - totalCost - taxesPaid;
    const profitPercent = priceToEvaluate > 0 ? (profitValue / priceToEvaluate) * 100 : 0;

    resProfitVal.textContent = window.app.formatCurrency(profitValue);
    resProfitPct.textContent = `${profitPercent.toFixed(1)}%`;

    if (profitValue < 0) {
      resProfitVal.className = 'text-xs font-bold text-rose-600';
      resProfitPct.className = 'text-xs font-bold text-rose-600';
    } else if (profitValue === 0) {
      resProfitVal.className = 'text-xs font-bold text-sweet-800';
      resProfitPct.className = 'text-xs font-bold text-sweet-800';
    } else {
      resProfitVal.className = 'text-xs font-bold text-emerald-600';
      resProfitPct.className = 'text-xs font-bold text-emerald-600';
    }
  },

  /**
   * Salva o produto
   */
  async saveProduct() {
    const id = document.getElementById('product-id').value || crypto.randomUUID();
    const name = document.getElementById('product-name').value;
    
    if (!name) {
      window.app.showToast('Informe o nome do produto!', 'warning');
      return;
    }
    if (currentProductItems.length === 0) {
      window.app.showToast('Adicione pelo menos 1 item na receita!', 'warning');
      return;
    }

    let cpv = 0;
    currentProductItems.forEach(item => {
      cpv += item.quantity * item.costPerUnit;
    });

    const indirectCostPercent = parseFloat(document.getElementById('product-indirect-percent').value) || 0;
    const laborTimeMinutes = parseFloat(document.getElementById('product-labor-time').value) || 0;
    const taxPercent = parseFloat(document.getElementById('product-tax-percent').value) || 0;
    const profitMarginPercent = parseFloat(document.getElementById('product-profit-percent').value) || 0;
    
    const laborCostCalculated = (laborTimeMinutes / 60) * globalSettings.workHourRate;
    const indirectCost = cpv * (indirectCostPercent / 100);
    const totalCost = cpv + indirectCost + laborCostCalculated;

    const divisor = 1 - (taxPercent / 100) - (profitMarginPercent / 100);
    const finalPriceSuggested = divisor > 0 ? totalCost / divisor : totalCost;

    const finalPriceSetInput = parseFloat(document.getElementById('product-price-set').value);
    const finalPriceSet = !isNaN(finalPriceSetInput) && finalPriceSetInput > 0 ? finalPriceSetInput : null;
    
    const actualPrice = finalPriceSet || finalPriceSuggested;
    const taxesPaid = actualPrice * (taxPercent / 100);
    const profitValue = actualPrice - totalCost - taxesPaid;
    const profitPercent = actualPrice > 0 ? (profitValue / actualPrice) * 100 : 0;
    
    const breakevenDivisor = 1 - (taxPercent / 100);
    const breakevenPrice = breakevenDivisor > 0 ? totalCost / breakevenDivisor : totalCost;

    const data = {
      id,
      name,
      items: currentProductItems.map(item => ({
        type: item.type,
        itemId: item.itemId,
        quantity: item.quantity
      })),
      indirectCostPercent,
      laborTimeMinutes,
      laborCostCalculated,
      markupPercent: profitMarginPercent,
      profitMarginPercent,
      taxPercent,
      finalPriceSuggested,
      cpv,
      totalCost,
      finalPriceSet,
      profitValue,
      profitPercent,
      breakevenPrice,
      updatedAt: new Date().toISOString()
    };

    try {
      await window.db.put('products', data);
      window.app.showToast(id ? 'Produto atualizado!' : 'Produto precificado e salvo!', 'success');
      
      await this.loadData();
      this.closeModal();
      this.render();
    } catch (err) {
      console.error(err);
      window.app.showToast('Erro ao salvar produto.', 'error');
    }
  },

  /**
   * Exclui um produto
   */
  async deleteProduct(id) {
    try {
      await window.db.delete('products', id);
      window.app.showToast('Produto excluído!', 'success');
      await this.loadData();
      this.closeModal();
      this.render();
    } catch (err) {
      console.error(err);
      window.app.showToast('Erro ao excluir produto.', 'error');
    }
  },

  /**
   * Exporta Ficha Técnica
   */
  exportTechCard() {
    const name = document.getElementById('product-name').value || 'Sem Nome';
    const itemsList = currentProductItems;
    
    if (itemsList.length === 0) {
      window.app.showToast('Impossível imprimir ficha técnica sem itens!', 'warning');
      return;
    }

    let cpv = 0;
    itemsList.forEach(item => cpv += item.quantity * item.costPerUnit);

    const indirectPct = parseFloat(document.getElementById('product-indirect-percent').value) || 0;
    const laborTime = parseFloat(document.getElementById('product-labor-time').value) || 0;
    const taxPct = parseFloat(document.getElementById('product-tax-percent').value) || 0;
    
    const indirectCost = cpv * (indirectPct / 100);
    const laborCost = (laborTime / 60) * globalSettings.workHourRate;
    const totalCost = cpv + indirectCost + laborCost;

    const priceSet = parseFloat(document.getElementById('product-price-set').value) || 0;
    const suggested = parseFloat(document.getElementById('res-price-suggested').textContent.replace('R$', '').replace('.', '').replace(',', '.')) || 0;
    const priceToUse = priceSet > 0 ? priceSet : suggested;
    const taxesPaid = priceToUse * (taxPct / 100);
    const profitValue = priceToUse - totalCost - taxesPaid;
    const profitPercent = priceToUse > 0 ? (profitValue / priceToUse) * 100 : 0;

    const printArea = document.getElementById('tech-card-print-area');
    printArea.innerHTML = `
      <div class="border-4 border-double border-sweet-800 p-6 space-y-6">
        <div class="text-center pb-4 border-b border-sweet-800">
          <h2 class="text-2xl font-black uppercase text-sweet-800 tracking-wider">Ficha Técnica & Precificação</h2>
          <p class="text-sm font-semibold italic text-sweet-600">Sistema Confeitaria Inteligente</p>
        </div>

        <div class="grid grid-cols-2 gap-4 text-xs font-semibold">
          <div>
            <span class="block text-sweet-600 uppercase text-[10px]">Produto:</span>
            <span class="text-base font-bold text-sweet-900">${name}</span>
          </div>
          <div class="text-right">
            <span class="block text-sweet-600 uppercase text-[10px]">Data de Emissão:</span>
            <span class="text-sm">${new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        <div>
          <span class="block text-[10px] font-bold uppercase text-sweet-600 mb-2">Ingredientes & Estrutura</span>
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b-2 border-sweet-800 text-[10px] uppercase text-sweet-600">
                <th class="py-1">Item / Receita</th>
                <th class="py-1 text-center">Quantidade</th>
                <th class="py-1 text-right">Custo Unitário</th>
                <th class="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList.map(item => `
                <tr class="border-b border-sweet-100">
                  <td class="py-2 font-medium">${item.name}</td>
                  <td class="py-2 text-center">${item.quantity}${item.unit}</td>
                  <td class="py-2 text-right">${window.app.formatCurrency(item.costPerUnit)}</td>
                  <td class="py-2 text-right font-bold">${window.app.formatCurrency(item.quantity * item.costPerUnit)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="grid grid-cols-2 gap-4 border-t-2 border-sweet-800 pt-4 text-xs">
          <div class="space-y-1.5">
            <span class="block text-[10px] font-bold uppercase text-sweet-600 mb-1">Composição de Custos</span>
            <div class="flex justify-between">
              <span>Custo de Matéria-Prima:</span>
              <span class="font-semibold">${window.app.formatCurrency(cpv)}</span>
            </div>
            <div class="flex justify-between">
              <span>Gastos Indiretos (${indirectPct}%):</span>
              <span class="font-semibold">${window.app.formatCurrency(indirectCost)}</span>
            </div>
            <div class="flex justify-between">
              <span>Mão de Obra (${laborTime} min):</span>
              <span class="font-semibold">${window.app.formatCurrency(laborCost)}</span>
            </div>
            <div class="flex justify-between border-t border-dashed border-sweet-300 pt-1 font-bold">
              <span>CUSTO TOTAL DE PRODUÇÃO:</span>
              <span>${window.app.formatCurrency(totalCost)}</span>
            </div>
          </div>

          <div class="space-y-1.5 bg-sweet-100/30 p-3 rounded-lg border border-sweet-200">
            <span class="block text-[10px] font-bold uppercase text-sweet-600 mb-1">Resultados e Precificação</span>
            <div class="flex justify-between">
              <span>Preço Sugerido:</span>
              <span class="font-semibold text-sweet-600">${window.app.formatCurrency(suggested)}</span>
            </div>
            <div class="flex justify-between">
              <span>Preço Cobrado:</span>
              <span class="font-bold text-sweet-900 text-sm">${window.app.formatCurrency(priceToUse)}</span>
            </div>
            <div class="flex justify-between">
              <span>Taxas de Venda (${taxPct}%):</span>
              <span class="font-semibold text-rose-600">${window.app.formatCurrency(taxesPaid)}</span>
            </div>
            <div class="flex justify-between border-t border-dashed border-sweet-300 pt-1 font-bold text-emerald-700">
              <span>LUCRO LÍQUIDO REAL:</span>
              <span>${window.app.formatCurrency(profitValue)} (${profitPercent.toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        <div class="text-[9px] text-sweet-600 italic text-center pt-4 border-t border-sweet-100">
          Gerado automaticamente por Precificação &bull; Guarde sua ficha para fins de controle de estoque e qualidade.
        </div>
      </div>
    `;

    window.print();
  }
};
