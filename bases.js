/**
 * bases.js - Módulo de Cadastro de Bases (Sub-receitas pré-salvas)
 */

(() => {
  let basesList = [];
  let ingredientsList = [];
  let searchFilter = '';

  // Variável para acumular itens na criação/edição da base corrente
  let currentBaseIngredients = [];

  // Função auxiliar de conversão para todas as medidas caseiras com sugestões inteligentes
  const convertCaseiraToGramature = (ing, measureType) => {
    // Obter peso base da xícara
    let cup = ing.cupWeight > 0 ? ing.cupWeight : 150;
    if (!(ing.cupWeight > 0)) {
      const name = (ing.name || '').toLowerCase();
      const unit = ing.unit;
      if (unit === 'L' || unit === 'ml') {
        cup = 240;
      } else if (name.includes('farinha') || name.includes('trigo') || name.includes('amido') || name.includes('polvilho')) {
        cup = 120;
      } else if (name.includes('açúcar') || name.includes('acucar') || name.includes('adoçante') || name.includes('cristal') || name.includes('refinado')) {
        cup = 180;
      } else if (name.includes('cacau') || name.includes('chocolate') || name.includes('cacau em pó') || name.includes('chocolate em pó')) {
        cup = 90;
      } else if (name.includes('manteiga') || name.includes('margarina')) {
        cup = 200;
      }
    }

    // Obter peso da colher de sopa
    let sopa = ing.spoonSopaWeight > 0 ? ing.spoonSopaWeight : Math.round(cup / 12);
    if (!(ing.spoonSopaWeight > 0)) {
      if (cup === 240) sopa = 15;
      else if (cup === 120) sopa = 10;
      else if (cup === 180) sopa = 12;
      else if (cup === 90) sopa = 6;
      else if (cup === 200) sopa = 12;
    }

    // Obter colher de sobremesa
    let sobremesa = ing.spoonSobremesaWeight > 0 ? ing.spoonSobremesaWeight : Math.round(sopa * (2/3));
    
    // Obter colher de chá
    let cha = ing.spoonChaWeight > 0 ? ing.spoonChaWeight : Math.round(sopa / 3);

    // Calcular com base na medida selecionada
    switch (measureType) {
      case 'xicara': return cup;
      case 'xicara_meia': return cup * 0.5;
      case 'xicara_terco': return cup * 0.3333;
      case 'xicara_quarto': return cup * 0.25;
      case 'colher_sopa': return sopa;
      case 'colher_sobremesa': return sobremesa;
      case 'colher_cha': return cha;
      default: return 1;
    }
  };

  window.bases = {
    /**
     * Inicializa o módulo de bases
     */
    async init() {
      await window.bases.loadData();
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
            ${filtered.length === 0 ? window.bases.renderEmptyState() : filtered.map(item => window.bases.renderBaseCard(item)).join('')}
          </div>
        </div>

        <!-- MODAL DE CADASTRO/EDIÇÃO DE BASE -->
        <div id="modal-base" class="fixed inset-0 z-50 hidden flex items-end sm:items-center justify-center p-0 sm:p-4 bg-sweet-900/60 backdrop-blur-sm">
          <div class="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-xl border border-sweet-200 flex flex-col page-fade-in overflow-hidden">
            
            <div class="flex items-center justify-between pb-3 border-b border-sweet-100 flex-shrink-0">
              <h3 class="text-base font-bold flex items-center gap-1.5" id="base-modal-title">
                <i data-lucide="egg" class="w-5 h-5 text-sweet-500"></i> Criar Base / Sub-receita
              </h3>
              <button id="close-base-modal" class="text-sweet-600 hover:text-sweet-900 p-1.5">
                <i data-lucide="x" class="w-6 h-6"></i>
              </button>
            </div>
            
            <form id="form-base" class="flex-1 overflow-y-auto custom-scroll py-4 space-y-4 pr-1">
              <input type="hidden" id="base-id">
              
              <!-- Nome da Base -->
              <div>
                <label class="block text-xs font-semibold text-sweet-800 mb-1" for="base-name">Nome da Sub-receita</label>
                <input type="text" id="base-name" required placeholder="Ex: Brigadeiro Tradicional, Massa Pão de Ló"
                  class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium">
              </div>

              <!-- Adicionar Ingrediente à Lista -->
              <div class="p-3 bg-sweet-100/50 rounded-2xl border border-sweet-200 space-y-3">
                <span class="block text-xs font-bold text-sweet-900">Ingredientes da Sub-receita</span>
                
                <div class="grid grid-cols-12 gap-2">
                  <div class="col-span-6">
                    <select id="base-add-ingredient-id"
                      class="w-full h-12 px-2.5 py-1.5 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium bg-white">
                      <option value="">Selecione...</option>
                      ${ingredientsList.map(i => `<option value="${i.id}">${i.name} (${window.app.formatCurrency(i.pricePerUnit)}/${i.unit === 'kg' || i.unit === 'g' ? 'g' : i.unit === 'L' || i.unit === 'ml' ? 'ml' : 'un'})</option>`).join('')}
                    </select>
                  </div>
                  <div class="col-span-4 relative">
                    <input type="number" id="base-add-ingredient-qty" step="0.01" min="0.01" placeholder="Qtd" inputmode="decimal"
                      class="w-full h-12 pl-2 pr-12 py-1.5 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium">
                    <span class="absolute right-2 top-3.5 text-[10px] text-sweet-600" id="base-add-unit-badge"></span>
                  </div>
                  <div class="col-span-2">
                    <button type="button" id="btn-base-add-ingredient-item" class="w-full h-12 bg-sweet-500 hover:bg-sweet-600 text-white rounded-xl flex items-center justify-center transition-colors">
                      <i data-lucide="plus" class="w-5 h-5"></i>
                    </button>
                  </div>
                </div>

                <!-- Lista Acumulada de Ingredientes -->
                <div class="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scroll" id="base-ingredients-list-container">
                  <p class="text-[11px] text-sweet-600 italic text-center py-2">Nenhum ingrediente adicionado ainda.</p>
                </div>
              </div>

              <!-- Rendimento Especial -->
              <div class="p-3.5 bg-sweet-100/30 rounded-2xl border border-sweet-200 space-y-3">
                <span class="block text-xs font-bold text-sweet-900">Rendimento da Receita Base</span>
                
                <div>
                  <label class="block text-xs font-semibold text-sweet-800 mb-1" for="base-yieldType">Definir Rendimento por:</label>
                  <select id="base-yieldType" required
                    class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium bg-white">
                    <option value="peso">Peso / Volume Total (g ou ml)</option>
                    <option value="forma">Formas / Tamanho de Aro</option>
                    <option value="unidade">Unidades / Porções</option>
                  </select>
                </div>

                <!-- Campos dinâmicos do rendimento -->
                <div id="yield-fields-peso" class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-sweet-800 mb-1" for="base-yieldAmount-peso">Peso/Volume Total</label>
                    <input type="number" id="base-yieldAmount-peso" step="0.01" min="0.01" placeholder="Ex: 1200" inputmode="decimal"
                      class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-sweet-800 mb-1" for="base-yieldUnit-peso">Unidade</label>
                    <select id="base-yieldUnit-peso"
                      class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium bg-white">
                      <option value="g">Grama (g)</option>
                      <option value="ml">Mililitro (ml)</option>
                    </select>
                  </div>
                </div>

                <div id="yield-fields-forma" class="grid grid-cols-2 gap-3 hidden">
                  <div>
                    <label class="block text-xs font-semibold text-sweet-800 mb-1" for="base-yieldPanQty">Qtd. de Formas</label>
                    <input type="number" id="base-yieldPanQty" step="1" min="1" placeholder="Ex: 2" inputmode="numeric"
                      class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-sweet-800 mb-1" for="base-yieldPanSize">Tamanho / Aro</label>
                    <input type="text" id="base-yieldPanSize" placeholder="Ex: Aro 15"
                      class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium">
                  </div>
                </div>

                <div id="yield-fields-unidade" class="grid grid-cols-2 gap-3 hidden">
                  <div>
                    <label class="block text-xs font-semibold text-sweet-800 mb-1" for="base-yieldAmount-unidade">Qtd. Unidades</label>
                    <input type="number" id="base-yieldAmount-unidade" step="1" min="1" placeholder="Ex: 50" inputmode="numeric"
                      class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-sweet-800 mb-1" for="base-yieldUnit-unidade">Tipo de Porção</label>
                    <input type="text" id="base-yieldUnit-unidade" placeholder="Ex: brigadeiros de 20g"
                      class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium">
                  </div>
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

              <div class="pt-2 flex gap-2 flex-shrink-0">
                <button type="button" id="btn-delete-base-modal" class="hidden h-12 bg-rose-50 text-rose-600 border border-rose-200 px-4 rounded-xl font-bold hover:bg-rose-100 transition-colors text-base flex items-center justify-center gap-1.5 flex-1">
                  <i data-lucide="trash-2" class="w-4 h-4"></i> Excluir
                </button>
                <button type="submit" class="h-12 bg-sweet-500 text-white py-2.5 rounded-xl font-bold hover:bg-sweet-600 transition-colors shadow-sm text-base flex items-center justify-center gap-1.5 flex-[2]">
                  <i data-lucide="check" class="w-4 h-4"></i> Salvar Base
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      window.bases.registerEvents();
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
          window.bases.render();
          const newSearchInput = document.getElementById('search-bases');
          newSearchInput.focus();
          newSearchInput.setSelectionRange(newSearchInput.value.length, newSearchInput.value.length);
        });
      }

      // Modal triggers
      const btnAdd = document.getElementById('btn-add-base');
      if (btnAdd) btnAdd.addEventListener('click', () => window.bases.openModal());

      const btnClose = document.getElementById('close-base-modal');
      if (btnClose) btnClose.addEventListener('click', () => window.bases.closeModal());

      // Toggle dinâmico do tipo de rendimento
      const yieldTypeSelect = document.getElementById('base-yieldType');
      if (yieldTypeSelect) {
        const toggleYieldFields = () => {
          const type = yieldTypeSelect.value;
          document.getElementById('yield-fields-peso').classList.add('hidden');
          document.getElementById('yield-fields-forma').classList.add('hidden');
          document.getElementById('yield-fields-unidade').classList.add('hidden');
          
          const inputPeso = document.getElementById('base-yieldAmount-peso');
          const inputFormaQty = document.getElementById('base-yieldPanQty');
          const inputFormaSize = document.getElementById('base-yieldPanSize');
          const inputUnidadeQty = document.getElementById('base-yieldAmount-unidade');
          const inputUnidadeUnit = document.getElementById('base-yieldUnit-unidade');
          
          if (inputPeso) inputPeso.required = false;
          if (inputFormaQty) inputFormaQty.required = false;
          if (inputFormaSize) inputFormaSize.required = false;
          if (inputUnidadeQty) inputUnidadeQty.required = false;
          if (inputUnidadeUnit) inputUnidadeUnit.required = false;
          
          if (type === 'peso') {
            document.getElementById('yield-fields-peso').classList.remove('hidden');
            if (inputPeso) inputPeso.required = true;
          } else if (type === 'forma') {
            document.getElementById('yield-fields-forma').classList.remove('hidden');
            if (inputFormaQty) inputFormaQty.required = true;
            if (inputFormaSize) inputFormaSize.required = true;
          } else if (type === 'unidade') {
            document.getElementById('yield-fields-unidade').classList.remove('hidden');
            if (inputUnidadeQty) inputUnidadeQty.required = true;
            if (inputUnidadeUnit) inputUnidadeUnit.required = true;
          }
          
          window.bases.calculateBasesCostPreview();
        };
        yieldTypeSelect.addEventListener('change', toggleYieldFields);
      }

      // Seletor de ingrediente dinâmico no modal
      const addIngSelect = document.getElementById('base-add-ingredient-id');
      const unitBadge = document.getElementById('base-add-unit-badge');

      if (addIngSelect && unitBadge) {
        addIngSelect.addEventListener('change', () => {
          const ingId = addIngSelect.value;
          const ing = ingredientsList.find(i => i.id === ingId);
          if (ing) {
            let usageUnit = ing.unit;
            if (ing.unit === 'kg') usageUnit = 'g';
            if (ing.unit === 'L') usageUnit = 'ml';
            
            if (usageUnit === 'g' || usageUnit === 'ml') {
              unitBadge.innerHTML = `
                <select id="base-add-ingredient-use-unit" class="bg-transparent font-bold text-sweet-600 focus:outline-none text-[10px] cursor-pointer max-w-[80px]">
                  <option value="${usageUnit}">${usageUnit}</option>
                  <option value="xicara">xícara</option>
                  <option value="xicara_meia">1/2 xic.</option>
                  <option value="xicara_terco">1/3 xic.</option>
                  <option value="xicara_quarto">1/4 xic.</option>
                  <option value="colher_sopa">colh. sopa</option>
                  <option value="colher_sobremesa">colh. sobr.</option>
                  <option value="colher_cha">colh. chá</option>
                </select>
              `;
            } else {
              unitBadge.textContent = usageUnit;
            }
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
            const useUnitSelect = document.getElementById('base-add-ingredient-use-unit');
            const useUnit = useUnitSelect ? useUnitSelect.value : (ing.unit === 'kg' ? 'g' : ing.unit === 'L' ? 'ml' : ing.unit);
            
            const qtyConverted = convertCaseiraToGramature(ing, useUnit) * qty;

            const existing = currentBaseIngredients.find(item => item.ingredientId === ingId && item.originalUnit === useUnit);
            if (existing) {
              existing.quantity += qtyConverted;
              existing.originalQty += qty;
            } else {
              currentBaseIngredients.push({
                ingredientId: ingId,
                name: ing.name,
                unit: ing.unit === 'kg' ? 'g' : ing.unit === 'L' ? 'ml' : ing.unit,
                pricePerUnit: ing.pricePerUnit,
                quantity: qtyConverted,
                originalQty: qty,
                originalUnit: useUnit
              });
            }

            // Reset inputs de adição
            addIngSelect.value = '';
            qtyInput.value = '';
            unitBadge.textContent = '';

            window.bases.updateIngredientsListUI();
            window.bases.calculateBasesCostPreview();
          }
        });
      }

      // Atualização de rendimento ao digitar em qualquer campo
      const inputsToPreview = ['base-yieldAmount-peso', 'base-yieldPanQty', 'base-yieldPanSize', 'base-yieldAmount-unidade', 'base-yieldUnit-unidade', 'base-yieldUnit-peso'];
      inputsToPreview.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', () => window.bases.calculateBasesCostPreview());
          el.addEventListener('change', () => window.bases.calculateBasesCostPreview());
        }
      });

      // Submissão do formulário
      const form = document.getElementById('form-base');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await window.bases.saveBase();
        });
      }

      // Botão Excluir
      const btnDelete = document.getElementById('btn-delete-base-modal');
      if (btnDelete) {
        btnDelete.addEventListener('click', async () => {
          const id = document.getElementById('base-id').value;
          if (id && confirm('Deseja realmente excluir esta base? Isto a removerá de todos os produtos cadastrados.')) {
            await window.bases.deleteBase(id);
          }
        });
      }

      // Ações globais
      window.appActions = window.appActions || {};
      window.appActions.editBase = (id) => window.bases.openModal(id);
      window.appActions.removeBaseIngredient = (ingId) => {
        currentBaseIngredients = currentBaseIngredients.filter(item => item.ingredientId !== ingId);
        window.bases.updateIngredientsListUI();
        window.bases.calculateBasesCostPreview();
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
      await window.bases.loadData();

      form.reset();
      document.getElementById('base-id').value = '';
      currentBaseIngredients = [];
      window.bases.updateIngredientsListUI();

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
          
          const yType = item.yieldType || 'peso';
          document.getElementById('base-yieldType').value = yType;
          
          if (yType === 'peso') {
            document.getElementById('base-yieldAmount-peso').value = item.yieldAmount;
            document.getElementById('base-yieldUnit-peso').value = item.yieldUnit || 'g';
          } else if (yType === 'forma') {
            document.getElementById('base-yieldPanQty').value = item.yieldPanQty || 1;
            document.getElementById('base-yieldPanSize').value = item.yieldPanSize || 'Aro 15';
          } else if (yType === 'unidade') {
            document.getElementById('base-yieldAmount-unidade').value = item.yieldAmount;
            document.getElementById('base-yieldUnit-unidade').value = item.yieldUnit || 'porções';
          }

          // Mapear os ingredientes cadastrados para ter o nome atualizado e custo atual
          const ingredientsMap = new Map(ingredientsList.map(ing => [ing.id, ing]));
          
          currentBaseIngredients = item.ingredients.map(bi => {
            const ing = ingredientsMap.get(bi.ingredientId);
            const baseUnit = ing ? (ing.unit === 'kg' ? 'g' : ing.unit === 'L' ? 'ml' : ing.unit) : '?';
            return {
              ingredientId: bi.ingredientId,
              name: ing ? ing.name : 'Insumo Excluído',
              unit: baseUnit,
              pricePerUnit: ing ? ing.pricePerUnit : 0,
              quantity: bi.quantity,
              originalQty: bi.originalQty || bi.quantity,
              originalUnit: bi.originalUnit || baseUnit
            };
          });

          btnDelete.classList.remove('hidden');
          window.bases.updateIngredientsListUI();
        }
      } else {
        title.innerHTML = `<i data-lucide="egg" class="w-5 h-5 text-sweet-500"></i> Criar Base / Sub-receita`;
        btnDelete.classList.add('hidden');
        
        document.getElementById('base-yieldAmount-peso').value = '';
        document.getElementById('base-yieldPanQty').value = '';
        document.getElementById('base-yieldPanSize').value = '';
        document.getElementById('base-yieldAmount-unidade').value = '';
        document.getElementById('base-yieldUnit-unidade').value = '';
      }

      // Trigar mudança no select do tipo de rendimento para atualizar visibilidade dos campos
      const eventChange = new Event('change');
      document.getElementById('base-yieldType').dispatchEvent(eventChange);

      window.bases.calculateBasesCostPreview();

      modal.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons();
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
        
        let unitLabel = '';
        switch (item.originalUnit) {
          case 'xicara': unitLabel = 'xic.'; break;
          case 'xicara_meia': unitLabel = '1/2 xic.'; break;
          case 'xicara_terco': unitLabel = '1/3 xic.'; break;
          case 'xicara_quarto': unitLabel = '1/4 xic.'; break;
          case 'colher_sopa': unitLabel = 'colh. sopa'; break;
          case 'colher_sobremesa': unitLabel = 'colh. sobr.'; break;
          case 'colher_cha': unitLabel = 'colh. chá'; break;
          default: unitLabel = item.unit;
        }

        const isCaseira = ['xicara', 'xicara_meia', 'xicara_terco', 'xicara_quarto', 'colher_sopa', 'colher_sobremesa', 'colher_cha'].includes(item.originalUnit);
        const qtyDisplay = isCaseira ? `${item.originalQty} ${unitLabel} (~${item.quantity.toFixed(1)}${item.unit})` : `${item.originalQty || item.quantity}${unitLabel}`;

        return `
          <div class="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-sweet-200/50 text-[11px] font-medium animate-slide-in">
            <div class="flex-1 min-w-0 pr-2">
              <span class="block text-sweet-900 truncate font-semibold text-xs">${item.name}</span>
              <span class="text-sweet-600 text-[10px]">${qtyDisplay} &times; ${window.app.formatCurrency(item.pricePerUnit)}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-sweet-900">${window.app.formatCurrency(cost)}</span>
              <button type="button" onclick="window.appActions.removeBaseIngredient('${item.ingredientId}')"
                class="w-10 h-10 text-rose-500 hover:bg-rose-50 rounded-full flex items-center justify-center transition-colors active:scale-90">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      if (window.lucide) window.lucide.createIcons();
    },

    /**
     * Calcula o preview de custos
     */
    calculateBasesCostPreview() {
      const totalCostLabel = document.getElementById('base-total-cost-preview');
      const unitCostLabel = document.getElementById('base-unit-cost-preview');

      if (!totalCostLabel || !unitCostLabel) return;

      let totalCost = 0;
      currentBaseIngredients.forEach(item => {
        totalCost += item.quantity * item.pricePerUnit;
      });

      const yieldType = document.getElementById('base-yieldType') ? document.getElementById('base-yieldType').value : 'peso';
      let yieldAmount = 1;
      let yieldUnit = 'g';

      if (yieldType === 'peso') {
        const inputPeso = document.getElementById('base-yieldAmount-peso');
        const selectUnitPeso = document.getElementById('base-yieldUnit-peso');
        yieldAmount = parseFloat(inputPeso ? inputPeso.value : 0) || 0;
        yieldUnit = selectUnitPeso ? selectUnitPeso.value : 'g';
      } else if (yieldType === 'forma') {
        const qty = parseInt(document.getElementById('base-yieldPanQty').value) || 0;
        const size = document.getElementById('base-yieldPanSize').value || '';
        yieldAmount = qty;
        yieldUnit = size ? `Forma ${size}` : 'Forma';
      } else if (yieldType === 'unidade') {
        yieldAmount = parseInt(document.getElementById('base-yieldAmount-unidade').value) || 0;
        yieldUnit = document.getElementById('base-yieldUnit-unidade').value || 'un';
      }

      const unitCost = yieldAmount > 0 ? totalCost / yieldAmount : 0;

      totalCostLabel.textContent = window.app.formatCurrency(totalCost);
      unitCostLabel.textContent = `${window.app.formatCurrency(unitCost)}/${yieldUnit}`;
    },

    // ID generator fallback
    generateUUID() {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try {
          return crypto.randomUUID();
        } catch (e) {}
      }
      return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
    },

    /**
     * Salva a base no banco de dados
     */
    async saveBase() {
      const id = document.getElementById('base-id').value || window.bases.generateUUID();
      const name = document.getElementById('base-name').value;
      
      const yieldType = document.getElementById('base-yieldType').value;
      let yieldAmount = 1;
      let yieldUnit = 'g';
      let yieldPanQty = null;
      let yieldPanSize = null;

      if (yieldType === 'peso') {
        yieldAmount = parseFloat(document.getElementById('base-yieldAmount-peso').value) || 1;
        yieldUnit = document.getElementById('base-yieldUnit-peso').value;
      } else if (yieldType === 'forma') {
        yieldPanQty = parseInt(document.getElementById('base-yieldPanQty').value) || 1;
        yieldPanSize = document.getElementById('base-yieldPanSize').value || 'Aro 15';
        yieldAmount = yieldPanQty;
        yieldUnit = `Forma ${yieldPanSize}`;
      } else if (yieldType === 'unidade') {
        yieldAmount = parseInt(document.getElementById('base-yieldAmount-unidade').value) || 1;
        yieldUnit = document.getElementById('base-yieldUnit-unidade').value || 'porções';
      }

      if (currentBaseIngredients.length === 0) {
        window.app.showToast('Adicione pelo menos 1 ingrediente!', 'warning');
        return;
      }

      let totalCost = 0;
      const ingredients = currentBaseIngredients.map(item => {
        totalCost += item.quantity * item.pricePerUnit;
        return {
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          originalQty: item.originalQty,
          originalUnit: item.originalUnit
        };
      });

      const costPerUnit = yieldAmount > 0 ? totalCost / yieldAmount : 0;

      const data = {
        id,
        name,
        ingredients,
        yieldType,
        yieldAmount,
        yieldUnit,
        yieldPanQty,
        yieldPanSize,
        totalCost,
        costPerUnit,
        updatedAt: new Date().toISOString()
      };

      try {
        await window.db.put('bases', data);
        window.app.showToast(id && document.getElementById('base-id').value ? 'Base atualizada!' : 'Base cadastrada com sucesso!', 'success');
        
        // Recarregar dados e recalcular produtos
        await window.bases.loadData();
        window.bases.closeModal();
        window.bases.render();

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
        await window.bases.loadData();
        window.bases.closeModal();
        window.bases.render();
      } catch (err) {
        console.error(err);
        window.app.showToast('Erro ao excluir base.', 'error');
      }
    }
  };
})();
