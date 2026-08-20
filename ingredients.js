/**
 * ingredients.js - Módulo de Gerenciamento de Insumos / Ingredientes
 */

(() => {
  let ingredientsList = [];
  let searchFilter = '';

  window.ingredients = {
    /**
     * Inicializa o módulo de insumos
     */
    async init() {
      await window.ingredients.loadData();
    },

    /**
     * Carrega os dados do IndexedDB
     */
    async loadData() {
      ingredientsList = await window.db.getAll('ingredients');
      // Ordenar alfabeticamente
      ingredientsList.sort((a, b) => a.name.localeCompare(b.name));
    },

    /**
     * Renderiza a página de insumos
     */
    render() {
      const mainContent = document.getElementById('main-content');
      
      // Filtrar a lista
      const filtered = ingredientsList.filter(item => 
        item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.category.toLowerCase().includes(searchFilter.toLowerCase())
      );

      mainContent.innerHTML = `
        <div class="page-fade-in space-y-4">
          <!-- Título e Ações -->
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold tracking-tight">Cadastro de Insumos</h2>
              <p class="text-xs text-sweet-600">Cadastre matérias-primas e embalagens</p>
            </div>
            <button id="btn-add-ingredient" class="bg-sweet-500 hover:bg-sweet-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
              <i data-lucide="plus" class="w-4 h-4"></i> Novo Insumo
            </button>
          </div>

          <!-- Barra de Busca -->
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-sweet-600">
              <i data-lucide="search" class="w-4 h-4"></i>
            </span>
            <input type="search" id="search-ingredients" placeholder="Buscar por ingrediente ou categoria..." value="${searchFilter}"
              class="w-full pl-9 pr-4 py-2 bg-white border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-sm font-medium">
          </div>

          <!-- Lista de Insumos -->
          <div class="space-y-2.5" id="ingredients-container">
            ${filtered.length === 0 ? window.ingredients.renderEmptyState() : filtered.map(item => window.ingredients.renderIngredientCard(item)).join('')}
          </div>
        </div>

        <!-- MODAL DE CADASTRO/EDIÇÃO DE INSUMO -->
        <div id="modal-ingredient" class="fixed inset-0 z-50 hidden flex items-end sm:items-center justify-center p-4 bg-sweet-900/60 backdrop-blur-sm">
          <div class="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-xl border border-sweet-200 page-fade-in max-h-[92vh] overflow-y-auto custom-scroll">
            <div class="flex items-center justify-between pb-3 border-b border-sweet-100">
              <h3 class="text-base font-bold flex items-center gap-1.5" id="ingredient-modal-title">
                <i data-lucide="droplet" class="w-5 h-5 text-sweet-500"></i> Cadastrar Insumo
              </h3>
              <button id="close-ingredient-modal" class="text-sweet-600 hover:text-sweet-900 p-1.5">
                <i data-lucide="x" class="w-6 h-6"></i>
              </button>
            </div>
            
            <form id="form-ingredient" class="space-y-4 pt-4">
              <input type="hidden" id="ingredient-id">
              
              <div>
                <label class="block text-xs font-semibold text-sweet-800 mb-1" for="ingredient-name">Nome do Insumo</label>
                <input type="text" id="ingredient-name" required placeholder="Ex: Leite Condensado Moça"
                  class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium">
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-sweet-800 mb-1" for="ingredient-category">Categoria</label>
                  <select id="ingredient-category" required
                    class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium bg-white">
                    <option value="Laticínios">Laticínios</option>
                    <option value="Secos/Farinhas">Secos/Farinhas</option>
                    <option value="Açúcares/Adoçantes">Açúcares/Adoçantes</option>
                    <option value="Chocolates/Cacau">Chocolates</option>
                    <option value="Frutas/Frescos">Frutas/Frescos</option>
                    <option value="Ovos/Fermentos">Ovos/Fermentos</option>
                    <option value="Embalagens">Embalagens</option>
                    <option value="Outros">Outros/Decorativos</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-sweet-800 mb-1" for="ingredient-unit">Unidade de Compra</label>
                  <select id="ingredient-unit" required
                    class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium bg-white">
                    <option value="g">Grama (g)</option>
                    <option value="kg">Quilograma (kg)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="L">Litro (L)</option>
                    <option value="un">Unidade (un)</option>
                    <option value="duzia">Dúzia (12 un)</option>
                    <option value="caixa_lata">Caixa / Lata</option>
                  </select>
                </div>
              </div>

              <!-- Novo campo para conteúdo de Caixa/Lata -->
              <div id="div-package-content" class="hidden">
                <label class="block text-xs font-semibold text-sweet-800 mb-1" for="ingredient-packageContentWeight">
                  Conteúdo por Caixa/Lata (em g ou ml)
                </label>
                <input type="number" id="ingredient-packageContentWeight" step="0.1" min="0" placeholder="Ex: 395" inputmode="decimal"
                  class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium">
                <p class="text-[9px] text-sweet-600 mt-0.5">Peso líquido ou volume de cada embalagem individual.</p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-sweet-800 mb-1" for="ingredient-packageSize" id="label-packageSize">Qtd. Embalagem (g)</label>
                  <input type="number" id="ingredient-packageSize" step="0.001" min="0.001" required placeholder="Ex: 395" inputmode="decimal"
                    class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-sweet-800 mb-1" for="ingredient-price">Preço Pago (R$)</label>
                  <input type="number" id="ingredient-price" step="0.01" min="0" required placeholder="Ex: 6.50" inputmode="decimal"
                    class="w-full h-12 px-3 py-2 border border-sweet-200 rounded-xl focus:outline-none focus:border-sweet-500 text-base font-medium">
                </div>
              </div>

              <!-- Medidas Caseiras -->
              <div id="div-caseiras-container" class="space-y-3 p-3 bg-sweet-100/50 rounded-2xl border border-sweet-200">
                <span class="block text-xs font-bold text-sweet-900">Medidas Caseiras (g ou ml)</span>
                <p class="text-[9px] text-sweet-600">Altere as sugestões se a sua balança registrar valores diferentes.</p>
                
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[10px] font-semibold text-sweet-800 mb-0.5" for="ingredient-cupWeight">1 Xícara</label>
                    <input type="number" id="ingredient-cupWeight" placeholder="Sugestão..." inputmode="decimal" step="0.1" min="0"
                      class="w-full h-12 px-2.5 py-1.5 border border-sweet-200 rounded-xl text-base font-medium">
                  </div>
                  <div>
                    <label class="block text-[10px] font-semibold text-sweet-800 mb-0.5" for="ingredient-spoonSopaWeight">1 Colher Sopa</label>
                    <input type="number" id="ingredient-spoonSopaWeight" placeholder="Sugestão..." inputmode="decimal" step="0.1" min="0"
                      class="w-full h-12 px-2.5 py-1.5 border border-sweet-200 rounded-xl text-base font-medium">
                  </div>
                  <div>
                    <label class="block text-[10px] font-semibold text-sweet-800 mb-0.5" for="ingredient-spoonSobremesaWeight">Colher Sobremesa</label>
                    <input type="number" id="ingredient-spoonSobremesaWeight" placeholder="Sugestão..." inputmode="decimal" step="0.1" min="0"
                      class="w-full h-12 px-2.5 py-1.5 border border-sweet-200 rounded-xl text-base font-medium">
                  </div>
                  <div>
                    <label class="block text-[10px] font-semibold text-sweet-800 mb-0.5" for="ingredient-spoonChaWeight">Colher Chá</label>
                    <input type="number" id="ingredient-spoonChaWeight" placeholder="Sugestão..." inputmode="decimal" step="0.1" min="0"
                      class="w-full h-12 px-2.5 py-1.5 border border-sweet-200 rounded-xl text-base font-medium">
                  </div>
                </div>
              </div>

              <div class="p-3 bg-sweet-100 rounded-xl border border-sweet-200/50 flex justify-between items-center text-xs">
                <span class="font-medium text-sweet-800">Custo por unidade básica:</span>
                <span class="font-bold text-sweet-500 text-sm" id="ingredient-cost-preview">R$ 0,00</span>
              </div>

              <div class="pt-2 flex gap-2">
                <button type="button" id="btn-delete-ingredient-modal" class="hidden h-12 bg-rose-50 text-rose-600 border border-rose-200 px-4 rounded-xl font-bold hover:bg-rose-100 transition-colors text-base flex items-center justify-center gap-1.5 flex-1">
                  <i data-lucide="trash-2" class="w-4 h-4"></i> Excluir
                </button>
                <button type="submit" class="h-12 bg-sweet-500 text-white py-2.5 rounded-xl font-bold hover:bg-sweet-600 transition-colors shadow-sm text-base flex items-center justify-center gap-1.5 flex-[2]">
                  <i data-lucide="check" class="w-4 h-4"></i> Salvar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      window.ingredients.registerEvents();
    },

    /**
     * Renderiza a tela de estado vazio
     */
    renderEmptyState() {
      return `
        <div class="flex flex-col items-center justify-center py-12 px-4 bg-white border border-dashed border-sweet-300 rounded-2xl text-center">
          <div class="w-12 h-12 bg-sweet-100 rounded-full flex items-center justify-center text-sweet-500 mb-3">
            <i data-lucide="package-search" class="w-6 h-6"></i>
          </div>
          <h4 class="text-sm font-bold text-sweet-900">Nenhum insumo encontrado</h4>
          <p class="text-xs text-sweet-600 mt-1 max-w-xs">
            ${searchFilter ? 'Tente ajustar sua busca ou remova os filtros.' : 'Cadastre suas matérias-primas e embalagens para começar a precificar suas receitas.'}
          </p>
        </div>
      `;
    },

    /**
     * Renderiza um cartão de insumo
     */
    renderIngredientCard(item) {
      // Definir unidade de custo correspondente
      let baseUnitStr = 'un';
      if (item.unit === 'kg' || item.unit === 'g') baseUnitStr = 'g';
      if (item.unit === 'L' || item.unit === 'ml') baseUnitStr = 'ml';

      const costPerBaseUnit = item.pricePerUnit;
      const formattedCostPerBaseUnit = window.app.formatCurrency(costPerBaseUnit);
      
      // Cor da categoria
      let categoryBadgeColor = 'bg-sweet-100 text-sweet-800';
      if (item.category === 'Laticínios') categoryBadgeColor = 'bg-blue-50 text-blue-700';
      else if (item.category === 'Chocolates/Cacau') categoryBadgeColor = 'bg-amber-100 text-amber-800';
      else if (item.category === 'Frutas/Frescos') categoryBadgeColor = 'bg-emerald-50 text-emerald-700';
      else if (item.category === 'Embalagens') categoryBadgeColor = 'bg-purple-50 text-purple-700';
      else if (item.category === 'Ovos/Fermentos') categoryBadgeColor = 'bg-orange-50 text-orange-700';

      return `
        <div class="bg-white p-3.5 rounded-2xl border border-sweet-200/50 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]"
          onclick="window.appActions.editIngredient('${item.id}')">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-bold text-sweet-900 leading-tight">${item.name}</h4>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-semibold ${categoryBadgeColor}">
                ${item.category}
              </span>
            </div>
            <p class="text-[11px] text-sweet-600">
              Preço: <span class="font-semibold text-sweet-900">${window.app.formatCurrency(item.price)}</span> por ${item.packageSize}${item.unit}
            </p>
          </div>
          <div class="text-right">
            <p class="text-[10px] text-sweet-600 font-medium">Custo unitário</p>
            <p class="text-xs font-bold text-sweet-500">${formattedCostPerBaseUnit}<span class="text-[9px] font-normal text-sweet-600">/${baseUnitStr}</span></p>
          </div>
        </div>
      `;
    },

    /**
     * Registra eventos específicos da tela de insumos
     */
    registerEvents() {
      // Filtro de busca
      const searchInput = document.getElementById('search-ingredients');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          searchFilter = e.target.value;
          window.ingredients.render();
          // Manter o foco no input
          const newSearchInput = document.getElementById('search-ingredients');
          newSearchInput.focus();
          newSearchInput.setSelectionRange(newSearchInput.value.length, newSearchInput.value.length);
        });
      }

      // Botões do Modal
      const btnAdd = document.getElementById('btn-add-ingredient');
      if (btnAdd) {
        btnAdd.addEventListener('click', () => window.ingredients.openModal());
      }

      const btnClose = document.getElementById('close-ingredient-modal');
      if (btnClose) {
        btnClose.addEventListener('click', () => window.ingredients.closeModal());
      }

      const selectUnit = document.getElementById('ingredient-unit');
      const labelPackageSize = document.getElementById('label-packageSize');
      const divCaseiras = document.getElementById('div-caseiras-container');
      const divPackageContent = document.getElementById('div-package-content');
      const inputName = document.getElementById('ingredient-name');
      const selectCategory = document.getElementById('ingredient-category');
      const inputContentWeight = document.getElementById('ingredient-packageContentWeight');
      
      if (selectUnit && labelPackageSize && divCaseiras && divPackageContent) {
        const updateLabel = () => {
          const val = selectUnit.value;
          labelPackageSize.textContent = `Qtd. Embalagem (${val === 'duzia' ? 'dz' : val})`;
          
          if (val === 'caixa_lata') {
            divPackageContent.classList.remove('hidden');
            if (inputContentWeight) inputContentWeight.required = true;
          } else {
            divPackageContent.classList.add('hidden');
            if (inputContentWeight) inputContentWeight.required = false;
          }
          
          if (val === 'un' || val === 'duzia') {
            divCaseiras.classList.add('hidden');
          } else {
            divCaseiras.classList.remove('hidden');
          }
        };
        selectUnit.addEventListener('change', updateLabel);
        updateLabel();
      }

      // Função auxiliar inteligente para estimar o peso/volume de 1 xícara
      const getIngredientCupWeightDefault = (name = '', unit = '', category = '') => {
        const n = name.toLowerCase();
        if (unit === 'L' || unit === 'ml' || category.toLowerCase().includes('líquidos') || n.includes('leite') || n.includes('água') || n.includes('agua') || n.includes('óleo') || n.includes('oleo') || n.includes('suco')) {
          return 240;
        }
        if (n.includes('farinha') || n.includes('trigo') || n.includes('amido') || n.includes('polvilho')) {
          return 120;
        }
        if (n.includes('açúcar') || n.includes('acucar') || n.includes('adoçante') || n.includes('cristal') || n.includes('refinado')) {
          return 180;
        }
        if (n.includes('cacau') || n.includes('chocolate') || n.includes('cacau em pó') || n.includes('chocolate em pó')) {
          return 90;
        }
        if (n.includes('manteiga') || n.includes('margarina')) {
          return 200;
        }
        return 150; // Padrão geral para secos
      };

      const getIngredientSpoonSopaDefault = (cupVal) => {
        if (cupVal === 240) return 15;
        if (cupVal === 120) return 10;
        if (cupVal === 180) return 12;
        if (cupVal === 90) return 6;
        if (cupVal === 200) return 12;
        return Math.round(cupVal / 12);
      };

      const updateHomeMeasureSuggestions = () => {
        const nameVal = inputName ? inputName.value : '';
        const unitVal = selectUnit ? selectUnit.value : '';
        const catVal = selectCategory ? selectCategory.value : '';

        const cup = getIngredientCupWeightDefault(nameVal, unitVal, catVal);
        const sopa = getIngredientSpoonSopaDefault(cup);
        const sobremesa = Math.round(sopa * (2/3));
        const cha = Math.round(sopa / 3);

        const cupInput = document.getElementById('ingredient-cupWeight');
        const sopaInput = document.getElementById('ingredient-spoonSopaWeight');
        const sobInput = document.getElementById('ingredient-spoonSobremesaWeight');
        const chaInput = document.getElementById('ingredient-spoonChaWeight');

        if (cupInput) cupInput.placeholder = `Sugestão: ${cup}g`;
        if (sopaInput) sopaInput.placeholder = `Sugestão: ${sopa}g`;
        if (sobInput) sobInput.placeholder = `Sugestão: ${sobremesa}g`;
        if (chaInput) chaInput.placeholder = `Sugestão: ${cha}g`;
      };

      if (inputName) inputName.addEventListener('input', updateHomeMeasureSuggestions);
      if (selectCategory) selectCategory.addEventListener('change', updateHomeMeasureSuggestions);
      if (selectUnit) selectUnit.addEventListener('change', updateHomeMeasureSuggestions);

      // Preview de cálculo de custo no formulário
      const inputPrice = document.getElementById('ingredient-price');
      const inputSize = document.getElementById('ingredient-packageSize');
      const costPreview = document.getElementById('ingredient-cost-preview');

      const updateCostPreview = () => {
        const price = parseFloat(inputPrice.value) || 0;
        const size = parseFloat(inputSize.value) || 0;
        const unit = selectUnit ? selectUnit.value : 'g';
        const contentWeight = parseFloat(document.getElementById('ingredient-packageContentWeight').value) || 0;

        if (price > 0 && size > 0) {
          let baseSize = size;
          let unitLabel = 'g';

          if (unit === 'kg') {
            baseSize = size * 1000;
            unitLabel = 'g';
          } else if (unit === 'L') {
            baseSize = size * 1000;
            unitLabel = 'ml';
          } else if (unit === 'g') {
            unitLabel = 'g';
          } else if (unit === 'ml') {
            unitLabel = 'ml';
          } else if (unit === 'un') {
            unitLabel = 'un';
          } else if (unit === 'duzia') {
            baseSize = size * 12;
            unitLabel = 'un';
          } else if (unit === 'caixa_lata') {
            baseSize = size * (contentWeight || 1);
            
            const nameVal = inputName ? inputName.value.toLowerCase() : '';
            const catVal = selectCategory ? selectCategory.value.toLowerCase() : '';
            if (catVal.includes('líquido') || nameVal.includes('leite') || nameVal.includes('óleo') || nameVal.includes('suco') || nameVal.includes('água')) {
              unitLabel = 'ml';
            } else {
              unitLabel = 'g';
            }
          }

          const cost = price / baseSize;
          costPreview.textContent = `${window.app.formatCurrency(cost)}/${unitLabel}`;
        } else {
          costPreview.textContent = 'R$ 0,00';
        }
      };

      if (inputPrice && inputSize && selectUnit) {
        inputPrice.addEventListener('input', updateCostPreview);
        inputSize.addEventListener('input', updateCostPreview);
        selectUnit.addEventListener('change', updateCostPreview);
        if (inputContentWeight) inputContentWeight.addEventListener('input', updateCostPreview);
        if (inputName) inputName.addEventListener('input', updateCostPreview);
        if (selectCategory) selectCategory.addEventListener('change', updateCostPreview);
      }

      // Submissão do Formulário
      const form = document.getElementById('form-ingredient');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await window.ingredients.saveIngredient();
        });
      }

      // Botão Excluir no Modal
      const btnDelete = document.getElementById('btn-delete-ingredient-modal');
      if (btnDelete) {
        btnDelete.addEventListener('click', async () => {
          const id = document.getElementById('ingredient-id').value;
          if (id && confirm('Deseja realmente excluir este insumo? Isso afetará receitas e produtos finais que utilizam este item.')) {
            await window.ingredients.deleteIngredient(id);
          }
        });
      }

      // Disponibilizar globalmente para o onclick
      window.appActions = window.appActions || {};
      window.appActions.editIngredient = (id) => window.ingredients.openModal(id);
    },

    /**
     * Abre o modal de cadastro/edição
     */
    async openModal(id = null) {
      const modal = document.getElementById('modal-ingredient');
      const form = document.getElementById('form-ingredient');
      const title = document.getElementById('ingredient-modal-title');
      const btnDelete = document.getElementById('btn-delete-ingredient-modal');

      form.reset();
      document.getElementById('ingredient-id').value = '';
      document.getElementById('ingredient-cost-preview').textContent = 'R$ 0,00';

      if (id) {
        const item = ingredientsList.find(i => i.id === id);
        if (item) {
          title.innerHTML = `<i data-lucide="edit" class="w-5 h-5 text-sweet-500"></i> Editar Insumo`;
          document.getElementById('ingredient-id').value = item.id;
          document.getElementById('ingredient-name').value = item.name;
          document.getElementById('ingredient-category').value = item.category;
          document.getElementById('ingredient-unit').value = item.unit;
          document.getElementById('ingredient-packageSize').value = item.packageSize;
          document.getElementById('ingredient-price').value = item.price;
          
          document.getElementById('ingredient-packageContentWeight').value = item.packageContentWeight || '';
          document.getElementById('ingredient-cupWeight').value = item.cupWeight || '';
          document.getElementById('ingredient-spoonSopaWeight').value = item.spoonSopaWeight || '';
          document.getElementById('ingredient-spoonSobremesaWeight').value = item.spoonSobremesaWeight || '';
          document.getElementById('ingredient-spoonChaWeight').value = item.spoonChaWeight || '';
          
          const val = item.unit;
          const divPackageContent = document.getElementById('div-package-content');
          const divCaseiras = document.getElementById('div-caseiras-container');
          
          if (val === 'caixa_lata') {
            divPackageContent.classList.remove('hidden');
          } else {
            divPackageContent.classList.add('hidden');
          }
          
          if (val === 'un' || val === 'duzia') {
            divCaseiras.classList.add('hidden');
          } else {
            divCaseiras.classList.remove('hidden');
          }

          document.getElementById('label-packageSize').textContent = `Qtd. Embalagem (${val === 'duzia' ? 'dz' : val})`;
          btnDelete.classList.remove('hidden');
          
          // Disparar preview de custo
          let baseSize = item.packageSize;
          let unitLabel = 'g';
          if (item.unit === 'kg') {
            baseSize = item.packageSize * 1000;
            unitLabel = 'g';
          } else if (item.unit === 'L') {
            baseSize = item.packageSize * 1000;
            unitLabel = 'ml';
          } else if (item.unit === 'g') {
            unitLabel = 'g';
          } else if (item.unit === 'ml') {
            unitLabel = 'ml';
          } else if (item.unit === 'un') {
            unitLabel = 'un';
          } else if (item.unit === 'duzia') {
            baseSize = item.packageSize * 12;
            unitLabel = 'un';
          } else if (item.unit === 'caixa_lata') {
            baseSize = item.packageSize * (item.packageContentWeight || 1);
            const nVal = item.name.toLowerCase();
            const catVal = item.category.toLowerCase();
            if (catVal.includes('líquido') || nVal.includes('leite') || nVal.includes('óleo') || nVal.includes('suco') || nVal.includes('água')) {
              unitLabel = 'ml';
            } else {
              unitLabel = 'g';
            }
          }
          document.getElementById('ingredient-cost-preview').textContent = `${window.app.formatCurrency(item.price / baseSize)}/${unitLabel}`;
        }
      } else {
        title.innerHTML = `<i data-lucide="droplet" class="w-5 h-5 text-sweet-500"></i> Cadastrar Insumo`;
        document.getElementById('label-packageSize').textContent = `Qtd. Embalagem (g)`;
        document.getElementById('ingredient-packageContentWeight').value = '';
        document.getElementById('ingredient-cupWeight').value = '';
        document.getElementById('ingredient-spoonSopaWeight').value = '';
        document.getElementById('ingredient-spoonSobremesaWeight').value = '';
        document.getElementById('ingredient-spoonChaWeight').value = '';
        document.getElementById('div-package-content').classList.add('hidden');
        document.getElementById('div-caseiras-container').classList.remove('hidden');
        btnDelete.classList.add('hidden');
      }

      modal.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons();
    },

    /**
     * Fecha o modal
     */
    closeModal() {
      const modal = document.getElementById('modal-ingredient');
      modal.classList.add('hidden');
    },

    // ID generator fallback seguro e offline para navegadores antigos ou contextos não seguros
    generateUUID() {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try {
          return crypto.randomUUID();
        } catch (e) {}
      }
      return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
    },

    /**
     * Salva o ingrediente no banco de dados
     */
    async saveIngredient() {
      const id = document.getElementById('ingredient-id').value || window.ingredients.generateUUID();
      const name = document.getElementById('ingredient-name').value;
      const category = document.getElementById('ingredient-category').value;
      const unit = document.getElementById('ingredient-unit').value;
      const packageSize = parseFloat(document.getElementById('ingredient-packageSize').value);
      const price = parseFloat(document.getElementById('ingredient-price').value);

      const packageContentWeight = parseFloat(document.getElementById('ingredient-packageContentWeight').value) || null;
      const cupWeight = parseFloat(document.getElementById('ingredient-cupWeight').value) || null;
      const spoonSopaWeight = parseFloat(document.getElementById('ingredient-spoonSopaWeight').value) || null;
      const spoonSobremesaWeight = parseFloat(document.getElementById('ingredient-spoonSobremesaWeight').value) || null;
      const spoonChaWeight = parseFloat(document.getElementById('ingredient-spoonChaWeight').value) || null;

      // Calcular divisor unitário básico
      let divisor = packageSize;
      let baseUnit = 'g';
      
      if (unit === 'kg') {
        divisor = packageSize * 1000;
        baseUnit = 'g';
      } else if (unit === 'L') {
        divisor = packageSize * 1000;
        baseUnit = 'ml';
      } else if (unit === 'g') {
        baseUnit = 'g';
      } else if (unit === 'ml') {
        baseUnit = 'ml';
      } else if (unit === 'un') {
        baseUnit = 'un';
      } else if (unit === 'duzia') {
        divisor = packageSize * 12;
        baseUnit = 'un';
      } else if (unit === 'caixa_lata') {
        divisor = packageSize * (packageContentWeight || 1);
        const nVal = name.toLowerCase();
        const catVal = category.toLowerCase();
        if (catVal.includes('líquido') || nVal.includes('leite') || nVal.includes('óleo') || nVal.includes('suco') || nVal.includes('água')) {
          baseUnit = 'ml';
        } else {
          baseUnit = 'g';
        }
      }
      const pricePerUnit = price / divisor;

      const data = {
        id,
        name,
        category,
        unit,
        packageSize,
        price,
        pricePerUnit,
        baseUnit,
        packageContentWeight,
        cupWeight,
        spoonSopaWeight,
        spoonSobremesaWeight,
        spoonChaWeight,
        updatedAt: new Date().toISOString()
      };

      try {
        await window.db.put('ingredients', data);
        window.app.showToast(id && document.getElementById('ingredient-id').value ? 'Insumo atualizado!' : 'Insumo cadastrado com sucesso!', 'success');
        
        // Recarregar dados e atualizar UI
        await window.ingredients.loadData();
        window.ingredients.closeModal();
        window.ingredients.render();
        
        // Recalcular bases e produtos se for uma edição!
        await window.ingredients.recalculateAllBasesAndProducts();
      } catch (err) {
        console.error(err);
        window.app.showToast('Erro ao salvar insumo.', 'error');
      }
    },

    /**
     * Exclui o ingrediente do banco de dados
     */
    async deleteIngredient(id) {
      try {
        await window.db.delete('ingredients', id);
        window.app.showToast('Insumo excluído com sucesso!', 'success');
        await window.ingredients.loadData();
        window.ingredients.closeModal();
        window.ingredients.render();
      } catch (err) {
        console.error(err);
        window.app.showToast('Erro ao excluir insumo.', 'error');
      }
    },

    /**
     * Recalcula custos de bases e produtos dependentes após atualização de preço de um ingrediente
     */
    async recalculateAllBasesAndProducts() {
      const basesList = await window.db.getAll('bases');
      const ingredientsMap = new Map(ingredientsList.map(i => [i.id, i]));
      
      // Atualizar custos de bases
      for (const base of basesList) {
        let totalCost = 0;
        for (const bIng of base.ingredients) {
          const ing = ingredientsMap.get(bIng.ingredientId);
          if (ing) {
            totalCost += bIng.quantity * ing.pricePerUnit;
          }
        }
        base.totalCost = totalCost;
        base.costPerUnit = base.yieldAmount > 0 ? totalCost / base.yieldAmount : 0;
        await window.db.put('bases', base);
      }

      // Atualizar custos de produtos
      const productsList = await window.db.getAll('products');
      const basesMap = new Map((await window.db.getAll('bases')).map(b => [b.id, b]));
      
      for (const product of productsList) {
        let cpv = 0;
        for (const item of product.items) {
          if (item.type === 'ingredient' || item.type === 'package') {
            const ing = ingredientsMap.get(item.itemId);
            if (ing) {
              cpv += item.quantity * ing.pricePerUnit;
            }
          } else if (item.type === 'base') {
            const base = basesMap.get(item.itemId);
            if (base) {
              cpv += item.quantity * base.costPerUnit;
            }
          }
        }
        
        product.cpv = cpv;
        
        const settings = await window.db.get('settings', 'config');
        const workHourRate = settings ? settings.workHourRate : 15;
        
        const indirectCost = cpv * (product.indirectCostPercent / 100);
        const laborCost = (product.laborTimeMinutes / 60) * workHourRate;
        
        const subtotal = cpv + indirectCost + laborCost;
        
        // Preço de Custo (Breakeven) = Subtotal / (1 - Taxas)
        const taxFactor = product.taxPercent / 100;
        const breakevenPrice = taxFactor < 1 ? subtotal / (1 - taxFactor) : subtotal;
        
        // Preço Sugerido = Subtotal / (1 - Taxas - Margem)
        const divisor = 1 - (product.taxPercent / 100) - (product.profitMarginPercent / 100);
        const finalPriceSuggested = divisor > 0 ? subtotal / divisor : subtotal;
        
        product.laborCostCalculated = laborCost;
        product.breakevenPrice = breakevenPrice;
        product.finalPriceSuggested = finalPriceSuggested;
        product.totalCost = subtotal;
        
        // Lucro real baseado no preço definido pelo usuário
        const priceToUse = product.finalPriceSet || finalPriceSuggested;
        const taxesPaid = priceToUse * (product.taxPercent / 100);
        const profitValue = priceToUse - subtotal - taxesPaid;
        
        product.profitValue = profitValue;
        product.profitPercent = priceToUse > 0 ? (profitValue / priceToUse) * 100 : 0;
        
        await window.db.put('products', product);
      }
    }
  };
})();
