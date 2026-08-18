/**
 * bases.js - Módulo de Cadastro de Bases (Sub-receitas pré-salvas)
 */

(() => {
  let basesList = [];
  let ingredientsList = [];
  let searchFilter = '';

  // Variável para acumular itens na criação/edição da base corrente
  let currentBaseIngredients = [];

  window.bases = {
    /**
     * Inicializa o módulo de bases
     */
    async init() {
      await this.loadData();
    },

    /**
     * Carrega dados do IndexedDB
     */
    async loadData() {
      basesList = await window.db.getAll('bases');
      ingredientsList = await window.db.getAll('ingredients');
      basesList.sort((a, b) => a.name.localeCompare(b.name));
    },

    /**
     * Renderiza a página de bases
     */
    render() {
      const mainContent = document.getElementById('main-content');
      
      const filtered = basesList.filter(item => 
        item.name.toLowerCase().includes(searchFilter.toLowerCase())
      );

      mainContent.innerHTML = `
        <div class="page-fade-in space-y-4">
          <!-- Título e Ações -->
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold tracking-tight">Bases e Sub-receitas</h2>
              <p class="text-xs text-sweet-600">Prepare sub-itens para reutilizar em produtos</p>
            </div>
            <button id="btn-add-base" class="bg-sweet-500 hover:bg-sweet-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
              <i data-lucide="plus" class="w-4 h-4"></i> Nova Base
            </button>
          </div>

          <!-- Barra de Busca -->
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-sweet-600">
              <i data-lucide="search" class="w-4 h-4"></i>
            </span>
            <input type="search" id="search-bases" placeholder="Buscar por sub-receitas..." value="${searchFilter}"
              class="w-full pl-9 pr-4 py-2 bg-white border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-sm font-medium">
          </div>

          <!-- Lista de Bases -->
          <div class="space-y-2.5" id="bases-container">
            ${filtered.length === 0 ? this.renderEmptyState() : filtered.map(item => this.renderBaseCard(item)).join('')}
          </div>
        </div>

        <!-- MODAL DE CADASTRO/EDIÇÃO DE BASE -->
        <div id="modal-base" class="fixed inset-0 z-50 hidden flex items-end sm:items-center justify-center p-4 bg-sweet-900/60 backdrop-blur-sm">
          <div class="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-xl border border-sweet-200 page-fade-in max-h-[92vh] overflow-y-auto custom-scroll">
            <div class="flex items-center justify-between pb-3 border-b border-sweet-100">
              <h3 class="text-base font-bold flex items-center gap-1.5" id="base-modal-title">
                <i data-lucide="egg" class="w-5 h-5 text-sweet-500"></i> Criar Base / Sub-receita
              </h3>
              <button id="close-base-modal" class="text-sweet-600 hover:text-sweet-900">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
            
            <form id="form-base" class="space-y-4 pt-4">
              <input type="hidden" id="base-id">
              
              <!-- Nome da Base -->
              <div>
                <label class="block text-xs font-semibold text-sweet-800 mb-1" for="base-name">Nome da Sub-receita</label>
                <input type="text" id="base-name" required placeholder="Ex: Brigadeiro Tradicional, Massa Pão de Ló"
                  class="w-full px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-sm font-medium">
              </div>

              <!-- Adicionar Ingrediente à Lista -->
              <div class="p-3 bg-sweet-100/50 rounded-2xl border border-sweet-200">
                <span class="block text-xs font-bold text-sweet-900 mb-2">Ingredientes da Sub-receita</span>
                
                <div class="grid grid-cols-12 gap-2 mb-2.5">
                  <div class="col-span-6">
                    <select id="base-add-ingredient-id"
                      class="w-full px-2.5 py-1.5 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-xs font-medium bg-white">
                      <option value="">Selecione...</option>
                      ${ingredientsList.map(i => `<option value="${i.id}">${i.name} (${window.app.formatCurrency(i.pricePerUnit)}/${i.unit === 'kg' || i.unit === 'g' ? 'g' : i.unit === 'L' || i.unit === 'ml' ? 'ml' : 'un'})</option>`).join('')}
                    </select>
                  </div>
                  <div class="col-span-4 relative">
                    <input type="number" id="base-add-ingredient-qty" step="0.01" min="0.01" placeholder="Qtd"
                      class="w-full px-2.5 py-1.5 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-xs font-medium">
                    <span class="absolute right-2 top-2 text-[10px] text-sweet-600" id="base-add-unit-badge"></span>
                  </div>
                  <div class="col-span-2">
                    <button type="button" id="btn-base-add-ingredient-item" class="w-full h-full bg-sweet-500 hover:bg-sweet-600 text-white rounded-xl flex items-center justify-center transition-colors">
                      <i data-lucide="plus" class="w-4 h-4"></i>
                    </button>
                  </div>
                </div>

                <!-- Lista Acumulada de Ingredientes -->
                <div class="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scroll" id="base-ingredients-list-container">
                  <p class="text-[11px] text-sweet-600 italic text-center py-2">Nenhum ingrediente adicionado ainda.</p>
                </div>
              </div>

              <!-- Rendimento e Unidade de Rendimento -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-sweet-800 mb-1" for="base-yieldAmount">Rendimento Total</label>
                  <input type="number" id="base-yieldAmount" step="0.01" min="0.01" required placeholder="Ex: 800 ou 1"
                    class="w-full px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-sm font-medium">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-sweet-800 mb-1" for="base-yieldUnit">Unidade de Rendimento</label>
                  <select id="base-yieldUnit" required
                    class="w-full px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-sm font-medium bg-white">
                    <option value="g">Grama (g)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="un">Unidade (un)</option>
                    <option value="porções">Porções</option>
                    <option value="docinhos">Docinhos</option>
                  </select>
                </div>
              </div>

              <!-- Previews Rápidos de Custo -->
              <div class="grid grid-cols-2 gap-2">
                <div class="p-3 bg-sweet-100/50 rounded-xl border border-sweet-200/30 text-xs">
                  <span class="block text-sweet-600 font-medium">Custo Total:</span>
                  <span class="font-bold text-sweet-900" id="base-total-cost-preview">R$ 0,00</span>
                </div>
                <div class="p-3 bg-sweet-100/50 rounded-xl border border-sweet-200/30 text-xs">
                  <span class="block text-sweet-600 font-medium">Custo Unitário:</span>
                  <span class="font-bold text-sweet-500" id="base-unit-cost-preview">R$ 0,00</span>
                </div>
              </div>

              <div class="pt-2 flex gap-2">
                <button type="button" id="btn-delete-base-modal" class="hidden flex-1 bg-rose-50 text-rose-600 border border-rose-200 py-2.5 rounded-xl font-bold hover:bg-rose-100 transition-colors text-xs flex items-center justify-center gap-1.5">
                  <i data-lucide="trash-2" class="w-4 h-4"></i> Excluir
                </button>
                <button type="submit" class="flex-[2] bg-sweet-500 text-white py-2.5 rounded-xl font-bold hover:bg-sweet-600 transition-colors shadow-sm text-xs flex items-center justify-center gap-1.5">
                  <i data-lucide="check" class="w-4 h-4"></i> Salvar Base
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      lucide.createIcons();
      this.registerEvents();
    },

    /**
     * Renderiza estado vazio
     */
    renderEmptyState() {
      return `
        <div class="flex flex-col items-center justify-center py-12 px-4 bg-white border border-dashed border-sweet-300 rounded-2xl text-center">
          <div class="w-12 h-12 bg-sweet-100 rounded-full flex items-center justify-center text-sweet-500 mb-3">
            <i data-lucide="package" class="w-6 h-6"></i>
          </div>
          <h4 class="text-sm font-bold text-sweet-900">Nenhuma base/receita salva</h4>
          <p class="text-xs text-sweet-600 mt-1 max-w-xs">
            ${searchFilter ? 'Ajuste seu termo de pesquisa.' : 'Crie sub-receitas estruturadas (como brigadeiro, calda ou pão de ló) para reaproveitar depois.'}
          </p>
        </div>
      `;
    },

    /**
     * Renderiza cartão de base
     */
    renderBaseCard(item) {
      const formattedTotalCost = window.app.formatCurrency(item.totalCost);
      const formattedCostPerUnit = window.app.formatCurrency(item.costPerUnit);
      
      return `
        <div class="bg-white p-3.5 rounded-2xl border border-sweet-200/50 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]"
          onclick="window.appActions.editBase('${item.id}')">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-bold text-sweet-900 leading-tight">${item.name}</h4>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-pink-50 text-sweet-600">
                ${item.ingredients.length} ${item.ingredients.length === 1 ? 'insumo' : 'insumos'}
              </span>
            </div>
            <p class="text-[11px] text-sweet-600">
              Rendimento: <span class="font-semibold text-sweet-900">${item.yieldAmount}${item.yieldUnit}</span> (Custo Total: ${formattedTotalCost})
            </p>
          </div>
          <div class="text-right">
            <p class="text-[10px] text-sweet-600 font-medium">Custo por ${item.yieldUnit === 'g' || item.yieldUnit === 'ml' ? item.yieldUnit : 'un'}</p>
            <p class="text-xs font-bold text-sweet-500">${formattedCostPerUnit}<span class="text-[9px] font-normal text-sweet-600">/${item.yieldUnit}</span></p>
          </div>
        </div>
      `;
    },

    /**
     * Registra eventos da tela de bases
     */
    registerEvents() {
      // Busca
      const searchInput = document.getElementById('search-bases');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          searchFilter = e.target.value;
          this.render();
          const newSearchInput = document.getElementById('search-bases');
          newSearchInput.focus();
          newSearchInput.setSelectionRange(newSearchInput.value.length, newSearchInput.value.length);
        });
      }

      // Modal triggers
      const btnAdd = document.getElementById('btn-add-base');
      if (btnAdd) btnAdd.addEventListener('click', () => this.openModal());

      const btnClose = document.getElementById('close-base-modal');
      if (btnClose) btnClose.addEventListener('click', () => this.closeModal());

      // Seletor de ingrediente dinâmico no modal
      const addIngSelect = document.getElementById('base-add-ingredient-id');
      const unitBadge = document.getElementById('base-add-unit-badge');

      if (addIngSelect && unitBadge) {
        addIngSelect.addEventListener('change', () => {
          const ingId = addIngSelect.value;
          const ing = ingredientsList.find(i => i.id === ingId);
          if (ing) {
            // Exibir a unidade de uso
            let usageUnit = ing.unit;
            if (ing.unit === 'kg') usageUnit = 'g';
            if (ing.unit === 'L') usageUnit = 'ml';
            unitBadge.textContent = usageUnit;
          } else {
            unitBadge.textContent = '';
          }
        });
      }

      // Botão Adicionar ingrediente à base
      const btnAddIngItem = document.getElementById('btn-base-add-ingredient-item');
      if (btnAddIngItem) {
        btnAddIngItem.addEventListener('click', () => {
          const ingId = addIngSelect.value;
          const qtyInput = document.getElementById('base-add-ingredient-qty');
          const qty = parseFloat(qtyInput.value) || 0;

          if (!ingId) {
            window.app.showToast('Selecione um ingrediente!', 'warning');
            return;
          }
          if (qty <= 0) {
            window.app.showToast('Informe uma quantidade válida!', 'warning');
            return;
          }

          const ing = ingredientsList.find(i => i.id === ingId);
          if (ing) {
            // Verificar se já existe, se sim soma
            const existing = currentBaseIngredients.find(item => item.ingredientId === ingId);
            if (existing) {
              existing.quantity += qty;
            } else {
              currentBaseIngredients.push({
                ingredientId: ingId,
                name: ing.name,
                unit: ing.unit === 'kg' ? 'g' : ing.unit === 'L' ? 'ml' : ing.unit,
                pricePerUnit: ing.pricePerUnit,
                quantity: qty
              });
            }

            // Reset inputs de adição
            addIngSelect.value = '';
            qtyInput.value = '';
            unitBadge.textContent = '';

            this.updateIngredientsListUI();
            this.calculateBasesCostPreview();
          }
        });
      }

      // Atualização de rendimento
      const yieldInput = document.getElementById('base-yieldAmount');
      if (yieldInput) {
        yieldInput.addEventListener('input', () => this.calculateBasesCostPreview());
      }
      const yieldUnitSelect = document.getElementById('base-yieldUnit');
      if (yieldUnitSelect) {
        yieldUnitSelect.addEventListener('change', () => this.calculateBasesCostPreview());
      }

      // Submissão do formulário
      const form = document.getElementById('form-base');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await this.saveBase();
        });
      }

      // Botão Excluir
      const btnDelete = document.getElementById('btn-delete-base-modal');
      if (btnDelete) {
        btnDelete.addEventListener('click', async () => {
          const id = document.getElementById('base-id').value;
          if (id && confirm('Deseja realmente excluir esta base? Isto a removerá de todos os produtos cadastrados.')) {
            await this.deleteBase(id);
          }
        });
      }

      // Ações globais
      window.appActions = window.appActions || {};
      window.appActions.editBase = (id) => this.openModal(id);
      window.appActions.removeBaseIngredient = (ingId) => {
        currentBaseIngredients = currentBaseIngredients.filter(item => item.ingredientId !== ingId);
        this.updateIngredientsListUI();
        this.calculateBasesCostPreview();
      };
    },

    /**
     * Abre modal de base
     */
    async openModal(id = null) {
      const modal = document.getElementById('modal-base');
      const form = document.getElementById('form-base');
      const title = document.getElementById('base-modal-title');
      const btnDelete = document.getElementById('btn-delete-base-modal');

      // Recarregar ingredientes disponíveis
      await this.loadData();

      form.reset();
      document.getElementById('base-id').value = '';
      currentBaseIngredients = [];
      this.updateIngredientsListUI();
      this.calculateBasesCostPreview();

      // Re-injetar lista de ingredientes atualizada no dropdown
      const selectAdd = document.getElementById('base-add-ingredient-id');
      if (selectAdd) {
        selectAdd.innerHTML = `
          <option value="">Selecione...</option>
          ${ingredientsList.map(i => `<option value="${i.id}">${i.name} (${window.app.formatCurrency(i.pricePerUnit)}/${i.unit === 'kg' || i.unit === 'g' ? 'g' : i.unit === 'L' || i.unit === 'ml' ? 'ml' : 'un'})</option>`).join('')}
        `;
      }

      if (id) {
        const item = basesList.find(b => b.id === id);
        if (item) {
          title.innerHTML = `<i data-lucide="edit" class="w-5 h-5 text-sweet-500"></i> Editar Base`;
          document.getElementById('base-id').value = item.id;
          document.getElementById('base-name').value = item.name;
          document.getElementById('base-yieldAmount').value = item.yieldAmount;
          document.getElementById('base-yieldUnit').value = item.yieldUnit;

          // Mapear os ingredientes cadastrados para ter o nome atualizado e custo atual
          const ingredientsMap = new Map(ingredientsList.map(ing => [ing.id, ing]));
          
          currentBaseIngredients = item.ingredients.map(bi => {
            const ing = ingredientsMap.get(bi.ingredientId);
            return {
              ingredientId: bi.ingredientId,
              name: ing ? ing.name : 'Insumo Excluído',
              unit: ing ? (ing.unit === 'kg' ? 'g' : ing.unit === 'L' ? 'ml' : ing.unit) : '?',
              pricePerUnit: ing ? ing.pricePerUnit : 0,
              quantity: bi.quantity
            };
          });

          btnDelete.classList.remove('hidden');
          this.updateIngredientsListUI();
          this.calculateBasesCostPreview();
        }
      } else {
        title.innerHTML = `<i data-lucide="egg" class="w-5 h-5 text-sweet-500"></i> Criar Base / Sub-receita`;
        btnDelete.classList.add('hidden');
      }

      modal.classList.remove('hidden');
      lucide.createIcons();
    },

    /**
     * Fecha o modal
     */
    closeModal() {
      document.getElementById('modal-base').classList.add('hidden');
    },

    /**
     * Atualiza a lista de ingredientes inseridos na UI do modal
     */
    updateIngredientsListUI() {
      const listContainer = document.getElementById('base-ingredients-list-container');
      if (!listContainer) return;

      if (currentBaseIngredients.length === 0) {
        listContainer.innerHTML = `<p class="text-[11px] text-sweet-600 italic text-center py-3">Nenhum ingrediente adicionado ainda.</p>`;
        return;
      }

      listContainer.innerHTML = currentBaseIngredients.map(item => {
        const cost = item.quantity * item.pricePerUnit;
        return `
          <div class="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-sweet-200/50 text-[11px] font-medium">
            <div class="flex-1 min-w-0 pr-2">
              <span class="block text-sweet-900 truncate font-semibold">${item.name}</span>
              <span class="text-sweet-600">${item.quantity}${item.unit} &times; ${window.app.formatCurrency(item.pricePerUnit)}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-sweet-900">${window.app.formatCurrency(cost)}</span>
              <button type="button" onclick="window.appActions.removeBaseIngredient('${item.ingredientId}')"
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
     * Calcula o preview de custos
     */
    calculateBasesCostPreview() {
      const totalCostLabel = document.getElementById('base-total-cost-preview');
      const unitCostLabel = document.getElementById('base-unit-cost-preview');
      const yieldInput = document.getElementById('base-yieldAmount');
      const yieldUnitSelect = document.getElementById('base-yieldUnit');

      if (!totalCostLabel || !unitCostLabel || !yieldInput) return;

      let totalCost = 0;
      currentBaseIngredients.forEach(item => {
        totalCost += item.quantity * item.pricePerUnit;
      });

      const yieldAmount = parseFloat(yieldInput.value) || 0;
      const yieldUnit = yieldUnitSelect ? yieldUnitSelect.value : 'g';
      const unitCost = yieldAmount > 0 ? totalCost / yieldAmount : 0;

      totalCostLabel.textContent = window.app.formatCurrency(totalCost);
      unitCostLabel.textContent = `${window.app.formatCurrency(unitCost)}/${yieldUnit === 'g' || yieldUnit === 'ml' ? yieldUnit : 'un'}`;
    },

    /**
     * Salva a base no banco de dados
     */
    async saveBase() {
      const id = document.getElementById('base-id').value || crypto.randomUUID();
      const name = document.getElementById('base-name').value;
      const yieldAmount = parseFloat(document.getElementById('base-yieldAmount').value);
      const yieldUnit = document.getElementById('base-yieldUnit').value;

      if (currentBaseIngredients.length === 0) {
        window.app.showToast('Adicione pelo menos 1 ingrediente!', 'warning');
        return;
      }

      let totalCost = 0;
      const ingredients = currentBaseIngredients.map(item => {
        totalCost += item.quantity * item.pricePerUnit;
        return {
          ingredientId: item.ingredientId,
          quantity: item.quantity
        };
      });

      const costPerUnit = yieldAmount > 0 ? totalCost / yieldAmount : 0;

      const data = {
        id,
        name,
        ingredients,
        yieldAmount,
        yieldUnit,
        totalCost,
        costPerUnit,
        updatedAt: new Date().toISOString()
      };

      try {
        await window.db.put('bases', data);
        window.app.showToast(id ? 'Base atualizada!' : 'Base cadastrada com sucesso!', 'success');
        
        // Recarregar dados e recalcular produtos
        await this.loadData();
        this.closeModal();
        this.render();

        // Recalcular produtos finais que usam esta base
        await window.ingredients.recalculateAllBasesAndProducts();
      } catch (err) {
        console.error(err);
        window.app.showToast('Erro ao salvar base.', 'error');
      }
    },

    /**
     * Exclui uma base
     */
    async deleteBase(id) {
      try {
        await window.db.delete('bases', id);
        window.app.showToast('Base excluída com sucesso!', 'success');
        await this.loadData();
        this.closeModal();
        this.render();
      } catch (err) {
        console.error(err);
        window.app.showToast('Erro ao excluir base.', 'error');
      }
    }
  };
})();
