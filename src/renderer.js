// 在文件顶部定义版本号和初始化标志
const PLUGIN_VERSION = '1.0.3';
let versionLogged = false;

// 将 filterManager 移到全局作用域
const filterManager = {
    // 存储过滤规则的键名
    STORAGE_KEY: 'message_filter_rules',
    
    // 获取所有过滤规则
    getRules() {
        const rules = stateManager.load(this.STORAGE_KEY, {});
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
        const selectedField = field || 'content'; // 默认使用content字段
        if (!rules[selectedField].includes(value)) {
            rules[selectedField].push(value);
            stateManager.save(this.STORAGE_KEY, rules);
        }
    },
    
    // 删除过滤规则
    removeRule(field, value) {
        const rules = this.getRules();
        rules[field] = rules[field].filter(v => v !== value);
        stateManager.save(this.STORAGE_KEY, rules);
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
    },

    importRules(rules) {
        const currentRules = this.getRules();
        const newRules = {
            type: [...new Set([...currentRules.type, ...(rules.type || [])])],
            groupName: [...new Set([...currentRules.groupName, ...(rules.groupName || [])])],
            sender: [...new Set([...currentRules.sender, ...(rules.sender || [])])],
            time: [...new Set([...currentRules.time, ...(rules.time || [])])],
            content: [...new Set([...currentRules.content, ...(rules.content || [])])]
        };
        stateManager.save(this.STORAGE_KEY, newRules);
    }
};

export const onSettingWindowCreated = (view) => {
    if (!versionLogged) {
        console.log(`[MessageSave] ${PLUGIN_VERSION} had loaded `);
        versionLogged = true;
    }
    
    // 首先确保消息已加载
    loadSavedMessages();
    const settingsHtml = `
        <setting-section data-title="消息记录${PLUGIN_VERSION}">
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
                                <setting-option data-value="type">消息类型</setting-option>
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

        // 使用文档片段减少重绘
        const fragment = document.createDocumentFragment();
        messages.forEach(msg => {
            const item = document.createElement('setting-item');
            item.innerHTML = `
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
            `;
            fragment.appendChild(item);
        });

        const messageList = view.querySelector('#messageList');
        if (messageList) {
            messageList.innerHTML = '';
            messageList.appendChild(fragment);
        }

        // 更新统计信息
        updateStatistics();
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
    const messages = state.filteredMessages.length > 0 ? state.filteredMessages : globalState.savedMessages;
    const filterRules = filterManager.getRules();
    const exportData = {
        messages,
        filterRules,
        version: '1.0.3',
        exportTime: new Date().toISOString()
    };

    let content;
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
    const fileName = `QQ消息记录_${dateStr}`;

    switch (format) {
        case 'json':
            content = JSON.stringify(exportData, null, 2);
            break;
        case 'txt':
            content = `消息记录:\n` +
                messages.map(msg => 
                    `[${msg.time}] ` +
                    `${msg.type === '群消息' ? `[${msg.groupName}] ` : ''}` +
                    `${msg.sender}: ${msg.content}`
                ).join('\n') +
                `\n\n过滤规则:\n` +
                Object.entries(filterRules)
                    .map(([field, values]) => values.map(value => `${field}: ${value}`).join('\n'))
                    .join('\n');
            break;
        case 'csv':
            content = 'Type,Group,Sender,Time,Content\n' +
                messages.map(msg => 
                    `"${msg.type}","${msg.type === '群消息' ? msg.groupName : ''}",` +
                    `"${msg.sender}","${msg.time}","${msg.content}"`
                ).join('\n') +
                '\n\nFilter Field,Filter Value\n' +
                Object.entries(filterRules)
                    .flatMap(([field, values]) => values.map(value => `"${field}","${value}"`))
                    .join('\n');
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
        const rules = filterManager.getRules();
        const filterRulesList = view.querySelector('#filterRulesList');
        
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

    // 设置默认选择为"content"
    const filterField = view.querySelector('#filterField');
    if (filterField) {
        const contentOption = filterField.querySelector('setting-option[data-value="content"]');
        if (contentOption) {
            contentOption.setAttribute('is-selected', 'true');
        }
    }

    // 修改过滤规则按钮事件
    const addFilterButton = view.querySelector('#addFilterButton');
    const filterValue = view.querySelector('#filterValue');

    addFilterButton.addEventListener('click', () => {
        const selectedOption = filterField.querySelector('setting-option[is-selected]');
        const field = selectedOption ? selectedOption.getAttribute('data-value') : 'content';
        const value = filterValue.value.trim();
        
        if (value) {
            filterManager.addRule(field, value);
            filterValue.value = '';
            updateFilterRulesList();
        }
    });

    // 添加删除过滤规则的全局函数
    window.removeFilterRule = (field, value) => {
        filterManager.removeRule(field, value);
        updateFilterRulesList();
    };

    // 初始显示过滤规则
    updateFilterRulesList();
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
    if (!versionLogged) {
        console.log(`[MessageSave] ${PLUGIN_VERSION} had loaded `);
        versionLogged = true;
    }
    
    if (globalState.isInitializing) return;
    globalState.isInitializing = true;

    setTimeout(() => {
        const observer = new MutationObserver((mutations) => {
            const now = Date.now();
            if (now - globalState.lastProcessedTime < 100) return;
            globalState.lastProcessedTime = now;

            const messageNodes = document.querySelectorAll('.recent-contact-item');
            const messages = [];
            
            messageNodes.forEach(node => {
                const messageInfo = extractMessageInfo(node);
                if (messageInfo) {
                    messages.push(messageInfo.data);
                }
            });

            processMessages(messages);
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: false, // 减少不必要的属性变化监听
            characterData: false // 减少不必要的文本变化监听
        });

        globalState.observer = observer;
        globalState.initialized = true;
    }, 2000);
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
        const saved = localStorage.getItem(getStorageKey()); // 使用动态存储键
        if (saved) {
            globalState.savedMessages = JSON.parse(saved);
            
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

// 修改导入函数，添加过滤规则导入
const importMessages = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // 验证导入的数据格式
            if (!importedData.messages || !Array.isArray(importedData.messages)) {
                alert('导入失败：无效的文件格式');
                return;
            }

            // 处理消息导入
            const existingKeys = new Set(globalState.savedMessages.map(msg => generateMessageKey(msg)));
            const newMessages = importedData.messages.filter(msg => !existingKeys.has(generateMessageKey(msg)));
            globalState.savedMessages = [...globalState.savedMessages, ...newMessages];
            newMessages.forEach(msg => {
                globalState.knownMessages.add(generateMessageKey(msg));
            });

            // 处理过滤规则导入
            if (importedData.filterRules) {
                filterManager.importRules(importedData.filterRules);
            }

            // 保存到本地存储
            localStorage.setItem(getStorageKey(), JSON.stringify(globalState.savedMessages));
            
            // 更新当前状态
            if (currentSettingsState) {
                currentSettingsState.state.filteredMessages = [...globalState.savedMessages].reverse();
                currentSettingsState.state.currentPage = 1;
                currentSettingsState.updateMessageList();
                updateFilterRulesList();
            }
            
            alert(`成功导入 ${newMessages.length} 条新消息和过滤规则`);
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

// 添加状态管理工具
const stateManager = {
    save: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            handleError(error, '保存状态');
            return false;
        }
    },
    
    load: (key, defaultValue = null) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            handleError(error, '加载状态');
            return defaultValue;
        }
    }
};

// 修改消息处理逻辑，添加节流和批量处理
const processMessages = (() => {
    let processing = false;
    let pendingMessages = [];
    const BATCH_SIZE = 50; // 每批处理50条消息
    const PROCESS_INTERVAL = 500; // 每500ms处理一次

    return (messages) => {
        pendingMessages = pendingMessages.concat(messages);
        
        if (!processing) {
            processing = true;
            
            const processBatch = () => {
                if (pendingMessages.length > 0) {
                    const batch = pendingMessages.splice(0, BATCH_SIZE);
                    batch.forEach(message => {
                        const messageKey = generateMessageKey(message);
                        if (!globalState.knownMessages.has(messageKey)) {
                            globalState.knownMessages.add(messageKey);
                            saveMessage(message);
                        }
                    });
                }

                if (pendingMessages.length > 0) {
                    setTimeout(processBatch, PROCESS_INTERVAL);
                } else {
                    processing = false;
                }
            };

            processBatch();
        }
    };
})();

// 添加内存清理函数
const cleanupMemory = () => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // 清理消息缓存
    for (const [key, timestamp] of globalState.messageCache) {
        if (now - timestamp > oneHour) {
            globalState.messageCache.delete(key);
            globalState.knownMessages.delete(key);
        }
    }

    // 清理过期的消息记录
    if (globalState.savedMessages.length > 10000) { // 当消息超过10000条时清理
        globalState.savedMessages = globalState.savedMessages.slice(-5000); // 保留最近5000条
        localStorage.setItem(getStorageKey(), JSON.stringify(globalState.savedMessages));
    }
};

// 定期执行内存清理
setInterval(cleanupMemory, 5 * 60 * 1000); // 每5分钟清理一次

// 添加更新统计信息的函数
const updateStatistics = () => {
    if (!currentSettingsState) return;

    const { view, state } = currentSettingsState;
    if (!view || !state) return;

    // 更新总消息数
    const totalCount = view.querySelector('#totalCount');
    if (totalCount) {
        totalCount.textContent = state.filteredMessages?.length || 0;
    }

    // 更新群消息数
    const groupCount = view.querySelector('#groupCount');
    if (groupCount) {
        groupCount.textContent = state.filteredMessages?.filter(m => m?.type === '群消息').length || 0;
    }

    // 更新私聊消息数
    const privateCount = view.querySelector('#privateCount');
    if (privateCount) {
        privateCount.textContent = state.filteredMessages?.filter(m => m?.type === '私聊消息').length || 0;
    }

    // 更新分页信息
    const maxPage = Math.ceil((state.filteredMessages?.length || 0) / (state.itemsPerPage || 50));
    const pageInfo = view.querySelector('#pageInfo');
    if (pageInfo) {
        pageInfo.textContent = `第 ${state.currentPage || 1} 页，共 ${maxPage} 页`;
    }

    // 更新按钮状态
    const prevButton = view.querySelector('#prevButton');
    const nextButton = view.querySelector('#nextButton');
    if (prevButton && nextButton) {
        const currentPage = state.currentPage || 1;
        prevButton.toggleAttribute('is-disabled', currentPage <= 1);
        nextButton.toggleAttribute('is-disabled', currentPage >= maxPage);
    }

    // 更新页码输入框的值
    const pageInput = view.querySelector('#pageInput');
    if (pageInput) {
        pageInput.value = state.currentPage || 1;
        pageInput.max = maxPage;
    }
};
