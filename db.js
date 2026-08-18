/**
 * db.js - Gerenciador de Persistência Local (IndexedDB)
 * Provê métodos assíncronos simples para salvar, ler, atualizar e excluir insumos, bases, produtos e configurações.
 */

(() => {
  const DB_NAME = 'PrecificacaoConfeitariaDB';
  const DB_VERSION = 1;

  let dbInstance = null;

  window.db = {
    /**
     * Inicializa o banco de dados IndexedDB
     */
    init() {
      return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Tabela de Insumos / Ingredientes
          if (!db.objectStoreNames.contains('ingredients')) {
            db.createObjectStore('ingredients', { keyPath: 'id' });
          }

          // Tabela de Bases / Sub-receitas
          if (!db.objectStoreNames.contains('bases')) {
            db.createObjectStore('bases', { keyPath: 'id' });
          }

          // Tabela de Produtos Finais
          if (!db.objectStoreNames.contains('products')) {
            db.createObjectStore('products', { keyPath: 'id' });
          }

          // Tabela de Configurações
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'id' });
          }
        };

        request.onsuccess = (event) => {
          dbInstance = event.target.result;
          
          // Garantir configurações padrão
          this.initDefaultSettings().then(() => resolve(dbInstance));
        };

        request.onerror = (event) => {
          console.error('Erro ao abrir o banco de dados:', event.target.error);
          reject(event.target.error);
        };
      });
    },

    /**
     * Inicializa as configurações padrões caso não existam e injeta sementes de dados de teste
     */
    async initDefaultSettings() {
      const settings = await this.get('settings', 'config');
      if (!settings) {
        await this.put('settings', {
          id: 'config',
          workHourRate: 15.00, // R$ 15.00 por hora padrão
          indirectCostDefault: 15.00, // 15% para custos operacionais padrão
          taxDefault: 5.00 // 5% de taxa de cartão padrão
        });
      }

      // Carregar dados de demonstração se a tabela de ingredientes estiver vazia
      const ingredients = await this.getAll('ingredients');
      if (ingredients.length === 0) {
        // 1. Cadastrar insumos demo
        const demoIngredients = [
          { id: 'ing-1', name: 'Leite Condensado', category: 'Laticínios', unit: 'g', packageSize: 395, price: 6.50, pricePerUnit: 6.50 / 395, updatedAt: new Date().toISOString() },
          { id: 'ing-2', name: 'Farinha de Trigo', category: 'Secos/Farinhas', unit: 'kg', packageSize: 1, price: 5.00, pricePerUnit: 5.00 / 1000, updatedAt: new Date().toISOString() },
          { id: 'ing-3', name: 'Cacau em Pó 50%', category: 'Chocolates/Cacau', unit: 'g', packageSize: 200, price: 12.00, pricePerUnit: 12.00 / 200, updatedAt: new Date().toISOString() },
          { id: 'ing-4', name: 'Manteiga sem Sal', category: 'Laticínios', unit: 'g', packageSize: 200, price: 9.50, pricePerUnit: 9.50 / 200, updatedAt: new Date().toISOString() },
          { id: 'ing-5', name: 'Caixa para Bolo Aro 15', category: 'Embalagens', unit: 'un', packageSize: 1, price: 4.50, pricePerUnit: 4.50, updatedAt: new Date().toISOString() },
          { id: 'ing-6', name: 'Prato de Bolo (Cakeboard)', category: 'Embalagens', unit: 'un', packageSize: 1, price: 3.00, pricePerUnit: 3.00, updatedAt: new Date().toISOString() },
          { id: 'ing-7', name: 'Morangos Frescos', category: 'Frutas/Frescos', unit: 'g', packageSize: 250, price: 8.00, pricePerUnit: 8.00 / 250, updatedAt: new Date().toISOString() }
        ];

        for (const ing of demoIngredients) {
          await this.put('ingredients', ing);
        }

        // 2. Cadastrar base demo (Recheio Brigadeiro)
        const brigadeiroCost = (395 * (6.50 / 395)) + (40 * (12.00 / 200)) + (20 * (9.50 / 200)); // ~9.85
        const demoBase = {
          id: 'base-1',
          name: 'Brigadeiro Tradicional',
          ingredients: [
            { ingredientId: 'ing-1', quantity: 395 },
            { ingredientId: 'ing-3', quantity: 40 },
            { ingredientId: 'ing-4', quantity: 20 }
          ],
          yieldAmount: 400,
          yieldUnit: 'g',
          totalCost: brigadeiroCost,
          costPerUnit: brigadeiroCost / 400,
          updatedAt: new Date().toISOString()
        };
        await this.put('bases', demoBase);

        // 3. Cadastrar produto demo (Bolo Decorado Morango Aro 15)
        const cpv = brigadeiroCost + 3.00 + 4.50 + (150 * (8.00 / 250)); // CPV = 22.15
        const totalCost = cpv + (cpv * 0.15) + (60 / 60 * 15.00); // 40.47
        const suggestedPrice = totalCost / (1 - 0.05 - 0.30); // 62.26
        
        const demoProduct = {
          id: 'prod-1',
          name: 'Bolo Decorado Morango Aro 15',
          items: [
            { type: 'base', itemId: 'base-1', quantity: 400 },
            { type: 'ingredient', itemId: 'ing-7', quantity: 150 },
            { type: 'package', itemId: 'ing-6', quantity: 1 },
            { type: 'package', itemId: 'ing-5', quantity: 1 }
          ],
          indirectCostPercent: 15,
          laborTimeMinutes: 60,
          laborCostCalculated: 15.00,
          profitMarginPercent: 30,
          taxPercent: 5,
          finalPriceSuggested: suggestedPrice,
          cpv: cpv,
          totalCost: totalCost,
          finalPriceSet: 65.00,
          profitValue: 65.00 - totalCost - (65.00 * 0.05),
          profitPercent: ((65.00 - totalCost - (65.00 * 0.05)) / 65.00) * 100,
          breakevenPrice: totalCost / 0.95,
          updatedAt: new Date().toISOString()
        };
        await this.put('products', demoProduct);
      }
    },

    /**
     * Obtém uma transação para a store especificada
     */
    getTransaction(storeName, mode = 'readonly') {
      if (!dbInstance) {
        throw new Error('Banco de dados não inicializado. Chame db.init() primeiro.');
      }
      return dbInstance.transaction(storeName, mode);
    },

    /**
     * Obtém um item pelo ID
     */
    get(storeName, key) {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.getTransaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const request = store.get(key);

          request.onsuccess = () => resolve(request.result || null);
          request.onerror = (e) => reject(e.target.error);
        } catch (err) {
          reject(err);
        }
      });
    },

    /**
     * Obtém todos os itens de uma tabela
     */
    getAll(storeName) {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.getTransaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const request = store.getAll();

          request.onsuccess = () => resolve(request.result || []);
          request.onerror = (e) => reject(e.target.error);
        } catch (err) {
          reject(err);
        }
      });
    },

    /**
     * Salva ou atualiza um item
     */
    put(storeName, value) {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.getTransaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = store.put(value);

          tx.oncomplete = () => resolve(value);
          tx.onerror = (e) => reject(e.target.error);
        } catch (err) {
          reject(err);
        }
      });
    },

    /**
     * Remove um item pelo ID
     */
    delete(storeName, key) {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.getTransaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = store.delete(key);

          tx.oncomplete = () => resolve(true);
          tx.onerror = (e) => reject(e.target.error);
        } catch (err) {
          reject(err);
        }
      });
    },

    /**
     * Limpa todos os dados de uma store
     */
    clear(storeName) {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.getTransaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = store.clear();

          tx.oncomplete = () => resolve(true);
          tx.onerror = (e) => reject(e.target.error);
        } catch (err) {
          reject(err);
        }
      });
    }
  };
})();
