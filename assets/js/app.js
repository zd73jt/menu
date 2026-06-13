(() => {
    const ALLOWED_PERSISTED_SCREENS = ['select', 'result'];

    let allDishes = [];
    let allProducts = [];
    let archivedDishes = [];
    let allTags = [];
    let selectedTags = new Set();
    let selectedDishIds = new Set();
    let currentScreen = 'select';

    document.addEventListener('DOMContentLoaded', initApp);

    async function initApp() {
        await MenuI18n.init();
        bindLanguageSwitcher();
        bindEvents();
        loadFromStorage();
    }

    function bindEvents() {
        document.addEventListener('click', event => {
            const actionElement = event.target.closest('[data-action]');

            if (!actionElement) {
                if (!event.target.closest('.tag-multiselect')) {
                    closeTagMultiselect();
                }
                return;
            }

            const { action, tag, dishId, productId } = actionElement.dataset;

            if (action === 'toggle-tag') toggleTag(tag);
            if (action === 'toggle-dish') toggleDish(dishId);
            if (action === 'remove-dish') removeDish(dishId);
            if (action === 'clear-selected') clearSelected();
            if (action === 'open-result') openResultScreen();
            if (action === 'back-to-select') backToSelectScreen();
            if (action === 'open-manage') openManageScreen();
            if (action === 'add-dish') openEditDishScreen();
            if (action === 'edit-dish') openEditDishScreen(dishId);
            if (action === 'archive-dish') archiveDish(dishId);
            if (action === 'open-archive') openArchiveScreen();
            if (action === 'restore-dish') restoreDish(dishId);
            if (action === 'clear-archive') clearArchive();
            if (action === 'add-product-row') addProductRow();
            if (action === 'remove-product-row') removeProductRow(productId);
            if (action === 'toggle-tag-dropdown') toggleTagMultiselect();
            if (action === 'select-form-tag') selectFormTag(tag);
            if (action === 'remove-form-tag') removeFormTag(tag);
            if (action === 'add-custom-form-tag') addCustomFormTag();
            if (action === 'time-up') adjustTimePicker(15);
            if (action === 'time-down') adjustTimePicker(-15);
            if (action === 'open-tags-manage') openTagsManageScreen();
            if (action === 'delete-tag') deleteTag(tag);
            if (action === 'export-data') exportData();
            if (action === 'import-data') openDataScreen();
            if (action === 'apply-import-json') applyImportJsonFromTextarea();
            if (action === 'choose-import-file') openImportDialog();

        });

        document.addEventListener('change', event => {
            if (event.target.id === 'importFileInput') {
                importDataFromFile(event.target.files?.[0]);
                event.target.value = '';
            }
        });

        document.addEventListener('keydown', event => {
            if (event.target.id === 'customTagInput' && event.key === 'Enter') {
                event.preventDefault();
                addCustomFormTag();
            }
        });

        document.addEventListener('submit', event => {
            if (event.target.id === 'dishForm') {
                event.preventDefault();
                saveDishFromForm(event.target);
            }
        });
    }

    function loadFromStorage() {
        showLocalLoaders();

        try {
            init(MenuStorage.getInitialData());
        } catch (error) {
            renderError(error);
        }
    }

    function reloadData() {
        init(MenuStorage.getInitialData());
    }

    function init(data) {
        allDishes = Array.isArray(data?.dishes)
            ? data.dishes.filter(dish => dish.id && dish['Страва'])
            : [];

        allProducts = Array.isArray(data?.products) ? data.products : [];
        archivedDishes = Array.isArray(data?.archivedDishes) ? data.archivedDishes : [];

        allTags = collectTags([...allDishes, ...archivedDishes]);

        const state = data?.state || {};
        currentScreen = ALLOWED_PERSISTED_SCREENS.includes(state.screen) ? state.screen : 'select';
        selectedTags = new Set();

        const activeDishIds = new Set(allDishes.map(dish => dish.id));
        selectedDishIds = new Set(
            Array.isArray(state.selectedDishIds)
                ? state.selectedDishIds.filter(id => activeDishIds.has(id))
                : []
        );

        if (selectedDishIds.size === 0) {
            currentScreen = 'select';
        }

        saveState();
        renderAll();
        hideSaving();
    }

    function collectTags(dishes) {
        const tags = new Set();

        dishes.forEach(dish => {
            getDishTags(dish).forEach(tag => tags.add(tag));
        });

        return [...tags];
    }

    function renderAll() {
        renderScreen();
        renderTagSelector();
        renderSelected();
        renderDishes();

        if (currentScreen === 'result') renderResult();
        if (currentScreen === 'manage') renderManage();
        if (currentScreen === 'archive') renderArchive();
        if (currentScreen === 'tagsManage') renderTagsManage();
        if (currentScreen === 'data') renderDataScreen();
    }

    function saveState(message) {
        if (message) showSaving(message);

        MenuStorage.saveState({
            screen: ALLOWED_PERSISTED_SCREENS.includes(currentScreen) ? currentScreen : 'select',
            selectedDishIds: [...selectedDishIds]
        });

        if (message) hideSavingSoon();
    }

    function renderScreen() {
        ['select', 'result', 'manage', 'editDish', 'archive', 'tagsManage', 'data'].forEach(screen => {
            const element = document.getElementById(`${screen}Screen`);
            if (element) element.classList.toggle('hidden', currentScreen !== screen);
        });
    }

    function renderTagSelector() {
        const tagSelector = document.getElementById('tagSelector');

        if (allTags.length === 0) {
            tagSelector.innerHTML = `<div class="empty">${escapeHtml(MenuI18n.t('empty.dishes'))}</div>`;
            return;
        }

        tagSelector.innerHTML = allTags.map(tag => `
            <button class="tag-button ${selectedTags.has(tag) ? 'selected' : ''}" type="button" data-action="toggle-tag" data-tag="${escapeHtml(tag)}">
                ${escapeHtml(tag)}
            </button>
        `).join('');
    }

    function toggleTag(tag) {
        if (selectedTags.has(tag)) selectedTags.delete(tag);
        else selectedTags.add(tag);

        renderTagSelector();
        renderDishes();
    }

    function toggleDish(dishId) {
        if (selectedDishIds.has(dishId)) selectedDishIds.delete(dishId);
        else selectedDishIds.add(dishId);

        saveState(MenuI18n.t('loader.selected'));
        renderSelected();
        renderDishes();
        if (currentScreen === 'result') renderResult();
    }

    function removeDish(dishId) {
        selectedDishIds.delete(dishId);
        saveState(MenuI18n.t('loader.selected'));
        renderSelected();
        renderDishes();

        if (selectedDishIds.size === 0) {
            currentScreen = 'select';
            saveState();
            renderScreen();
        }

        if (currentScreen === 'result') renderResult();
    }

    function clearSelected() {
        selectedDishIds.clear();
        currentScreen = 'select';
        saveState(MenuI18n.t('loader.selected'));
        renderAll();
    }

    function openResultScreen() {
        if (selectedDishIds.size === 0) return;

        currentScreen = 'result';
        saveState();
        renderScreen();
        renderResult();
    }

    function backToSelectScreen() {
        currentScreen = 'select';
        saveState();
        renderAll();
    }

    function openManageScreen() {
        currentScreen = 'manage';
        renderScreen();
        renderManage();
    }

    function openArchiveScreen() {
        currentScreen = 'archive';
        renderScreen();
        renderArchive();
    }

    function openTagsManageScreen() {
        currentScreen = 'tagsManage';
        renderScreen();
        renderTagsManage();
    }

    function openDataScreen() {
        currentScreen = 'data';
        renderScreen();
        renderDataScreen();
    }

    function openEditDishScreen(dishId = '') {
        currentScreen = 'editDish';
        renderScreen();
        renderDishForm(dishId);
    }

    function renderSelected() {
        const selectedList = document.getElementById('selectedList');
        const clearButton = document.getElementById('clearButton');
        const chooseButton = document.getElementById('chooseButton');
        const selectedDishes = getSelectedDishes();

        clearButton.style.display = selectedDishes.length ? 'inline-block' : 'none';
        chooseButton.disabled = selectedDishes.length === 0;

        if (selectedDishes.length === 0) {
            selectedList.innerHTML = `<div class="empty">${escapeHtml(MenuI18n.t('empty.selected'))}</div>`;
            return;
        }

        selectedList.innerHTML = selectedDishes.map(dish => `
            <div class="selected-dish">
                <span>${escapeHtml(dish['Страва'])}</span>
                <button class="remove-button" type="button" data-action="remove-dish" data-dish-id="${escapeHtml(dish.id)}" aria-label="${escapeHtml(MenuI18n.t('button.clear'))}">×</button>
            </div>
        `).join('');
    }

    function renderDishes() {
        const content = document.getElementById('content');
        const filteredDishes = allDishes.filter(dish => {
            if (selectedTags.size === 0) return true;
            const dishTags = getDishTags(dish);
            return [...selectedTags].every(tag => dishTags.includes(tag));
        });

        document.getElementById('counter').textContent = MenuI18n.t('counter.shown', {
            shown: filteredDishes.length,
            total: allDishes.length
        });

        if (filteredDishes.length === 0) {
            content.innerHTML = `<p class="empty">${escapeHtml(MenuI18n.t('empty.dishes'))}</p>`;
            return;
        }

        content.innerHTML = filteredDishes.map(dish => renderDishCard(dish)).join('');
    }

    function renderDishCard(dish) {
        const selectedClass = selectedDishIds.has(dish.id) ? 'already-selected' : '';

        return `
            <button class="dish ${selectedClass}" type="button" data-action="toggle-dish" data-dish-id="${escapeHtml(dish.id)}">
                <div class="title">${escapeHtml(dish['Страва'])}</div>
                <div class="meta">${renderDishMeta(dish)}</div>
                <div class="dish-tags">${renderDishTags(dish)}</div>
            </button>
        `;
    }

    function renderDishTags(dish) {
        return getDishTags(dish)
            .map(tag => `<span class="dish-tag">${escapeHtml(tag)}</span>`)
            .join('');
    }

    function renderDishMeta(dish) {
        return formatDuration(dish['Час хв']);
    }

    function renderResult() {
        const resultContent = document.getElementById('resultContent');
        const selectedDishes = getSelectedDishes();

        if (selectedDishes.length === 0) {
            resultContent.innerHTML = `<div class="empty">${escapeHtml(MenuI18n.t('empty.result'))}</div>`;
            return;
        }

        resultContent.innerHTML = selectedDishes.map(dish => {
            const products = allProducts.filter(product => product.dishId === dish.id);
            const productsHtml = products.length
                ? products.map(product => `
                    <li>
                        ${escapeHtml(product['Продукт'])}
                        ${product['Кількість'] ? ` — ${escapeHtml(product['Кількість'])}` : ''}
                        ${product['Одиниця'] ? escapeHtml(product['Одиниця']) : ''}
                    </li>
                `).join('')
                : `<li>${escapeHtml(MenuI18n.t('empty.products'))}</li>`;

            return `
                <div class="product-block">
                    <div class="title">${escapeHtml(dish['Страва'])}</div>
                    <ul class="product-list">${productsHtml}</ul>
                </div>
            `;
        }).join('');
    }

    function renderManage() {
        const manageContent = document.getElementById('manageContent');

        if (allDishes.length === 0) {
            manageContent.innerHTML = `<div class="empty">${escapeHtml(MenuI18n.t('empty.manage'))}</div>`;
            return;
        }

        manageContent.innerHTML = allDishes.map(dish => `
            <div class="manage-dish">
                <div>
                    <div class="title">${escapeHtml(dish['Страва'])}</div>
                    <div class="meta">${renderDishMeta(dish)}</div>
                    <div class="dish-tags">${renderDishTags(dish)}</div>
                </div>
                <div class="item-actions">
                    <button class="button secondary" type="button" data-action="edit-dish" data-dish-id="${escapeHtml(dish.id)}">${escapeHtml(MenuI18n.t('button.edit'))}</button>
                    <button class="button danger" type="button" data-action="archive-dish" data-dish-id="${escapeHtml(dish.id)}">${escapeHtml(MenuI18n.t('button.delete'))}</button>
                </div>
            </div>
        `).join('');
    }

    function renderArchive() {
        const archiveContent = document.getElementById('archiveContent');

        if (archivedDishes.length === 0) {
            archiveContent.innerHTML = `<div class="empty">${escapeHtml(MenuI18n.t('empty.archive'))}</div>`;
            return;
        }

        archiveContent.innerHTML = archivedDishes.map(dish => `
            <div class="manage-dish archived">
                <div>
                    <div class="title">${escapeHtml(dish['Страва'])}</div>
                    <div class="meta">${renderDishMeta(dish)}</div>
                    <div class="dish-tags">${renderDishTags(dish)}</div>
                </div>
                <div class="item-actions">
                    <button class="button" type="button" data-action="restore-dish" data-dish-id="${escapeHtml(dish.id)}">${escapeHtml(MenuI18n.t('button.restore'))}</button>
                </div>
            </div>
        `).join('');
    }

    function renderTagsManage() {
        const tagsManageContent = document.getElementById('tagsManageContent');

        if (!tagsManageContent) return;

        if (allTags.length === 0) {
            tagsManageContent.innerHTML = `<div class="empty">${escapeHtml(MenuI18n.t('empty.tagsManage'))}</div>`;
            return;
        }

        tagsManageContent.innerHTML = allTags.map(tag => `
            <div class="tag-manage-item">
                <span class="dish-tag">${escapeHtml(tag)}</span>
                <button class="button danger" type="button" data-action="delete-tag" data-tag="${escapeHtml(tag)}">${escapeHtml(MenuI18n.t('button.delete'))}</button>
            </div>
        `).join('');
    }

    function deleteTag(tag) {
        allTags = allTags.filter(item => item !== tag);
        selectedTags.delete(tag);
        MenuStorage.saveTags(allTags);
        reloadData();
        currentScreen = 'tagsManage';
        renderScreen();
        renderTagsManage();
    }

    function renderDataScreen() {
        const textarea = document.getElementById('importJsonTextarea');
        const status = document.getElementById('importStatus');

        if (textarea) {
            textarea.value = JSON.stringify(MenuStorage.exportDatabase(), null, 2);
        }

        if (status) {
            status.textContent = '';
            status.classList.add('hidden');
            status.classList.remove('error');
        }
    }

    function exportData() {
        const database = MenuStorage.exportDatabase();
        const blob = new Blob([JSON.stringify(database, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = `menu-pwa-${date}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function openImportDialog() {
        document.getElementById('importFileInput')?.click();
    }

    function applyImportJsonFromTextarea() {
        const textarea = document.getElementById('importJsonTextarea');
        applyImportJson(textarea?.value || '');
    }

    function applyImportJson(jsonText) {
        try {
            const database = JSON.parse(String(jsonText || '{}'));
            MenuStorage.importDatabase(database);
            reloadData();
            currentScreen = 'data';
            renderScreen();
            renderDataScreen();
            showImportStatus(MenuI18n.t('import.success'));
        } catch (error) {
            showImportStatus(`${MenuI18n.t('import.error')}: ${error?.message || error}`, true);
        }
    }

    function importDataFromFile(file) {
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            const text = String(reader.result || '{}');
            const textarea = document.getElementById('importJsonTextarea');
            if (textarea) textarea.value = text;
            applyImportJson(text);
        };

        reader.onerror = () => {
            showImportStatus(MenuI18n.t('import.error'), true);
        };

        reader.readAsText(file);
    }

    function showImportStatus(message, isError = false) {
        const status = document.getElementById('importStatus');
        if (!status) return;

        status.textContent = message;
        status.classList.toggle('error', isError);
        status.classList.remove('hidden');
    }

    function renderDishForm(dishId = '') {
        const dish = allDishes.find(item => item.id === dishId) || createEmptyDish();
        const products = dishId
            ? allProducts.filter(product => product.dishId === dishId)
            : [createEmptyProduct('')];
        const title = document.getElementById('editDishTitle');
        const content = document.getElementById('editDishContent');

        title.textContent = MenuI18n.t(dishId ? 'edit.title' : 'add.title');
        content.innerHTML = `
            <form id="dishForm" class="dish-form" data-dish-id="${escapeHtml(dish.id)}">
                <label>
                    ${escapeHtml(MenuI18n.t('field.name'))}
                    <input name="name" required value="${escapeHtml(dish['Страва'])}">
                </label>
                <label>
                    ${escapeHtml(MenuI18n.t('field.time'))}
                    ${renderTimePicker(dish['Час хв'])}
                </label>
                <label>
                    ${escapeHtml(MenuI18n.t('field.description'))}
                    <textarea name="description">${escapeHtml(dish['Опис'])}</textarea>
                </label>
                <div class="dish-form-field">
                    <div>${escapeHtml(MenuI18n.t('tags.title'))}</div>
                    ${renderTagMultiselect(dish)}
                </div>
                <div class="form-section-title section-title">${escapeHtml(MenuI18n.t('products.title'))}</div>
                <div id="productRows" class="product-rows">
                    ${products.map(renderProductRow).join('')}
                </div>
                <div class="form-actions">
                    <button class="button secondary" type="button" data-action="add-product-row">${escapeHtml(MenuI18n.t('button.addProduct'))}</button>
                    <button class="button" type="submit">${escapeHtml(MenuI18n.t('button.save'))}</button>
                </div>
            </form>
        `;
    }

    function renderTimePicker(value) {
        const minutes = normalizePickerMinutes(value);

        return `
            <div class="time-picker">
                <input id="timeInput" type="hidden" name="time" value="${minutes}">
                <div id="timeDisplay" class="time-picker-display">${escapeHtml(formatDuration(minutes))}</div>
                <div class="time-picker-buttons">
                    <button class="time-picker-button" type="button" data-action="time-up" aria-label="${escapeHtml(MenuI18n.t('button.timeUp'))}">▲</button>
                    <button class="time-picker-button" type="button" data-action="time-down" aria-label="${escapeHtml(MenuI18n.t('button.timeDown'))}">▼</button>
                </div>
            </div>
        `;
    }

    function adjustTimePicker(delta) {
        const input = document.getElementById('timeInput');

        if (!input) return;

        const nextValue = Math.max(0, normalizePickerMinutes(input.value) + delta);
        input.value = String(nextValue);
        updateTimePickerDisplay(nextValue);
    }

    function updateTimePickerDisplay(value) {
        const display = document.getElementById('timeDisplay');
        if (display) display.textContent = formatDuration(value);
    }

    function normalizePickerMinutes(value) {
        const number = Number(value || 0);
        if (!Number.isFinite(number) || number <= 0) return 0;
        return Math.round(number / 15) * 15;
    }

    function renderTagMultiselect(dish) {
        const selected = getDishTags(dish);
        const available = allTags.filter(tag => !selected.includes(tag));

        return `
            <div class="tag-multiselect">
                <div class="tag-multiselect-control" data-action="toggle-tag-dropdown">
                    <div id="selectedFormTags" class="selected-form-tags">
                        ${selected.length ? selected.map(renderSelectedFormTag).join('') : `<span class="tag-placeholder">${escapeHtml(MenuI18n.t('field.tagsPlaceholder'))}</span>`}
                    </div>
                    <span class="tag-caret">▾</span>
                </div>
                <div id="tagDropdown" class="tag-dropdown hidden">
                    <div class="custom-tag-row">
                        <input id="customTagInput" type="text" autocomplete="off" placeholder="${escapeHtml(MenuI18n.t('field.newTag'))}">
                        <button class="button secondary" type="button" data-action="add-custom-form-tag">${escapeHtml(MenuI18n.t('button.addTag'))}</button>
                    </div>
                    ${available.length ? available.map(tag => `
                        <button class="tag-option" type="button" data-action="select-form-tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>
                    `).join('') : `<div class="tag-option empty-option">${escapeHtml(MenuI18n.t('empty.tags'))}</div>`}
                </div>
            </div>
        `;
    }

    function renderSelectedFormTag(tag) {
        const colorIndex = Math.max(0, allTags.indexOf(tag)) % 6;

        return `
            <button class="selected-form-tag tag-color-${colorIndex}" type="button" data-action="remove-form-tag" data-tag="${escapeHtml(tag)}">
                ${escapeHtml(tag)} <span>×</span>
                <input type="hidden" name="tags" value="${escapeHtml(tag)}">
            </button>
        `;
    }

    function renderProductRow(product) {
        const id = product.id || temporaryId();
        return `
            <div class="product-row" data-product-id="${escapeHtml(id)}">
                <input type="hidden" name="productId" value="${escapeHtml(product.id || '')}">
                <input name="productName" placeholder="${escapeHtml(MenuI18n.t('field.product'))}" value="${escapeHtml(product['Продукт'])}">
                <input name="productQuantity" placeholder="${escapeHtml(MenuI18n.t('field.quantity'))}" value="${escapeHtml(product['Кількість'])}">
                ${renderUnitSelect(product['Одиниця'])}
                <input name="productComment" placeholder="${escapeHtml(MenuI18n.t('field.comment'))}" value="${escapeHtml(product['Коментар'])}">
                <button class="remove-button" type="button" data-action="remove-product-row" data-product-id="${escapeHtml(id)}">×</button>
            </div>
        `;
    }

    function renderUnitSelect(selectedUnit) {
        const units = [
            '',
            'г',
            'кг',
            'мл',
            'л',
            'шт',
            'пачка',
            'банка',
            'пляшка',
            'пучок',
            'зубчик',
            'ст. л.',
            'ч. л.',
            'склянка',
            'дрібка',
            'за смаком'
        ];
        const normalizedSelectedUnit = String(selectedUnit || '');
        const options = units.includes(normalizedSelectedUnit)
            ? units
            : [...units, normalizedSelectedUnit];

        return `
            <select name="productUnit" aria-label="${escapeHtml(MenuI18n.t('field.unit'))}">
                ${options.map(unit => `
                    <option value="${escapeHtml(unit)}" ${unit === normalizedSelectedUnit ? 'selected' : ''}>
                        ${escapeHtml(unit || MenuI18n.t('field.unitEmpty'))}
                    </option>
                `).join('')}
            </select>
        `;
    }

    function toggleTagMultiselect() {
        document.getElementById('tagDropdown')?.classList.toggle('hidden');
    }

    function closeTagMultiselect() {
        document.getElementById('tagDropdown')?.classList.add('hidden');
    }

    function selectFormTag(tag) {
        const normalizedTag = String(tag || '').trim();
        if (!normalizedTag || getSelectedFormTags().includes(normalizedTag)) return;

        const selectedContainer = document.getElementById('selectedFormTags');
        selectedContainer?.querySelector('.tag-placeholder')?.remove();
        selectedContainer?.insertAdjacentHTML('beforeend', renderSelectedFormTag(normalizedTag));
        renderCurrentTagDropdown();
    }

    function addCustomFormTag() {
        const input = document.getElementById('customTagInput');
        const tag = String(input?.value || '').trim();

        if (!tag) return;

        selectFormTag(tag);
        if (input) input.value = '';
    }

    function removeFormTag(tag) {
        const selectedContainer = document.getElementById('selectedFormTags');
        const button = [...(selectedContainer?.querySelectorAll('.selected-form-tag') || [])]
            .find(element => element.dataset.tag === tag);

        button?.remove();

        if (selectedContainer && !selectedContainer.querySelector('.selected-form-tag')) {
            selectedContainer.innerHTML = `<span class="tag-placeholder">${escapeHtml(MenuI18n.t('field.tagsPlaceholder'))}</span>`;
        }

        renderCurrentTagDropdown();
    }

    function renderCurrentTagDropdown() {
        const dropdown = document.getElementById('tagDropdown');
        const selectedValues = getSelectedFormTags();
        const available = allTags.filter(tag => !selectedValues.includes(tag));

        if (!dropdown) return;

        dropdown.innerHTML = `
            <div class="custom-tag-row">
                <input id="customTagInput" type="text" autocomplete="off" placeholder="${escapeHtml(MenuI18n.t('field.newTag'))}">
                <button class="button secondary" type="button" data-action="add-custom-form-tag">${escapeHtml(MenuI18n.t('button.addTag'))}</button>
            </div>
            ${available.length ? available.map(tag => `
                <button class="tag-option" type="button" data-action="select-form-tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>
            `).join('') : `<div class="tag-option empty-option">${escapeHtml(MenuI18n.t('empty.tags'))}</div>`}
        `;
    }

    function getSelectedFormTags() {
        return [...document.querySelectorAll('#selectedFormTags input[name="tags"]')].map(input => input.value);
    }

    function addProductRow() {
        document.getElementById('productRows').insertAdjacentHTML('beforeend', renderProductRow(createEmptyProduct('')));
    }

    function removeProductRow(productId) {
        const row = document.querySelector(`.product-row[data-product-id="${cssEscape(productId)}"]`);
        if (row) row.remove();
    }

    function saveDishFromForm(form) {
        const formData = new FormData(form);
        const dish = {
            id: form.dataset.dishId || '',
            'Страва': formData.get('name'),
            'Час хв': formData.get('time'),
            'Опис': formData.get('description'),
            tags: formData.getAll('tags')
        };

        const products = [...form.querySelectorAll('.product-row')].map(row => ({
            id: row.querySelector('[name="productId"]').value,
            'Продукт': row.querySelector('[name="productName"]').value,
            'Кількість': row.querySelector('[name="productQuantity"]').value,
            'Одиниця': row.querySelector('[name="productUnit"]').value,
            'Коментар': row.querySelector('[name="productComment"]').value
        }));

        MenuStorage.saveDish(dish, products);
        reloadData();
        currentScreen = 'manage';
        renderScreen();
        renderManage();
    }

    function archiveDish(dishId) {
        MenuStorage.archiveDish(dishId);
        selectedDishIds.delete(dishId);
        reloadData();
        currentScreen = 'manage';
        renderScreen();
        renderManage();
    }

    function restoreDish(dishId) {
        MenuStorage.restoreDish(dishId);
        reloadData();
        currentScreen = 'archive';
        renderScreen();
        renderArchive();
    }

    function clearArchive() {
        MenuStorage.clearArchive();
        reloadData();
        currentScreen = 'archive';
        renderScreen();
        renderArchive();
    }

    function getSelectedDishes() {
        return allDishes.filter(dish => selectedDishIds.has(dish.id));
    }

    function createEmptyDish() {
        return {
            id: '',
            'Страва': '',
            'Час хв': '',
            'Опис': ''
        };
    }

    function getDishTags(dish) {
        return normalizeTags(Array.isArray(dish?.tags) ? dish.tags : dish?.['теги']);
    }

    function normalizeTags(tags) {
        const normalized = (Array.isArray(tags) ? tags : [])
            .map(tag => String(tag || '').trim())
            .filter(Boolean);

        return [...new Set(normalized)];
    }

    function createEmptyProduct(dishId) {
        return { id: '', dishId, 'Продукт': '', 'Кількість': '', 'Одиниця': '', 'Коментар': '' };
    }

    function showLocalLoaders() {
        setContainerLoader('tagSelector', MenuI18n.t('loader.tags'));
        setContainerLoader('selectedList', MenuI18n.t('loader.selected'));
        setContainerLoader('content', MenuI18n.t('loader.dishes'));
        setContainerLoader('resultContent', MenuI18n.t('loader.products'));
    }

    function setContainerLoader(id, message) {
        const element = document.getElementById(id);
        if (element) element.innerHTML = `<div class="loader">${escapeHtml(message)}</div>`;
    }

    function showSaving(message) {
        const saveStatus = document.getElementById('saveStatus');
        saveStatus.textContent = message;
        saveStatus.classList.remove('hidden');
    }

    function hideSaving() {
        document.getElementById('saveStatus').classList.add('hidden');
    }

    function hideSavingSoon() {
        window.setTimeout(hideSaving, 250);
    }

    function renderError(error) {
        hideSaving();
        const message = error?.message || String(error || 'Невідома помилка');
        const targetId = currentScreen === 'result' ? 'resultContent' : 'content';
        document.getElementById(targetId).innerHTML = `<div class="error">${escapeHtml(MenuI18n.t('error.prefix'))}: ${escapeHtml(message)}</div>`;
        currentScreen = 'select';
        renderScreen();
    }

    function formatDuration(value) {
        const totalMinutes = Number(value || 0);

        if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
            return `0 ${MenuI18n.t('meta.minutes')}`;
        }

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const parts = [];

        if (hours > 0) {
            parts.push(`${hours} ${MenuI18n.t('meta.hours')}`);
        }

        if (minutes > 0) {
            parts.push(`${minutes} ${MenuI18n.t('meta.minutes')}`);
        }

        return parts.join(' ');
    }

    function temporaryId() {
        return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function cssEscape(value) {
        return window.CSS?.escape ? CSS.escape(value) : String(value).replaceAll('"', '\\"');
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function bindLanguageSwitcher() {
        const selector = document.getElementById('languageSelector');
        if (!selector) return;
        const savedLang = localStorage.getItem('menu.language') || 'uk';
        selector.value = savedLang;
        document.documentElement.lang = savedLang;
        selector.addEventListener('change', async () => {
            const newLang = selector.value;
            localStorage.setItem('menu.language', newLang);
            try {
                await MenuI18n.init();
            } catch (e) {
                // ignore
            }
            MenuI18n.applyTranslations();
        });
    }

})();
















