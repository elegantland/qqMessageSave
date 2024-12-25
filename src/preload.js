// Electron 主进程 与 渲染进程 互相交互的桥梁
const { contextBridge, ipcRenderer } = require("electron");

// 在渲染进程的全局对象上暴露对象
contextBridge.exposeInMainWorld("Message_Save", {});