class WishlistApp {
    constructor() {
        this.folders = [];
        this.currentFolder = null;
        this.folderToDelete = null;
        this.db = null;
        this.saveTimeout = null; // Добавляем переменную для debounce
        this.init();
    }

    init() {
        this.initFirebase();
        this.setupEventListeners();
        this.renderFolders();
    }

    initFirebase() {
        // Конфигурация Firebase (ваши ключи)
        const firebaseConfig = {
            apiKey: "AIzaSyBa3P8CkQ_slPwuIz8I4zHxBRJRcFiXdgU",
            authDomain: "wishlist-b2f66.firebaseapp.com",
            projectId: "wishlist-b2f66",
            storageBucket: "wishlist-b2f66.firebasestorage.app",
            messagingSenderId: "42696773236",
            appId: "1:42696773236:web:16c2e578922ea623418b21",
            measurementId: "G-W4W4TYVRFM"
        };

        // Инициализация Firebase
        firebase.initializeApp(firebaseConfig);
        this.db = firebase.database();
        
        // Слушаем изменения в базе данных
        this.db.ref('folders').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.folders = Object.values(data);
            } else {
                this.folders = [];
            }
            this.renderFolders();
        });
    }

    setupEventListeners() {
        // Кнопка создания новой папки
        document.getElementById('newFolderBtn').addEventListener('click', () => {
            this.showCreateFolderModal();
        });

        // Кнопка настроек
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettingsModal();
        });

        // Модальное окно создания папки
        document.getElementById('createFolderBtn').addEventListener('click', () => {
            this.createFolder();
        });

        document.getElementById('cancelCreateBtn').addEventListener('click', () => {
            this.hideCreateFolderModal();
        });

        // Закрытие редактора папки
        document.getElementById('closeFolderBtn').addEventListener('click', () => {
            this.closeFolder();
        });

        // Удаление папки
        document.getElementById('deleteFolderBtn').addEventListener('click', () => {
            this.showDeleteConfirmModal();
        });

        // Модальное окно подтверждения удаления
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            if (this.currentFolder) {
                this.deleteCurrentFolder();
            } else if (this.folderToDelete) {
                this.deleteFolder();
            }
        });

        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            this.hideDeleteConfirmModal();
        });

        // Модальное окно настроек
        document.getElementById('helpBtn').addEventListener('click', () => {
            this.showHelpModal();
        });

        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.showClearDataConfirm();
        });

        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            this.hideSettingsModal();
        });

        // Модальное окно пособия
        document.getElementById('closeHelpBtn').addEventListener('click', () => {
            this.hideHelpModal();
        });

        // Закрытие модальных окон по клику вне их
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Обработка Enter в поле ввода названия папки
        document.getElementById('folderNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createFolder();
            }
        });

        // Настройка редактора
        this.setupEditor();
        
        // Добавление поддержки жестов для мобильных устройств
        this.setupTouchGestures();
    }

    setupEditor() {
        const editor = document.getElementById('folderEditor');
        // Удаляем toolbar и execCommand, оставляем только ввод текста и вставку изображений
        // Автосохранение при изменении содержимого с debounce
        editor.addEventListener('input', () => {
            if (this.currentFolder) {
                // Очищаем предыдущий таймаут
                if (this.saveTimeout) {
                    clearTimeout(this.saveTimeout);
                }
                // Устанавливаем новый таймаут на 500ms
                this.saveTimeout = setTimeout(() => {
                    this.saveFolderContent();
                }, 500);
            }
        });
        // Обработка вставки изображений
        editor.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.style.maxWidth = '100%';
                        img.style.height = 'auto';
                        editor.appendChild(img);
                    };
                    reader.readAsDataURL(blob);
                }
            }
        });
    }

    showCreateFolderModal() {
        const modal = document.getElementById('createFolderModal');
        const input = document.getElementById('folderNameInput');
        modal.style.display = 'block';
        input.value = '';
        input.focus();
    }

    hideCreateFolderModal() {
        document.getElementById('createFolderModal').style.display = 'none';
    }

    showSettingsModal() {
        document.getElementById('settingsModal').style.display = 'block';
    }

    hideSettingsModal() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    showHelpModal() {
        document.getElementById('helpModal').style.display = 'block';
    }

    hideHelpModal() {
        document.getElementById('helpModal').style.display = 'none';
    }

    showDeleteConfirmModal() {
        if (this.currentFolder) {
            document.getElementById('deleteFolderName').textContent = this.currentFolder.name;
            document.getElementById('deleteConfirmModal').style.display = 'block';
        }
    }

    showDeleteFolderModal(folder) {
        document.getElementById('deleteFolderName').textContent = folder.name;
        document.getElementById('deleteConfirmModal').style.display = 'block';
        
        // Временно сохраняем папку для удаления
        this.folderToDelete = folder;
    }

    hideDeleteConfirmModal() {
        document.getElementById('deleteConfirmModal').style.display = 'none';
        this.folderToDelete = null;
    }

    deleteCurrentFolder() {
        if (this.currentFolder) {
            const folderId = this.currentFolder.id;
            // Удаляем из локального массива
            this.folders = this.folders.filter(folder => folder.id !== folderId);
            this.renderFolders();
            // Удаляем папку по id из Firebase
            this.db.ref('folders/' + folderId).remove();
            this.closeFolder();
            this.hideDeleteConfirmModal();
            this.showNotification('Папка удалена', 'success');
        }
    }

    deleteFolder() {
        if (this.folderToDelete) {
            const folderId = this.folderToDelete.id;
            // Удаляем из локального массива
            this.folders = this.folders.filter(folder => folder.id !== folderId);
            this.renderFolders();
            // Удаляем папку по id из Firebase
            this.db.ref('folders/' + folderId).remove();
            this.hideDeleteConfirmModal();
            this.folderToDelete = null;
            this.showNotification('Папка удалена', 'success');
        }
    }

    showClearDataConfirm() {
        if (confirm('Вы уверены, что хотите удалить все данные? Это действие нельзя отменить!')) {
            this.clearAllData();
        }
    }

    clearAllData() {
        // Очищаем данные в Firebase
        this.db.ref('folders').remove().then(() => {
            this.folders = [];
            this.renderFolders();
            this.hideSettingsModal();
            this.showNotification('Все данные удалены', 'success');
        }).catch((error) => {
            console.error('Ошибка при очистке данных:', error);
            this.showNotification('Ошибка при удалении данных', 'error');
        });
    }



    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    setupTouchGestures() {
        let startX = 0;
        let startY = 0;
        let startTime = 0;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
        });

        document.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();
            const duration = endTime - startTime;
            const distanceX = Math.abs(endX - startX);
            const distanceY = Math.abs(endY - startY);

            // Долгое нажатие для контекстного меню
            if (duration > 500 && distanceX < 10 && distanceY < 10) {
                this.showContextMenu(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }
        });

        // Предотвращение зума на двойное касание
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    showContextMenu(x, y) {
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            top: ${y}px;
            left: ${x}px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            padding: 8px 0;
            min-width: 150px;
        `;

        const options = [
            { text: 'Новая папка', icon: '➕', action: () => this.showCreateFolderModal() },
            { text: 'Настройки', icon: '⚙️', action: () => this.showSettingsModal() }
        ];

        options.forEach(option => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
                color: #333;
            `;
            item.innerHTML = `<span style="font-size: 1.2rem; width: 20px; text-align: center;">${option.icon}</span>${option.text}`;
            item.addEventListener('click', () => {
                option.action();
                document.body.removeChild(menu);
            });
            item.addEventListener('mouseenter', () => {
                item.style.background = '#f5f5f5';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // Закрытие меню при клике вне его
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                document.body.removeChild(menu);
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    createFolder() {
        const input = document.getElementById('folderNameInput');
        const name = input.value.trim();
        
        if (!name) {
            alert('Пожалуйста, введите название папки');
            return;
        }

        const folder = {
            id: this.generateId(),
            name: name,
            content: '<p>Начните писать здесь...</p>',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: this.getUserId()
        };

        // Добавляем папку в локальный массив для мгновенного отображения
        this.folders.push(folder);
        this.renderFolders();
        
        // Сохраняем папку отдельно по id
        this.db.ref('folders/' + folder.id).set(folder);
        this.hideCreateFolderModal();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getUserId() {
        // Генерируем уникальный ID для пользователя
        let userId = sessionStorage.getItem('wishlist_user_id');
        if (!userId) {
            userId = 'user_' + this.generateId();
            sessionStorage.setItem('wishlist_user_id', userId);
        }
        return userId;
    }

    renderFolders() {
        const container = document.getElementById('foldersContainer');
        container.innerHTML = '';

        this.folders.forEach(folder => {
            const folderElement = this.createFolderElement(folder);
            container.appendChild(folderElement);
        });
    }

    createFolderElement(folder) {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder';
        folderDiv.dataset.folderId = folder.id;
        
        folderDiv.innerHTML = `
            <button class="folder-delete-btn" title="Удалить папку">📛</button>
            <div class="folder-icon">📁</div>
            <div class="folder-name">${folder.name}</div>
        `;

        // Обработчик клика по папке
        folderDiv.addEventListener('click', (e) => {
            if (!e.target.classList.contains('folder-delete-btn')) {
                this.openFolder(folder);
            }
        });

        // Обработчик удаления папки
        const deleteBtn = folderDiv.querySelector('.folder-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDeleteFolderModal(folder);
        });

        return folderDiv;
    }

    openFolder(folder) {
        this.currentFolder = folder;
        const modal = document.getElementById('editFolderModal');
        const title = document.getElementById('folderTitle');
        const editor = document.getElementById('folderEditor');

        title.textContent = folder.name;
        editor.innerHTML = folder.content;
        modal.style.display = 'block';

        // Фокус на редактор
        setTimeout(() => {
            editor.focus();
        }, 100);
    }

    closeFolder() {
        if (this.currentFolder) {
            // Принудительно сохраняем при закрытии папки
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
            this.saveFolderContent();
            this.currentFolder = null;
        }
        document.getElementById('editFolderModal').style.display = 'none';
    }

    saveFolderContent() {
        if (this.currentFolder) {
            const editor = document.getElementById('folderEditor');
            this.currentFolder.content = editor.innerHTML;
            this.currentFolder.updatedAt = new Date().toISOString();
            // Сохраняем только одну папку по её id
            this.db.ref('folders/' + this.currentFolder.id).set(this.currentFolder);
        }
    }

    saveFolders() {
        // Больше не нужно сохранять весь массив
        // Каждая папка сохраняется отдельно при изменении
        console.log('Папки сохраняются по отдельности');
    }

    loadFolders() {
        // Загружаем из Firebase (уже делается в initFirebase)
        console.log('Папки загружаются автоматически из Firebase');
    }

    async syncWithServer() {
        // Синхронизация больше не нужна, Firebase делает это автоматически
        console.log('Данные синхронизированы с Firebase');
    }

    async loadSharedFolders() {
        // Все папки уже загружаются из Firebase
        console.log('Все папки загружены из Firebase');
    }

    // Дополнительные функции для улучшения UX
    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S для сохранения
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (this.currentFolder) {
                    this.saveFolderContent();
                    this.showSaveNotification();
                }
            }
        });
    }

    showSaveNotification() {
        this.showNotification('Сохранено!', 'success');
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const app = new WishlistApp();
    
    // Добавляем CSS для анимации уведомлений
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Добавляем глобальную переменную для доступа к приложению
    window.wishlistApp = app;
});