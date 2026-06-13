window.MenuStorage = (() => {
    const STORAGE_KEY = 'menu-pwa.database.v8';
    const SHOPPING_STATE_KEY = 'menu-pwa.shopping.checkedProductIds.v1';
    const LEGACY_STORAGE_KEYS = ['menu-pwa.database.v7', 'menu-pwa.database.v6', 'menu-pwa.database.v5'];
    const DEFAULT_TAGS = [
        'сніданок',
        'вечеря',
        'салат',
        'перше',
        'гарнір',
        "м'ясо"
    ];
    const SEED_DISH_TAGS = {
        'omelet-z-syrom': ['сніданок'],
        'vivsianka-z-bananom': ['сніданок'],
        'hrechka-kurka': ['вечеря', "м'ясо", 'гарнір'],
        'pasta-bolonieze': ['вечеря', "м'ясо"],
        borshch: ['перше', "м'ясо"],
        'sup-z-frykadelkamy': ['перше', "м'ясо"],
        shaurma: ['вечеря', "м'ясо"],
        pitsa: ['вечеря', "м'ясо"],
        syrnyky: ['сніданок'],
        pelmeni: ['вечеря', "м'ясо"],
        'kartoplia-oseledets': ['вечеря', 'гарнір'],
        'rys-tunets': ['вечеря', 'гарнір']
    };
    const SEED_DATA = {
        dishes: [
            createDish('omelet-z-syrom', 'Омлет з сиром', 15, SEED_DISH_TAGS['omelet-z-syrom']),
            createDish('vivsianka-z-bananom', 'Вівсянка з бананом', 15, SEED_DISH_TAGS['vivsianka-z-bananom']),
            createDish('hrechka-kurka', 'Гречка + курка', 45, SEED_DISH_TAGS['hrechka-kurka']),
            createDish('pasta-bolonieze', 'Паста болоньєзе', 45, SEED_DISH_TAGS['pasta-bolonieze']),
            createDish('borshch', 'Борщ', 90, SEED_DISH_TAGS.borshch),
            createDish('sup-z-frykadelkamy', 'Суп з фрикадельками', 45, SEED_DISH_TAGS['sup-z-frykadelkamy']),
            createDish('shaurma', 'Шаурма', 0, SEED_DISH_TAGS.shaurma),
            createDish('pitsa', 'Піца', 0, SEED_DISH_TAGS.pitsa),
            createDish('syrnyky', 'Сирники', 30, SEED_DISH_TAGS.syrnyky),
            createDish('pelmeni', 'Пельмені', 15, SEED_DISH_TAGS.pelmeni),
            createDish('kartoplia-oseledets', 'Картопля + оселедець', 30, SEED_DISH_TAGS['kartoplia-oseledets']),
            createDish('rys-tunets', 'Рис + тунець', 30, SEED_DISH_TAGS['rys-tunets'])
        ],
        products: [
            createProduct('prod-omelet-yaitsia', 'omelet-z-syrom', 'яйця', 3, 'шт'),
            createProduct('prod-omelet-syr', 'omelet-z-syrom', 'сир', 50, 'г'),
            createProduct('prod-vivsianka-vivsianka', 'vivsianka-z-bananom', 'вівсянка', 80, 'г'),
            createProduct('prod-vivsianka-banan', 'vivsianka-z-bananom', 'банан', 1, 'шт'),
            createProduct('prod-hrechka-hrechka', 'hrechka-kurka', 'гречка', 100, 'г'),
            createProduct('prod-hrechka-kurka', 'hrechka-kurka', 'курка', 250, 'г'),
            createProduct('prod-pasta-pasta', 'pasta-bolonieze', 'паста', 120, 'г'),
            createProduct('prod-pasta-farsh', 'pasta-bolonieze', 'фарш', 200, 'г'),
            createProduct('prod-borshch-buriak', 'borshch', 'буряк', 2, 'шт'),
            createProduct('prod-borshch-kapusta', 'borshch', 'капуста', 300, 'г'),
            createProduct('prod-sup-farsh', 'sup-z-frykadelkamy', 'фарш', 250, 'г'),
            createProduct('prod-syrnyky-tvoroh', 'syrnyky', 'творог', 300, 'г'),
            createProduct('prod-pelmeni-pelmeni', 'pelmeni', 'пельмені', 1, 'пачка'),
            createProduct('prod-kartoplia-kartoplia', 'kartoplia-oseledets', 'картопля', 4, 'шт'),
            createProduct('prod-kartoplia-oseledets', 'kartoplia-oseledets', 'оселедець', 1, 'шт'),
            createProduct('prod-rys-rys', 'rys-tunets', 'рис', 100, 'г'),
            createProduct('prod-rys-tunets', 'rys-tunets', 'тунець', 1, 'банка')
        ],
        archivedDishes: [],
        archivedProducts: [],
        state: { screen: 'select', selectedDishIds: [] }
    };
    function createDish(id, name, timeMinutes, tags = []) {
        return { id, 'Страва': name, 'Час хв': timeMinutes, 'Останній раз': '', 'Опис': '', 'Фото': '', tags: normalizeTags(tags) };
    }
    function createProduct(id, dishId, productName, quantity, unit, comment = '') {
        return { id, dishId, 'Продукт': productName, 'Кількість': quantity, 'Одиниця': unit, 'Коментар': comment };
    }
    function getInitialData() {
        const database = getDatabase();
        return clone({
            dishes: database.dishes,
            products: database.products,
            archivedDishes: database.archivedDishes,
            archivedProducts: database.archivedProducts,
            state: normalizeState(database.state, database.dishes)
        });
    }
    function exportDatabase() {
        return clone(getDatabase());
    }
    function importDatabase(database) {
        const migrated = migrate(database || {});
        saveDatabase(migrated);
        return clone(migrated);
    }
    function saveState(state) {
        const database = getDatabase();
        database.state = normalizeState(state, database.dishes);
        saveDatabase(database);
    }
    function getCheckedProductIds(products = getDatabase().products) {
        const activeProductIds = new Set(products.map(product => product.id));
        return readCheckedProductIds().filter(id => activeProductIds.has(id));
    }
    function saveCheckedProductIds(productIds) {
        const activeProductIds = new Set(getDatabase().products.map(product => product.id));
        const checkedProductIds = [...new Set(Array.isArray(productIds) ? productIds : [])]
            .filter(id => activeProductIds.has(id));
        localStorage.setItem(SHOPPING_STATE_KEY, JSON.stringify(checkedProductIds));
    }
    function saveDish(dish, products) {
        const database = getDatabase();
        const id = dish.id || makeUniqueId(slugify(dish['Страва'] || 'dish'), getAllDishIds(database));
        const knownTags = collectSourceTags([...database.dishes, ...database.archivedDishes, dish]);
        const normalizedDish = normalizeDish({ ...dish, id }, database, knownTags);
        const index = database.dishes.findIndex(item => item.id === normalizedDish.id);
        if (index >= 0) database.dishes[index] = normalizedDish;
        else database.dishes.push(normalizedDish);
        database.products = database.products.filter(product => product.dishId !== normalizedDish.id);
        database.products.push(...normalizeProducts(products, normalizedDish.id, database));
        database.state = normalizeState(database.state, database.dishes);
        pruneCheckedProductIds(database.products);
        saveDatabase(database);
        return clone(normalizedDish);
    }
    function saveTags(tags) {
        const allowedTags = new Set(normalizeTags(tags));
        const database = getDatabase();
        database.dishes = database.dishes.map(dish => ({ ...dish, tags: normalizeTags(dish.tags).filter(tag => allowedTags.has(tag)) }));
        database.archivedDishes = database.archivedDishes.map(dish => ({ ...dish, tags: normalizeTags(dish.tags).filter(tag => allowedTags.has(tag)) }));
        saveDatabase(database);
    }
    function archiveDish(dishId) {
        const database = getDatabase();
        const dishIndex = database.dishes.findIndex(dish => dish.id === dishId);
        if (dishIndex < 0) return;
        const [dish] = database.dishes.splice(dishIndex, 1);
        const products = database.products.filter(product => product.dishId === dishId);
        database.products = database.products.filter(product => product.dishId !== dishId);
        database.archivedDishes.push({ ...dish, archivedAt: new Date().toISOString() });
        database.archivedProducts.push(...products);
        database.state = normalizeState({
            ...database.state,
            selectedDishIds: database.state.selectedDishIds.filter(id => id !== dishId)
        }, database.dishes);
        pruneCheckedProductIds(database.products);
        saveDatabase(database);
    }
    function restoreDish(dishId) {
        const database = getDatabase();
        const dishIndex = database.archivedDishes.findIndex(dish => dish.id === dishId);
        if (dishIndex < 0) return;
        const [dish] = database.archivedDishes.splice(dishIndex, 1);
        const products = database.archivedProducts.filter(product => product.dishId === dishId);
        delete dish.archivedAt;
        database.archivedProducts = database.archivedProducts.filter(product => product.dishId !== dishId);
        database.dishes.push(dish);
        database.products.push(...products);
        saveDatabase(database);
    }
    function clearArchive() {
        const database = getDatabase();
        database.archivedDishes = [];
        database.archivedProducts = [];
        saveDatabase(database);
    }
    function getDatabase() {
        const stored = readStoredDatabase();
        const database = stored || clone(SEED_DATA);
        const migrated = migrate(database);
        saveDatabase(migrated);
        return migrated;
    }
    function readStoredDatabase() {
        for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
            try {
                const raw = localStorage.getItem(key);
                if (raw) return JSON.parse(raw);
            } catch (error) {
                // ignore invalid localStorage entries
            }
        }
        return null;
    }
    function saveDatabase(database) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    }
    function readCheckedProductIds() {
        try {
            const value = JSON.parse(localStorage.getItem(SHOPPING_STATE_KEY) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (error) {
            return [];
        }
    }
    function pruneCheckedProductIds(products) {
        localStorage.setItem(SHOPPING_STATE_KEY, JSON.stringify(getCheckedProductIds(products)));
    }
    function migrate(database) {
        const tagSource = parseTagsContainer(database.tags);
        const sourceDishes = Array.isArray(database.dishes) ? database.dishes : [];
        const sourceArchivedDishes = Array.isArray(database.archivedDishes) ? database.archivedDishes : [];
        const sourceDishTags = normalizeDishTagsMap(tagSource.dishTags);
        const sourceAllDishes = [...sourceDishes, ...sourceArchivedDishes];
        const sourceTags = normalizeTags([...collectSourceTags(sourceAllDishes), ...Object.values(sourceDishTags).flat()]);
        const migrationTags = sourceTags.length
            ? normalizeTags([...tagSource.items, ...sourceTags])
            : tagSource.hasItems
                ? tagSource.items
                : DEFAULT_TAGS;
        const migrated = {
            dishes: [],
            products: Array.isArray(database.products) ? database.products : [],
            archivedDishes: [],
            archivedProducts: Array.isArray(database.archivedProducts) ? database.archivedProducts : [],
            state: database.state || {}
        };
        migrated.dishes = sourceDishes.map(dish => normalizeDish(dish, migrated, migrationTags, sourceDishTags));
        migrated.archivedDishes = sourceArchivedDishes.map(dish => normalizeDish(dish, migrated, migrationTags, sourceDishTags));
        migrated.products = migrated.products.map(product => normalizeProduct(product, product.dishId || findDishIdByName(product['Страва'], migrated), migrated));
        migrated.archivedProducts = migrated.archivedProducts.map(product => normalizeProduct(product, product.dishId || findDishIdByName(product['Страва'], migrated), migrated));
        migrated.state = normalizeState(migrated.state, migrated.dishes);
        return migrated;
    }
    function normalizeDish(dish = {}, database, availableTags = collectSourceTags([dish]), sourceDishTags = {}) {
        const id = dish.id || makeUniqueId(slugify(dish['Страва'] || 'dish'), getAllDishIds(database));
        const description = [dish['Опис'], dish['Коментар']]
            .map(value => String(value || '').trim())
            .filter(Boolean)
            .join('\n');
        const tags = getSourceDishTags(dish, availableTags, sourceDishTags[id] || sourceDishTags[dish.id]);
        const normalized = {
            id,
            'Страва': String(dish['Страва'] || '').trim(),
            'Час хв': toNumberOrEmpty(dish['Час хв']),
            'Останній раз': dish['Останній раз'] || '',
            'Опис': description,
            'Фото': dish['Фото'] || '',
            tags
        };
        if (dish.archivedAt) normalized.archivedAt = dish.archivedAt;
        return normalized;
    }
    function normalizeProducts(products, dishId, database) {
        const productIds = getAllProductIds(database);
        return (Array.isArray(products) ? products : [])
            .filter(product => String(product['Продукт'] || '').trim())
            .map(product => normalizeProduct(product, dishId, productIds));
    }
    function normalizeProduct(product = {}, dishId, productIdsOrDatabase) {
        const productIds = productIdsOrDatabase instanceof Set ? productIdsOrDatabase : getAllProductIds(productIdsOrDatabase);
        return {
            id: product.id || makeUniqueId('product', productIds),
            dishId,
            'Продукт': String(product['Продукт'] || '').trim(),
            'Кількість': product['Кількість'] ?? '',
            'Одиниця': String(product['Одиниця'] || '').trim(),
            'Коментар': product['Коментар'] || ''
        };
    }
    function normalizeState(state = {}, dishes = []) {
        const activeIds = new Set(dishes.map(dish => dish.id));
        const selectedDishIds = Array.isArray(state.selectedDishIds)
            ? state.selectedDishIds
            : Array.isArray(state.selectedDishes)
                ? state.selectedDishes.map(name => dishes.find(dish => dish['Страва'] === name)?.id).filter(Boolean)
                : [];
        return {
            screen: ['select', 'result'].includes(state.screen) ? state.screen : 'select',
            selectedDishIds: [...new Set(selectedDishIds)].filter(id => activeIds.has(id))
        };
    }
    function parseTagsContainer(tags) {
        if (Array.isArray(tags)) return { items: normalizeTags(tags), dishTags: {}, hasItems: true };
        if (tags && typeof tags === 'object') {
            const itemsSource = Object.prototype.hasOwnProperty.call(tags, 'items')
                ? tags.items
                : Object.prototype.hasOwnProperty.call(tags, 'list')
                    ? tags.list
                    : Object.prototype.hasOwnProperty.call(tags, 'tags')
                        ? tags.tags
                        : undefined;
            return {
                items: normalizeTags(itemsSource),
                dishTags: normalizeDishTagsMap(tags.dishTags || tags.byDishId || tags.dishes),
                hasItems: itemsSource !== undefined
            };
        }
        return { items: [], dishTags: {}, hasItems: false };
    }
    function normalizeTags(tags) {
        const normalized = (Array.isArray(tags) ? tags : [])
            .map(tag => String(tag || '').trim())
            .filter(Boolean);
        return [...new Set(normalized)];
    }
    function normalizeDishTagsMap(dishTags) {
        if (!dishTags || typeof dishTags !== 'object' || Array.isArray(dishTags)) return {};
        return Object.fromEntries(
            Object.entries(dishTags)
                .map(([dishId, tags]) => [dishId, normalizeTags(tags)])
                .filter(([dishId]) => dishId)
        );
    }
    function collectSourceTags(dishes) {
        return normalizeTags(dishes.flatMap(dish => normalizeTags(dish?.tags || dish?.['теги'])));
    }
    function getSourceDishTags(dish, availableTags, storedTags = []) {
        const hasExplicitTags = Array.isArray(dish?.tags) || Array.isArray(dish?.['теги']);
        const explicitTags = normalizeTags(Array.isArray(dish?.tags) ? dish.tags : dish?.['теги']);
        const persistedTags = normalizeTags(storedTags);
        const legacyTags = normalizeTags(availableTags.filter(tag => isTrue(dish?.[tag])));
        const tags = hasExplicitTags ? explicitTags : persistedTags.length ? persistedTags : legacyTags;
        return tags.filter(tag => availableTags.includes(tag));
    }
    function findDishIdByName(name, database) {
        return [...database.dishes, ...database.archivedDishes].find(dish => dish['Страва'] === name)?.id || '';
    }
    function getAllDishIds(database) {
        return new Set([...(database.dishes || []), ...(database.archivedDishes || [])].map(dish => dish.id).filter(Boolean));
    }
    function getAllProductIds(database) {
        return new Set([...(database.products || []), ...(database.archivedProducts || [])].map(product => product.id).filter(Boolean));
    }
    function makeUniqueId(base, existingIds) {
        const fallback = base || 'item';
        let candidate = fallback;
        let index = 2;
        while (existingIds.has(candidate)) {
            candidate = `${fallback}-${index}`;
            index += 1;
        }
        existingIds.add(candidate);
        return candidate;
    }
    function slugify(value) {
        const translit = {
            а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i',
            к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
            ч: 'ch', ш: 'sh', щ: 'shch', ю: 'iu', я: 'ia', ь: '', ъ: '', ё: 'e', ы: 'y', э: 'e'
        };
        return String(value || '')
            .toLowerCase()
            .split('')
            .map(char => translit[char] ?? char)
            .join('')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'dish';
    }
    function toNumberOrEmpty(value) {
        if (value === '' || value === null || value === undefined) return '';
        const number = Number(value);
        return Number.isFinite(number) ? number : '';
    }
    function isTrue(value) {
        return value === true || String(value).toUpperCase() === 'TRUE';
    }
    function clone(value) {
        return structuredClone(value);
    }
    return {
        getInitialData,
        exportDatabase,
        importDatabase,
        saveState,
        getCheckedProductIds,
        saveCheckedProductIds,
        saveDish,
        saveTags,
        archiveDish,
        restoreDish,
        clearArchive
    };
})();


