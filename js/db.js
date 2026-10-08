/**
 * db.js - Gerenciador de Persistência Local (IndexedDB com fallback para LocalStorage)
 * Provê métodos assíncronos simples para salvar, ler, atualizar e excluir insumos, bases, produtos e configurações.
 */

(() => {
  const DB_NAME = 'PrecificacaoConfeitariaDB';
  const DB_VERSION = 1;

  let dbInstance = null;
  let useLocalStorageFallback = false;

  // Banco de dados simulado no LocalStorage para caso o IndexedDB esteja bloqueado/indisponível
  const lsDb = {
    get(storeName, key) {
      if (storeName === 'settings') {
        const data = localStorage.getItem('db_settings_config');
        return data ? JSON.parse(data) : null;
      }
      const data = localStorage.getItem('db_' + storeName);
      const list = data ? JSON.parse(data) : [];
      return list.find(item => item.id === key) || null;
    },
    getAll(storeName) {
      if (storeName === 'settings') return [];
      const data = localStorage.getItem('db_' + storeName);
      return data ? JSON.parse(data) : [];
    },
    put(storeName, value) {
      if (storeName === 'settings') {
        localStorage.setItem('db_settings_config', JSON.stringify(value));
        return value;
      }
      const data = localStorage.getItem('db_' + storeName);
      let list = data ? JSON.parse(data) : [];
      const idx = list.findIndex(item => item.id === value.id);
      if (idx > -1) {
        list[idx] = value;
      } else {
        list.push(value);
      }
      localStorage.setItem('db_' + storeName, JSON.stringify(list));
      return value;
    },
    delete(storeName, key) {
      if (storeName === 'settings') {
        localStorage.removeItem('db_settings_config');
        return true;
      }
      const data = localStorage.getItem('db_' + storeName);
      let list = data ? JSON.parse(data) : [];
      list = list.filter(item => item.id !== key);
      localStorage.setItem('db_' + storeName, JSON.stringify(list));
      return true;
    }
  };

  window.db = {
    /**
     * Inicializa o banco de dados
     */
    init() {
      return new Promise((resolve) => {
        try {
          if (!window.indexedDB) {
            console.warn('IndexedDB não é suportado pelo navegador. Usando fallback LocalStorage.');
            useLocalStorageFallback = true;
            window.db.initDefaultSettings().then(() => resolve(null));
            return;
          }

          const request = indexedDB.open(DB_NAME, DB_VERSION);

          request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('ingredients')) {
              db.createObjectStore('ingredients', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('bases')) {
              db.createObjectStore('bases', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('products')) {
              db.createObjectStore('products', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('settings')) {
              db.createObjectStore('settings', { keyPath: 'id' });
            }
          };

          request.onsuccess = (event) => {
            dbInstance = event.target.result;
            window.db.initDefaultSettings().then(() => resolve(dbInstance));
          };

          request.onerror = (event) => {
            console.warn('Permissão negada ou erro ao abrir IndexedDB. Usando fallback LocalStorage:', event.target.error);
            useLocalStorageFallback = true;
            window.db.initDefaultSettings().then(() => resolve(null));
          };
        } catch (err) {
          console.warn('Exceção ao abrir IndexedDB. Usando fallback LocalStorage:', err);
          useLocalStorageFallback = true;
          window.db.initDefaultSettings().then(() => resolve(null));
        }
      });
    },

    /**
     * Inicializa as configurações padrões caso não existam e injeta sementes de dados de teste
     */
    async initDefaultSettings() {
      const settings = await window.db.get('settings', 'config');
      if (!settings) {
        await window.db.put('settings', {
          id: 'config',
          workHourRate: 15.00, // R$ 15.00 por hora padrão
          indirectCostDefault: 15.00, // 15% para custos operacionais padrão
          taxDefault: 5.00 // 5% de taxa de cartão padrão
        });
      }

      // Carregar dados de demonstração se a tabela de ingredientes estiver vazia
      // Carregar dados de demonstração se a tabela de ingredientes estiver vazia
      const ingredients = await window.db.getAll('ingredients');
      if (ingredients.length === 0) {
        // 1. Cadastrar insumos demo
        const demoIngredients = [
          { id: 'ing-1', name: 'Leite Condensado', category: 'Laticínios', unit: 'caixa_lata', packageSize: 1, packageContentWeight: 395, price: 6.50, pricePerUnit: 6.50 / 395, cupWeight: 300, spoonSopaWeight: 20, spoonSobremesaWeight: 13, spoonChaWeight: 7, updatedAt: new Date().toISOString() },
          { id: 'ing-2', name: 'Farinha de Trigo', category: 'Secos/Farinhas', unit: 'kg', packageSize: 1, price: 5.00, pricePerUnit: 5.00 / 1000, cupWeight: 120, spoonSopaWeight: 10, spoonSobremesaWeight: 7, spoonChaWeight: 3, updatedAt: new Date().toISOString() },
          { id: 'ing-3', name: 'Cacau em Pó 50%', category: 'Chocolates/Cacau', unit: 'g', packageSize: 200, price: 12.00, pricePerUnit: 12.00 / 200, cupWeight: 90, spoonSopaWeight: 6, spoonSobremesaWeight: 4, spoonChaWeight: 2, updatedAt: new Date().toISOString() },
          { id: 'ing-4', name: 'Manteiga sem Sal', category: 'Laticínios', unit: 'g', packageSize: 200, price: 9.50, pricePerUnit: 9.50 / 200, cupWeight: 200, spoonSopaWeight: 12, spoonSobremesaWeight: 8, spoonChaWeight: 4, updatedAt: new Date().toISOString() },
          { id: 'ing-5', name: 'Caixa para Bolo Aro 15', category: 'Embalagens', unit: 'un', packageSize: 1, price: 4.50, pricePerUnit: 4.50, updatedAt: new Date().toISOString() },
          { id: 'ing-6', name: 'Prato de Bolo (Cakeboard)', category: 'Embalagens', unit: 'un', packageSize: 1, price: 3.00, pricePerUnit: 3.00, updatedAt: new Date().toISOString() },
          { id: 'ing-7', name: 'Morangos Frescos', category: 'Frutas/Frescos', unit: 'g', packageSize: 250, price: 8.00, pricePerUnit: 8.00 / 250, cupWeight: 150, spoonSopaWeight: 15, spoonSobremesaWeight: 10, spoonChaWeight: 5, updatedAt: new Date().toISOString() },
          { id: 'ing-8', name: 'Ovos', category: 'Ovos/Fermentos', unit: 'duzia', packageSize: 2.5, price: 15.00, pricePerUnit: 15.00 / 30, updatedAt: new Date().toISOString() },
          { id: 'ing-9', name: 'Açúcar Refinado', category: 'Açúcares/Adoçantes', unit: 'kg', packageSize: 1, price: 4.50, pricePerUnit: 4.50 / 1000, cupWeight: 180, spoonSopaWeight: 12, spoonSobremesaWeight: 8, spoonChaWeight: 4, updatedAt: new Date().toISOString() }
        ];

        for (const ing of demoIngredients) {
          await window.db.put('ingredients', ing);
        }

        // 2. Cadastrar bases demo
        const brigadeiroCost = (395 * (6.50 / 395)) + (40 * (12.00 / 200)) + (20 * (9.50 / 200)); // ~9.85
        const demoBase1 = {
          id: 'base-1',
          name: 'Brigadeiro Tradicional',
          ingredients: [
            { ingredientId: 'ing-1', quantity: 395, originalQty: 1, originalUnit: 'caixa_lata' },
            { ingredientId: 'ing-3', quantity: 40, originalQty: 40, originalUnit: 'g' },
            { ingredientId: 'ing-4', quantity: 20, originalQty: 20, originalUnit: 'g' }
          ],
          yieldType: 'peso',
          yieldAmount: 400,
          yieldUnit: 'g',
          totalCost: brigadeiroCost,
          costPerUnit: brigadeiroCost / 400,
          updatedAt: new Date().toISOString()
        };
        await window.db.put('bases', demoBase1);

        const poloCost = (240 * (5.00 / 1000)) + (180 * (4.50 / 1000)) + (4 * 0.50) + (50 * (9.50 / 200)); // 1.20 + 0.81 + 2.00 + 2.37 = 6.38
        const demoBase2 = {
          id: 'base-2',
          name: 'Massa Pão de Ló (Aro 15)',
          ingredients: [
            { ingredientId: 'ing-2', quantity: 240, originalQty: 2, originalUnit: 'xicara' },
            { ingredientId: 'ing-9', quantity: 180, originalQty: 1, originalUnit: 'xicara' },
            { ingredientId: 'ing-8', quantity: 4, originalQty: 4, originalUnit: 'un' },
            { ingredientId: 'ing-4', quantity: 50, originalQty: 50, originalUnit: 'g' }
          ],
          yieldType: 'forma',
          yieldAmount: 2,
          yieldUnit: 'Forma Aro 15',
          yieldPanQty: 2,
          yieldPanSize: 'Aro 15',
          totalCost: poloCost,
          costPerUnit: poloCost / 2,
          updatedAt: new Date().toISOString()
        };
        await window.db.put('bases', demoBase2);

        // 3. Cadastrar produto demo (Bolo Decorado Morango Aro 15)
        const cpv = (poloCost / 2) + brigadeiroCost + 3.00 + 4.50 + (150 * (8.00 / 250)); // CPV = 3.19 + 9.85 + 3.00 + 4.50 + 4.80 = 25.34
        const totalCost = cpv + (cpv * 0.15) + (60 / 60 * 15.00); // 25.34 + 3.80 + 15.00 = 44.14
        const suggestedPrice = totalCost / (1 - 0.05 - 0.30); // 44.14 / 0.65 = 67.91
        
        const demoProduct = {
          id: 'prod-1',
          name: 'Bolo Decorado Morango Aro 15',
          items: [
            { type: 'base', itemId: 'base-2', quantity: 1, originalQty: 1, originalUnit: 'forma' },
            { type: 'base', itemId: 'base-1', quantity: 400, originalQty: 400, originalUnit: 'g' },
            { type: 'ingredient', itemId: 'ing-7', quantity: 150, originalQty: 1, originalUnit: 'xicara' },
            { type: 'package', itemId: 'ing-6', quantity: 1, originalQty: 1, originalUnit: 'un' },
            { type: 'package', itemId: 'ing-5', quantity: 1, originalQty: 1, originalUnit: 'un' }
          ],
          indirectCostPercent: 15,
          laborTimeMinutes: 60,
          laborCostCalculated: 15.00,
          profitMarginPercent: 30,
          taxPercent: 5,
          finalPriceSuggested: suggestedPrice,
          cpv: cpv,
          totalCost: totalCost,
          finalPriceSet: 70.00,
          profitValue: 70.00 - totalCost - (70.00 * 0.05),
          profitPercent: ((70.00 - totalCost - (70.00 * 0.05)) / 70.00) * 100,
          breakevenPrice: totalCost / 0.95,
          updatedAt: new Date().toISOString()
        };
        await window.db.put('products', demoProduct);
      }
    },

    /**
     * Obtém uma transação para a store especificada
     */
    getTransaction(storeName, mode = 'readonly') {
      if (useLocalStorageFallback) return null;
      if (!dbInstance) {
        throw new Error('Banco de dados não inicializado. Chame db.init() primeiro.');
      }
      return dbInstance.transaction(storeName, mode);
    },

    /**
     * Obtém um item pelo ID
     */
    get(storeName, key) {
      if (useLocalStorageFallback) {
        return Promise.resolve(lsDb.get(storeName, key));
      }
      return new Promise((resolve, reject) => {
        try {
          const tx = window.db.getTransaction(storeName, 'readonly');
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
      if (useLocalStorageFallback) {
        return Promise.resolve(lsDb.getAll(storeName));
      }
      return new Promise((resolve, reject) => {
        try {
          const tx = window.db.getTransaction(storeName, 'readonly');
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
      if (useLocalStorageFallback) {
        return Promise.resolve(lsDb.put(storeName, value));
      }
      return new Promise((resolve, reject) => {
        try {
          const tx = window.db.getTransaction(storeName, 'readwrite');
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
      if (useLocalStorageFallback) {
        return Promise.resolve(lsDb.delete(storeName, key));
      }
      return new Promise((resolve, reject) => {
        try {
          const tx = window.db.getTransaction(storeName, 'readwrite');
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
      if (useLocalStorageFallback) {
        if (storeName === 'settings') {
          localStorage.removeItem('db_settings_config');
        } else {
          localStorage.removeItem('db_' + storeName);
        }
        return Promise.resolve(true);
      }
      return new Promise((resolve, reject) => {
        try {
          const tx = window.db.getTransaction(storeName, 'readwrite');
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
