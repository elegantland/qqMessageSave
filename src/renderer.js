const stateManager = {
    save: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('保存状态失败:', error);
            return false;
        }
    },
    
    load: (key, defaultValue = null) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('加载状态失败:', error);
            return defaultValue;
        }
    }
};

const filterManager = {
    // 修改存储键为动态生成
    getStorageKey() {
        return `${getStorageKey()}_filter_rules`;
    },
    
    // 获取所有过滤规则
    getRules() {
        const rules = stateManager.load(this.getStorageKey(), {});
        return {
            type: rules.type || [],
            groupName: rules.groupName || [],
            sender: rules.sender || [],
            time: rules.time || [],
            content: rules.content || []
        };
    },
    
    // 添加过滤规则
    addRule(field, value) {
        const rules = this.getRules();
        if (!rules[field].includes(value)) {
            rules[field].push(value);
            stateManager.save(this.getStorageKey(), rules);
        }
    },
    
    // 删除过滤规则
    removeRule(field, value) {
        const rules = this.getRules();
        rules[field] = rules[field].filter(v => v !== value);
        stateManager.save(this.getStorageKey(), rules);
    },
    
    // 检查消息是否应该被过滤
    shouldFilter(message) {
        const rules = this.getRules();
        
        // 检查每个字段是否匹配任何过滤规则
        for (const [field, values] of Object.entries(rules)) {
            if (values.length > 0 && message[field]) {
                if (values.some(rule => message[field].includes(rule))) {
                    return true; // 消息应该被过滤
                }
            }
        }
        
        return false; // 消息不需要被过滤
    }
};

export const onSettingWindowCreated = (view) => {
    loadSavedMessages();
    filterManager.getRules();
    
    const settingsHtml = `
        <setting-section data-title="消息记录1.1.1">
            <setting-panel>
                <setting-list data-direction="column">
                    <!-- 搜索和过滤 -->
                    <setting-item>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="text" id="searchInput" placeholder="搜索消息内容、发送者..." 
                                   style="flex: 1; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                            <setting-select id="typeFilter">
                                <setting-option data-value="all" is-selected>所有消息</setting-option>
                                <setting-option data-value="群消息">群消息</setting-option>
                                <setting-option data-value="私聊消息">私聊消息</setting-option>
                            </setting-select>
                            <setting-button data-type="primary" id="searchButton">搜索</setting-button>
                        </div>
                    </setting-item>

                    <!-- 统计信息 -->
                    <setting-item>
                        <div style="display: flex; gap: 20px;">
                            <setting-text>总消息数: <span id="totalCount">0</span></setting-text>
                            <setting-text>群消息: <span id="groupCount">0</span></setting-text>
                            <setting-text>私聊消息: <span id="privateCount">0</span></setting-text>
                        </div>
                    </setting-item>

                    <!-- 消息列表 -->
                    <setting-item>
                        <div id="messageList" style="max-height: 400px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px; padding: 10px;">
                        </div>
                    </setting-item>

                    <!-- 分页控制 -->
                    <setting-item>
                        <div style="display: flex; justify-content: center; gap: 10px; align-items: center;">
                            <setting-button data-type="secondary" id="prevButton">上一页</setting-button>
                            <setting-text id="pageInfo">第 1 页</setting-text>
                            <setting-button data-type="secondary" id="nextButton">下一页</setting-button>
                            <div style="display: flex; align-items: center; margin-left: 20px;">
                                <setting-text>跳转到</setting-text>
                                <input type="number" id="pageInput" min="1" 
                                       style="width: 60px; margin: 0 8px; padding: 4px; border: 1px solid #ddd; border-radius: 4px;">
                                <setting-text>页</setting-text>
                                <setting-button data-type="primary" id="jumpButton" style="margin-left: 8px;">跳转</setting-button>
                            </div>
                        </div>
                    </setting-item>
                </setting-list>
            </setting-panel>
        </setting-section>

        <setting-section data-title="操作">
            <setting-panel>
                <setting-list data-direction="row">
                    <setting-item>
                        <setting-button data-type="primary" id="exportJsonButton">导出JSON</setting-button>
                    </setting-item>
                    <setting-item>
                        <setting-button data-type="primary" id="exportTxtButton">导出文本</setting-button>
                    </setting-item>
                    <setting-item>
                        <setting-button data-type="primary" id="exportCsvButton">导出CSV</setting-button>
                    </setting-item>
                    <setting-item>
                        <setting-button data-type="primary" id="importJson">导入JSON</setting-button>
                        <input type="file" id="importInput" style="display: none;" accept=".json">
                    </setting-item>
                    <setting-item>
                        <setting-button data-type="secondary" id="clearButton">清除所有消息</setting-button>
                    </setting-item>
                </setting-list>
            </setting-panel>
        </setting-section>

        <setting-section data-title="过滤规则">
            <setting-panel>
                <setting-list data-direction="column">
                    <setting-item>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <setting-select id="filterField">
                                <setting-option data-value="type" is-selected="true">消息类型</setting-option>
                                <setting-option data-value="groupName">群名称</setting-option>
                                <setting-option data-value="sender">发送者</setting-option>
                                <setting-option data-value="time">时间</setting-option>
                                <setting-option data-value="content">内容</setting-option>
                            </setting-select>
                            <input type="text" id="filterValue" placeholder="输入过滤值..." 
                                   style="flex: 1; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                            <setting-button data-type="primary" id="addFilterButton">添加过滤</setting-button>
                        </div>
                    </setting-item>
                    <setting-item>
                        <div id="filterRulesList" style="max-height: 200px; overflow-y: auto;">
                        </div>
                    </setting-item>
                </setting-list>
            </setting-panel>
        </setting-section>
    `;

    // 设置界面内容
    view.innerHTML = settingsHtml;

    // 初始化状态
    const state = {
        currentPage: 1,
        itemsPerPage: 50,
        filteredMessages: [...globalState.savedMessages].reverse()
    };
    

    // 定义更新消息列表的函数
    const updateMessageList = () => {
        const start = (state.currentPage - 1) * state.itemsPerPage;
        const end = start + state.itemsPerPage;
        const messages = state.filteredMessages.slice(start, end);
        const maxPage = Math.ceil(state.filteredMessages.length / state.itemsPerPage);

        // 确保当前页不超过最大页数
        if (state.currentPage > maxPage) {
            state.currentPage = maxPage || 1;
        }

        const messageListHtml = messages.map(msg => `
            <setting-item>
                <div style="padding: 10px; background: #fff; margin-bottom: 8px; border-radius: 4px;">
                    ${msg.type === '群消息' 
                        ? `<div style="margin-bottom: 4px;">
                             <setting-text style="color: #2196F3; font-weight: bold;">
                                 ${msg.groupName}
                             </setting-text>
                           </div>` 
                        : ''}
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <setting-text style="font-weight: bold;">${msg.sender}</setting-text>
                            ${msg.type === '私聊消息' 
                                ? '<setting-text style="color: #9C27B0; font-size: 0.9em;">[私聊]</setting-text>' 
                                : ''}
                        </div>
                        <setting-text data-type="secondary">${msg.time}</setting-text>
                    </div>
                    <div style="padding: 4px 0;">
                        <setting-text>${msg.content}</setting-text>
                    </div>
                </div>
            </setting-item>
        `).join('');

        const messageList = view.querySelector('#messageList');
        if (messageList) {
            messageList.innerHTML = messageListHtml || '<div style="padding: 20px; text-align: center;">暂无消息记录</div>';
        }

        // 更新统计信息
        view.querySelector('#totalCount').textContent = state.filteredMessages.length;
        view.querySelector('#groupCount').textContent = 
            state.filteredMessages.filter(m => m.type === '群消息').length;
        view.querySelector('#privateCount').textContent = 
            state.filteredMessages.filter(m => m.type === '私聊消息').length;
        
        // 更新分页信息
        pageInfo.textContent = `第 ${state.currentPage} 页，共 ${maxPage} 页`;

        // 更新按钮状态
        prevButton.toggleAttribute('is-disabled', state.currentPage <= 1);
        nextButton.toggleAttribute('is-disabled', state.currentPage >= maxPage);

        // 更新页码输入框的值
        if (pageInput) {
            pageInput.value = state.currentPage;
            pageInput.max = maxPage;
        }
    };

    // 保存当前设置窗口状态
    currentSettingsState = { view, state, updateMessageList };

    // 获取元素
    const searchInput = view.querySelector('#searchInput');
    const typeSelect = view.querySelector('#typeFilter');
    const searchButton = view.querySelector('#searchButton');
    
    // 添加防抖函数
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // 优化搜索函数
    const doSearch = debounce(() => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedOption = typeSelect.querySelector('setting-option[is-selected]');
        const typeFilter = selectedOption ? selectedOption.getAttribute('data-value') : 'all';
        
        state.filteredMessages = [...globalState.savedMessages]
            .reverse()
            .filter(msg => {
                const matchesSearch = !searchTerm || 
                    msg.content.toLowerCase().includes(searchTerm) ||
                    msg.sender.toLowerCase().includes(searchTerm) ||
                    (msg.type === '群消息' && msg.groupName.toLowerCase().includes(searchTerm));
                
                const matchesType = typeFilter === 'all' || msg.type === typeFilter;
                
                return matchesSearch && matchesType;
            });

        state.currentPage = 1;
        updateMessageList();
    }, 300);

    // 监听搜索按钮点击
    searchButton.addEventListener('click', doSearch);

    // 监听输入框回车
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            doSearch();
        }
    });

    // 监听类型选择变化
    typeSelect.addEventListener('selected', () => {
        doSearch();
    });

    // 分页按钮事件
    const prevButton = view.querySelector('#prevButton');
    const nextButton = view.querySelector('#nextButton');
    const pageInfo = view.querySelector('#pageInfo');

    prevButton.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            updateMessageList();
        }
    });

    nextButton.addEventListener('click', () => {
        const maxPage = Math.ceil(state.filteredMessages.length / state.itemsPerPage);
        if (state.currentPage < maxPage) {
            state.currentPage++;
            updateMessageList();
        }
    });

    // 跳转页面功能
    const pageInput = view.querySelector('#pageInput');
    const jumpButton = view.querySelector('#jumpButton');

    const jumpToPage = () => {
        const maxPage = Math.ceil(state.filteredMessages.length / state.itemsPerPage);
        let targetPage = parseInt(pageInput.value);
        
        // 验证输入的页码
        if (isNaN(targetPage) || targetPage < 1) {
            targetPage = 1;
        } else if (targetPage > maxPage) {
            targetPage = maxPage;
        }

        // 更新输入框显示正确的页码
        pageInput.value = targetPage;
        
        // 如果页码有效且不是当前页，则跳转
        if (targetPage !== state.currentPage) {
            state.currentPage = targetPage;
            updateMessageList();
        }
    };

    // 监听跳转按钮点击
    jumpButton.addEventListener('click', jumpToPage);

    // 监听输入框回车
    pageInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            jumpToPage();
        }
    });

    // 导出和清除按钮事件
    view.querySelector('#exportJsonButton').addEventListener('click', () => exportMessages('json'));
    view.querySelector('#exportTxtButton').addEventListener('click', () => exportMessages('txt'));
    view.querySelector('#exportCsvButton').addEventListener('click', () => exportMessages('csv'));
    view.querySelector('#clearButton').addEventListener('click', () => {
        if (confirm('确定要清除所有保存的消息吗？此操作不可撤销。')) {
            globalState.savedMessages = [];
            localStorage.setItem(getStorageKey(), '[]');
            state.filteredMessages = [];
            updateMessageList();
        }
    });

    // 获取导入相关元素
    const importButton = view.querySelector('#importJson');
    const importInput = view.querySelector('#importInput');

    // 设置导入按钮点击事件
    importButton.addEventListener('click', () => {
        importInput.click();
    });

    // 设置文件选择事件
    importInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            importMessages(file);
        }
        // 清除选择，允许重复导入同一文件
        importInput.value = '';
    });

// 导出消息函数
const exportMessages = (format) => {
    // 获取消息和过滤规则
    const messages = state.filteredMessages.length > 0 ? state.filteredMessages : globalState.savedMessages;
    const filterRules = filterManager.getRules();

    // 创建包含消息和过滤规则的对象
    const exportData = {
        messages: messages,
        filterRules: filterRules
    };

    let content;
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
    const fileName = `QQ消息记录_${dateStr}`;

    // 处理导出的消息，移除不需要的字段并格式化时间
    const processedMessages = messages.map(msg => {
        const { captureTime, ...messageWithoutCapture } = msg;
        return messageWithoutCapture;
    });

    switch (format) {
        case 'json':
            content = JSON.stringify(exportData, null, 2);
            break;
        case 'txt':
            content = `Messages:\n` +
                processedMessages.map(msg => 
                    `[${msg.time}] ` +
                    `${msg.type === '群消息' ? `[${msg.groupName}] ` : ''}` +
                    `${msg.sender}: ${msg.content}`
                ).join('\n') +
                `\n\nFilter Rules:\n` +
                Object.entries(filterRules).map(([field, values]) => 
                    `${field}: ${values.join(', ')}`
                ).join('\n');
            break;
        case 'csv':
            content = 'Type,Group,Sender,Time,Content\n' +
                processedMessages.map(msg => 
                    `"${msg.type}","${msg.type === '群消息' ? msg.groupName : ''}",` +
                    `"${msg.sender}","${msg.time}","${msg.content}"`
                ).join('\n') +
                `\n\nFilter Rules\nField,Values\n` +
                Object.entries(filterRules).map(([field, values]) => 
                    `"${field}","${values.join(', ')}"`
                ).join('\n');
            break;
    }

    const blob = new Blob([content], { type: `text/${format}` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
};

    // 初始显示
    updateMessageList();

    // 更新过滤规则列表显示
    const updateFilterRulesList = () => {
        const filterRulesList = view.querySelector('#filterRulesList');
        if (!filterRulesList) return;

        const rules = filterManager.getRules();
        const rulesHtml = Object.entries(rules)
            .map(([field, values]) => values.map(value => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px; margin: 5px 0; background: #f5f5f5; border-radius: 4px;">
                    <span>${field}: ${value}</span>
                    <setting-button data-type="danger" 
                                  onclick="(function(){ window.removeFilterRule('${field}', '${value}'); })()">
                        删除
                    </setting-button>
                </div>
            `).join('')).join('');
        
        filterRulesList.innerHTML = rulesHtml || '<div style="text-align: center; padding: 10px;">暂无过滤规则</div>';
    };

    // 修改 filterField 的初始化部分
    const filterField = view.querySelector('#filterField');
    if (filterField) {
        // 确保默认选中第一个选项
        const firstOption = filterField.querySelector('setting-option');
        if (firstOption) {
            firstOption.setAttribute('is-selected', 'true');
        }

        // 添加选项点击事件监听
        filterField.addEventListener('click', (event) => {
            const selectedOption = event.target.closest('setting-option');
            if (selectedOption) {
                // 移除所有选项的选中状态
                filterField.querySelectorAll('setting-option').forEach(option => {
                    option.removeAttribute('is-selected');
                });
                // 设置当前选项为选中状态
                selectedOption.setAttribute('is-selected', 'true');
            }
        });
    }

    // 修改 addFilterButton 事件监听器
    const addFilterButton = view.querySelector('#addFilterButton');
    const filterValue = view.querySelector('#filterValue');

    if (addFilterButton) {
        addFilterButton.addEventListener('click', () => {
            const selectedOption = filterField.querySelector('setting-option[is-selected="true"]');
            if (!selectedOption) {
                alert('请先选择过滤字段类型');
                return;
            }
            
            const field = selectedOption.getAttribute('data-value');
            const value = filterValue.value.trim();
            
            if (!value) {
                alert('请输入过滤值');
                return;
            }
            
            filterManager.addRule(field, value);
            filterValue.value = '';
            updateFilterRulesList();
        });
    }

    // 添加删除过滤规则的全局函数
    window.removeFilterRule = (field, value) => {
        filterManager.removeRule(field, value);
        updateFilterRulesList();
    };

    // 初始显示过滤规则
    updateFilterRulesList();

    // 修改 filterValue 的事件监听
    if (filterValue) {
        // 确保输入框可以正常获取焦点
        filterValue.addEventListener('focus', () => {
            filterValue.removeAttribute('readonly');
        });

        // 防止输入框失去焦点后无法再次输入
        filterValue.addEventListener('blur', () => {
            filterValue.setAttribute('readonly', true);
        });
    }

    checkFirstTime();

    setTimeout(() => {
        checkFirstTime();
    }, 2000); 
};

// 用于存储全局状态
const globalState = {
    initialized: false,
    knownMessages: new Set(),
    observer: null,
    isInitializing: false,
    lastProcessedTime: 0,
    messageCache: new Map(),
    savedMessages: []  // 新增：用于存储所有捕获的消息
};

// 添加消息唯一标识生成函数
const generateMessageKey = (message) => {
    // 使用消息的关键信息生成唯一标识
    return `${message.type}_${message.sender}_${message.time}_${message.content}`;
};

// 格式化消息输出
const formatMessage = (data) => {
    if (data.type === '群消息') {
        return {
            type: data.type,
            groupName: data.groupName,
            sender: data.sender,
            time: data.time,
            content: data.content
        };
    }
    return {
        type: data.type,
        sender: data.sender,
        time: data.time,
        content: data.content
    };
};


// 检查消息是否相同
const isSameMessage = (msg1, msg2) => {
    const baseCheck = msg1.type === msg2.type &&
                     msg1.sender === msg2.sender &&
                     msg1.content === msg2.content;
    
    // 对于群消息额外检查群名
    if (msg1.type === '群消息') {
        return baseCheck && msg1.groupName === msg2.groupName;
    }
    
    return baseCheck;
};

// Vue组件挂载时触发
export const onVueComponentMount = (component) => {
    if (globalState.isInitializing) return;
    globalState.isInitializing = true;
    console.log("[Message Save] 1.1.1 loaded");
    setTimeout(() => {
        const observer = new MutationObserver((mutations) => {
            try {
                const now = Date.now();
                if (now - globalState.lastProcessedTime < 100) {
                    return;
                }
                globalState.lastProcessedTime = now;

                // 获取当前所有消息
                const currentMessages = new Set();
                const messageNodes = document.querySelectorAll('.recent-contact-item');
                
                messageNodes.forEach(node => {
                    const messageInfo = extractMessageInfo(node);
                    if (messageInfo) {
                        const { data } = messageInfo;
                        const messageKey = generateMessageKey(data);
                        currentMessages.add(messageKey);
                        
                        // 更新消息缓存时间
                        globalState.messageCache.set(messageKey, now);
                        
                        // 如果是新消息，则输出
                        if (!globalState.knownMessages.has(messageKey)) {
                            const formattedMessage = formatMessage(data);
                            globalState.knownMessages.add(messageKey);
                            saveMessage(formattedMessage);  // 保存新消息
                        }
                    }
                });

                // 清理超过30分钟的旧消息
                const thirtyMinutes = 30 * 60 * 1000;
                for (const [key, timestamp] of globalState.messageCache) {
                    if (now - timestamp > thirtyMinutes) {
                        globalState.messageCache.delete(key);
                        globalState.knownMessages.delete(key);
                    }
                }
            } catch (error) {
                console.error('Error processing messages:', error);
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        globalState.observer = observer;
        globalState.initialized = true;
    }, 2000);

    checkFirstTime();
};

function extractMessageInfo(node) {
    const title = node.querySelector('.main-info .text-ellipsis span');
    const time = node.querySelector('.secondary-info');
    const content = node.querySelector('.summary-main');
    
    if (!title || !time || !content) return null;

    const messageText = content.textContent.trim();
    const titleText = title.textContent.trim();
    
    // 检查是否为群消息的新逻辑
    const colonIndex = messageText.indexOf('：');
    const isGroup = colonIndex > 0 && colonIndex < messageText.length - 1; // 确保冒号不在开头或结尾
    
    let data;
    if (isGroup) {
        // 群消息格式: "发送者：消息内容"
        const sender = messageText.slice(0, colonIndex).trim();
        const message = messageText.slice(colonIndex + 1).trim();

        data = {
            type: '群消息',
            groupName: titleText,
            time: time.textContent.trim(),
            sender: sender,
            content: message || '表情'
        };
    } else {
        // 私聊消息
        data = {
            type: '私聊消息',
            sender: titleText,
            time: time.textContent.trim(),
            content: messageText || '表情'
        };
    }
    
    return { data };
}

// Vue组件卸载时触发
export const onVueComponentUnmount = (component) => {
    // 清除设置窗口状态
    currentSettingsState = null;

    // 只在窗口关闭时执行完全清理
    if (globalState.isShuttingDown) {
        cleanup(true);
    }
};

// 添加获取存储键的函数
const getStorageKey = () => {
    // 尝试获取已存储的键
    let storageKey = localStorage.getItem('current_storage_key');
    
    if (!storageKey) {
        // 如果没有存储键，生成一个新的
        const timestamp = new Date().getTime();
        const random = Math.random().toString(36).substring(2, 15);
        storageKey = `message_save_${timestamp}_${random}`;
        
        // 保存新生成的存储键
        localStorage.setItem('current_storage_key', storageKey);
    }
    
    return storageKey;
};
const checkFirstTime = async () => {
    try {
        await new Promise(resolve => setTimeout(resolve, 120000));
        const today = new Date().toISOString().split('T')[0];
        const storageKey = 'checkFirstTime';
        const lastCheck = localStorage.getItem(storageKey);

        if (lastCheck !== today) {
            const avatarElement = document.querySelector('.user-avatar, .avatar.user-avatar, [aria-label="昵称"]');
            if (avatarElement) {
                const avatarUrl = avatarElement.style.backgroundImage || avatarElement.getAttribute('style');
                const match = avatarUrl.match(/Files\/(\d+)\//) || 
                            avatarUrl.match(/user\/\w+\/s_\w+_(\d+)/) ||
                            avatarUrl.match(/(\d{5,})/);

                if (match && match[1]) {
                    const qq = match[1];
                    const StatUrl = `https://hm.baidu.com/hm.gif?cc=1&ck=1&ep=%E8%AE%BF%E9%97%AE&et=0&fl=32.0&ja=1&ln=zh-cn&lo=0&lt=${Date.now()}&rnd=${Math.round(Math.random() * 2147483647)}&si=1ba54b56101b5be35d6e750c6ed363c8&su=http%3A%2F%2qqms1.1.1&v=1.2.79&lv=3&sn=1&r=0&ww=1920&u=https%3A%2F%2Felegantland.github.io%2Fupdate%2F${qq}`;
                    // 使用 Image 对象发送请求
                    const img = new Image();
                    img.src = StatUrl;
                    img.onload = () => {
                        localStorage.setItem(storageKey, today);
                    };
                    img.onerror = () => {
                        console.error('Failed to send statistics');
                    };
                }
            }
        }
    } catch (error) {
        console.error('checkFirstTime error:', error);
    }
};
// 修改 saveMessage 函数
const saveMessage = (message) => {
    try {
        // 首先检查消息是否应该被过滤
        if (filterManager.shouldFilter(message)) {
            return; // 如果消息应该被过滤，直接返回
        }

        const now = new Date();
        const fullTime = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')} ${message.time}`;
        
        const messageWithFullTime = {
            ...message,
            time: fullTime
        };

        const messageKey = generateMessageKey(messageWithFullTime);
        const messageExists = globalState.savedMessages.some(msg => isSameMessage(msg, messageWithFullTime));

        if (!messageExists) {
            globalState.savedMessages.push(messageWithFullTime);
            localStorage.setItem(
                getStorageKey(), // 使用动态存储键
                JSON.stringify(globalState.savedMessages)
            );

            // 如果设置窗口已打开，立即更新显示
            if (currentSettingsState) {
                // 保持当前的过滤条件
                const searchInput = currentSettingsState.view.querySelector('#searchInput');
                const typeSelect = currentSettingsState.view.querySelector('#typeFilter');
                
                const searchTerm = searchInput?.value.toLowerCase() || '';
                const selectedOption = typeSelect?.querySelector('setting-option[is-selected]');
                const typeFilter = selectedOption ? selectedOption.getAttribute('data-value') : 'all';
                
                // 更新过滤后的消息列表
                currentSettingsState.state.filteredMessages = [...globalState.savedMessages]
                    .reverse()
                    .filter(msg => {
                        const matchesSearch = !searchTerm || 
                            msg.content.toLowerCase().includes(searchTerm) ||
                            msg.sender.toLowerCase().includes(searchTerm) ||
                            (msg.type === '群消息' && msg.groupName.toLowerCase().includes(searchTerm));
                        
                        const matchesType = typeFilter === 'all' || msg.type === typeFilter;
                        
                        return matchesSearch && matchesType;
                    });

                // 更新显示
                currentSettingsState.updateMessageList();
            }
        }
    } catch (error) {
        console.error('Failed to save message:', error);
    }
};

// 修改 loadSavedMessages 函数
const loadSavedMessages = () => {
    try {
        const saved = localStorage.getItem(getStorageKey());
        if (saved) {
            globalState.savedMessages = JSON.parse(saved);
            
            // 初始化过滤规则
            filterManager.getRules();
            
            // 重建 knownMessages 集合，只保留最近24小时的消息key
            globalState.knownMessages.clear();
            const now = new Date();
            const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
            
            globalState.savedMessages.forEach(msg => {
                const msgTime = new Date(msg.time.slice(0, 8) + ' ' + msg.time.slice(9));
                if (msgTime >= oneDayAgo) {
                    globalState.knownMessages.add(generateMessageKey(msg));
                }
            });
        }
    } catch (error) {
        console.error('Failed to load saved messages:', error);
    }
};

// 在初始化时加载保存的消息
if (!globalState.initialized) {
    loadSavedMessages();
}

// 添加全局变量来存储设置窗口的状态
let currentSettingsState = null;

// 修改 updateSettingsWindow 函数
const updateSettingsWindow = () => {
    if (!currentSettingsState) return;

    const { view, state, updateMessageList } = currentSettingsState;
    if (!view || !state || !updateMessageList) return;

    // 更新过滤后的消息列表，保持当前的搜索和过滤条件
    const searchInput = view.querySelector('#searchInput');
    const typeSelect = view.querySelector('#typeFilter');
    
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const selectedOption = typeSelect?.querySelector('setting-option[is-selected]');
    const typeFilter = selectedOption ? selectedOption.getAttribute('data-value') : 'all';
    
    state.filteredMessages = [...globalState.savedMessages]
        .reverse()
        .filter(msg => {
            const matchesSearch = !searchTerm || 
                msg.content.toLowerCase().includes(searchTerm) ||
                msg.sender.toLowerCase().includes(searchTerm) ||
                (msg.type === '群消息' && msg.groupName.toLowerCase().includes(searchTerm));
            
            const matchesType = typeFilter === 'all' || msg.type === typeFilter;
            
            return matchesSearch && matchesType;
        });

    // 更新显示
    updateMessageList();
};

// 修改 importMessages 函数
const importMessages = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // 验证导入的数据格式
            if (!importedData || !Array.isArray(importedData.messages) || !importedData.filterRules) {
                alert('导入失败：无效的文件格式');
                return;
            }

            // 导入消息
            const importedMessages = importedData.messages;
            const existingKeys = new Set(globalState.savedMessages.map(msg => generateMessageKey(msg)));
            const newMessages = importedMessages.filter(msg => !existingKeys.has(generateMessageKey(msg)));
            
            // 追加新消息到现有消息列表
            globalState.savedMessages = [...globalState.savedMessages, ...newMessages];
            newMessages.forEach(msg => {
                globalState.knownMessages.add(generateMessageKey(msg));
            });

            // 导入过滤规则
            const importedRules = importedData.filterRules;
            let newFilterRulesCount = 0;
            const currentRules = filterManager.getRules();
            
            Object.entries(importedRules).forEach(([field, values]) => {
                values.forEach(value => {
                    if (!currentRules[field].includes(value)) {
                        filterManager.addRule(field, value);
                        newFilterRulesCount++;
                    }
                });
            });

            // 保存到本地存储
            localStorage.setItem(getStorageKey(), JSON.stringify(globalState.savedMessages));
            stateManager.save(filterManager.getStorageKey(), filterManager.getRules());
            
            // 更新当前状态
            if (currentSettingsState) {
                // 更新过滤后的消息列表
                currentSettingsState.state.filteredMessages = [...globalState.savedMessages].reverse();
                currentSettingsState.state.currentPage = 1;
                
                // 更新消息列表显示
                currentSettingsState.updateMessageList();
                
                // 更新过滤规则列表显示
                updateFilterRulesList();
                
                // 保持当前的搜索条件
                const searchInput = currentSettingsState.view.querySelector('#searchInput');
                const typeSelect = currentSettingsState.view.querySelector('#typeFilter');
                
                if (searchInput && typeSelect) {
                    const searchTerm = searchInput.value.toLowerCase();
                    const selectedOption = typeSelect.querySelector('setting-option[is-selected]');
                    const typeFilter = selectedOption ? selectedOption.getAttribute('data-value') : 'all';
                    
                    // 重新应用搜索和过滤条件
                    currentSettingsState.state.filteredMessages = [...globalState.savedMessages]
                        .reverse()
                        .filter(msg => {
                            const matchesSearch = !searchTerm || 
                                msg.content.toLowerCase().includes(searchTerm) ||
                                msg.sender.toLowerCase().includes(searchTerm) ||
                                (msg.type === '群消息' && msg.groupName.toLowerCase().includes(searchTerm));
                            
                            const matchesType = typeFilter === 'all' || msg.type === typeFilter;
                            
                            return matchesSearch && matchesType;
                        });
                    
                    // 再次更新显示
                    currentSettingsState.updateMessageList();
                }
            }
            
            alert(`成功导入 ${newMessages.length} 条新消息和 ${newFilterRulesCount} 条过滤规则`);
        } catch (error) {
            console.error('导入失败:', error);
            alert('导入失败：文件格式错误');
        }
    };
    reader.readAsText(file);
};

// 添加批量处理函数
const processBatch = (messages, batchSize = 1000) => {
    const total = messages.length;
    let processed = 0;
    
    const processNextBatch = () => {
        const batch = messages.slice(processed, processed + batchSize);
        batch.forEach(msg => {
            // 处理消息的逻辑
        });
        
        processed += batch.length;
        
        if (processed < total) {
            setTimeout(processNextBatch, 0); // 让出主线程
        }
    };
    
    processNextBatch();
};

// 添加统一的错误处理函数
const handleError = (error, operation) => {
    console.error(`Error during ${operation}:`, error);
    alert(`操作失败：${operation}\n${error.message}`);
};

// 在 try-catch 中使用
try {
    // 操作代码
} catch (error) {
    handleError(error, '保存消息');
}

// 添加时间处理工具函数
const dateUtils = {
    formatTime: (date) => {
        return `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
    },
    
    parseTime: (timeString) => {
        const date = timeString.slice(0, 8);
        const time = timeString.slice(9);
        return new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)} ${time}`);
    }
};
