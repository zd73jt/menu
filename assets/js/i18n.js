window.MenuI18n = (() => {
    const FALLBACK_LANGUAGE = 'uk';
    const FALLBACK_MESSAGES = {
        'app.title': 'Меню',
        'tags.title': 'Теги',
        'tags.manageTitle': 'Редагування тегів',
        'selected.title': 'Обрані страви',
        'result.title': 'Вибрані страви і продукти',
        'manage.title': 'Керування стравами',
        'archive.title': 'Архів',
        'import.title': 'Імпорт JSON',
        'add.title': 'Додати страву',
        'edit.title': 'Редагувати страву',
        'products.title': 'Інгредієнти',
        'button.clear': 'Очистити',
        'button.choose': 'Вибрати',
        'button.back': 'Повернутись',
        'button.manage': 'Редагувати меню',
        'button.addDish': 'Додати страву',
        'button.archive': 'Архів',
        'button.edit': 'Редагувати',
        'button.delete': 'Видалити',
        'button.restore': 'Відновити',
        'button.clearArchive': 'Очистити архів',
        'button.save': 'Зберегти',
        'button.cancel': 'Скасувати',
        'button.addProduct': 'Додати інгредієнт',
        'button.timeUp': 'Збільшити час',
        'button.timeDown': 'Зменшити час',
        'button.manageTags': 'Редагувати теги',
        'button.addTag': 'Додати тег',
        'button.export': 'Експорт',
        'button.import': 'Імпорт',
        'button.loadJson': 'Заімпортити',
        'button.chooseFile': 'Вибрати файл',
        'field.name': 'Назва',
        'field.newTag': 'Новий тег',
        'field.time': 'Час хв',
        'field.description': 'Опис',
        'field.comment': 'Коментар',
        'field.product': 'Продукт',
        'field.quantity': 'Кількість',
        'field.unit': 'Одиниця',
        'field.unitEmpty': 'Одиниця',
        'field.tagsPlaceholder': 'Виберіть теги',
        'field.jsonData': 'JSON дані',
        'loader.tags': 'Завантаження тегів...',
        'loader.selected': 'Завантаження вибраного...',
        'loader.dishes': 'Завантаження страв...',
        'loader.products': 'Завантаження продуктів...',
        'empty.selected': 'Поки нічого не вибрано.',
        'empty.dishes': 'Нема страв під вибрані теги.',
        'empty.result': 'Нема вибраних страв.',
        'empty.products': 'Продукти ще не заповнені в таблиці.',
        'empty.manage': 'Страв поки немає.',
        'empty.archive': 'Архів порожній.',
        'empty.tags': 'Усі теги вибрані.',
        'empty.tagsManage': 'Тегів поки немає.',
        'counter.shown': 'Показано: {shown} з {total}',
        'meta.minutes': 'хв',
        'meta.hours': 'год',
        'import.error': 'Помилка імпорту',
        'import.success': 'Дані завантажено',
        'error.prefix': 'Помилка'
    };

    let language = localStorage.getItem('menu.language') || FALLBACK_LANGUAGE;
    let messages = { ...FALLBACK_MESSAGES };

    async function init() {
        try {
            const response = await fetch(`i18n/${language}.json`, { cache: 'no-store' });

            if (response.ok) {
                messages = { ...FALLBACK_MESSAGES, ...(await response.json()) };
            }
        } catch (error) {
            messages = { ...FALLBACK_MESSAGES };
        }

        document.documentElement.lang = language;
        applyTranslations();
    }

    function t(key, params = {}) {
        const template = messages[key] || FALLBACK_MESSAGES[key] || key;

        return Object.entries(params).reduce(
            (value, [name, replacement]) => value.replaceAll(`{${name}}`, String(replacement)),
            template
        );
    }

    function applyTranslations(root = document) {
        root.querySelectorAll('[data-i18n]').forEach(element => {
            element.textContent = t(element.dataset.i18n);
        });
    }

    return {
        init,
        t,
        applyTranslations
    };
})();
