export const onSettingWindowCreated = (view) => {
    // 首先确保消息已加载
    loadSavedMessages();

    // 创建设置界面1.0.0
    const settingsHtml = `
        <setting-section data-title="消息记录">
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
                        <setting-button data-type="secondary" id="clearButton">清除所有消息</setting-button>
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
    
    // 搜索功能
    const doSearch = () => {
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
    };

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
            localStorage.setItem('message_save_messages', '[]');
            state.filteredMessages = [];
            updateMessageList();
        }
    });

// 导出消息函数
const exportMessages = (format) => {
    const messages = state.filteredMessages.length > 0 ? state.filteredMessages : globalState.savedMessages;
    let content;

    // 生成更友好的文件名
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
    const fileName = `QQ消息记录_${dateStr}`;

    // 处理导出的消息，移除不需要的字段并格式化时间
    const processedMessages = messages.map(msg => {
        // 创建消息的副本，避免修改原始数据
        const { captureTime, ...messageWithoutCapture } = msg;
        return messageWithoutCapture;
    });

    switch (format) {
        case 'json':
            content = JSON.stringify(processedMessages, null, 2);
            break;
        case 'txt':
            content = processedMessages.map(msg => 
                `[${msg.time}] ` +
                `${msg.type === '群消息' ? `[${msg.groupName}] ` : ''}` +
                `${msg.sender}: ${msg.content}`
            ).join('\n');
            break;
        case 'csv':
            content = 'Type,Group,Sender,Time,Content\n' +
                processedMessages.map(msg => 
                    `"${msg.type}","${msg.type === '群消息' ? msg.groupName : ''}",` +
                    `"${msg.sender}","${msg.time}","${msg.content}"`
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

// 调试函数
const debugMessage = (message, data, key) => {
    console.log(`${message}:
    Type: ${data.type}
    ${data.type === '群消息' ? 'Group: ' + data.groupName + '\n    ' : ''}Sender: ${data.sender}
    Content: ${data.content}
    Time: ${data.time}
    Key: ${key}
    Known Messages: ${globalState.knownMessages.size}`);
};

// 检查消息是否相同
const isSameMessage = (msg1, msg2) => {
    if (!msg1 || !msg2) return false;
    return msg1.type === msg2.type &&
           msg1.sender === msg2.sender &&
           msg1.time === msg2.time &&
           msg1.content === msg2.content &&
           (msg1.type === '群消息' ? msg1.groupName === msg2.groupName : true);
};

// Vue组件挂载时触发
export const onVueComponentMount = (component) => {
    if (globalState.isInitializing) return;
    globalState.isInitializing = true;

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
};

function extractMessageInfo(node) {
    const title = node.querySelector('.main-info .text-ellipsis span');
    const time = node.querySelector('.secondary-info');
    const content = node.querySelector('.summary-main');
    
    if (!title || !time || !content) return null;

    const isGroup = title.textContent.includes('群') || node.querySelector('.member-count');
    let data;
    
    if (isGroup) {
        const messageText = content.textContent;
        const [sender, ...messageParts] = messageText.split('：');
        const message = messageParts.join('：');

        data = {
            type: '群消息',
            groupName: title.textContent.trim(),
            time: time.textContent.trim(),
            sender: sender.trim(),
            content: message.trim()
        };
    } else {
        data = {
            type: '私聊消息',
            sender: title.textContent.trim(),
            time: time.textContent.trim(),
            content: content.textContent.trim()
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

// 保存消息到本地存储
const saveMessage = (message) => {
    try {
        const now = new Date();
        const fullTime = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')} ${message.time}`;
        
        const messageWithFullTime = {
            ...message,
            time: fullTime
        };

        const messageKey = generateMessageKey(messageWithFullTime);
        const messageExists = globalState.savedMessages.some(msg => 
            generateMessageKey(msg) === messageKey
        );

        if (!messageExists) {
            globalState.savedMessages.push(messageWithFullTime);
            localStorage.setItem(
                'message_save_messages',
                JSON.stringify(globalState.savedMessages)
            );
            updateSettingsWindow();
        }
    } catch (error) {
        console.error('Failed to save message:', error);
    }
};

// 从本地存储加载消息
const loadSavedMessages = () => {
    try {
        const saved = localStorage.getItem('message_save_messages');
        if (saved) {
            globalState.savedMessages = JSON.parse(saved);
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