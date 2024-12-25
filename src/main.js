// 创建窗口时触发
exports.onBrowserWindowCreated = (window) => {
    // window 为 Electron 的 BrowserWindow 实例
}

// 用户登录时触发
exports.onLogin = (uid) => {
    // uid 为 QQNT 的 字符串 标识
}

// 插件加载时触发
export const onLoad = () => {
    console.log("Message Save 1.0.0 loaded");
};