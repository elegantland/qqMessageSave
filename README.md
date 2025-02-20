#  LiteLoaderQQNT 插件 - qq Message Save

一个QQ消息保存插件,目前QQ的最简单的保存消息内容的插件。觉得好用github给我点个star吧！

## 当前版本说明 (1.0.0)

- 目前仅支持保存文本消息
- 图片、表情、视频、转发消息等多媒体内容暂不支持（预计在2.0.0版本支持）
- 支持和 [MessageBlocker](https://github.com/elegantland/qqMessageBlocker) 插件共存
- 尽量不要多账号使用，liteloader不支持多账户不同配置，但是你能双开后退出前保存产生的消息记录下次再导入回去。
- 最近更新会很慢，就当这是一个纯文字消息导出插件

## 功能特点

- ✨ 自动保存所有群聊和私聊消息
- 🔍 支持消息搜索（按内容、发送者、群名搜索）
- 🔄 支持消息类型过滤（群聊/私聊）
- 📄 分页显示消息记录
- 💾 支持多种格式导出：
  - JSON 格式（完整数据）
  - TXT 格式（易读格式）
  - CSV 格式（可导入Excel）
- 🕒 完整的时间记录（YYYYMMDD HH:mm）

## 使用说明

### 基本使用
1. 安装插件后自动开始记录消息
2. 在设置界面可以进行以下操作：
   - 查看所有保存的消息
   - 搜索特定消息
   - 按类型筛选消息
   - 导出消息记录
   - 清除所有记录

### 搜索功能
- 支持搜索：消息内容、发送者名称、群名
- 支持回车快速搜索
- 可筛选显示群聊或私聊消息

### 导出功能
导出文件命名格式：`QQ消息记录_YYYYMMDD_HHmm.xxx`

## 安装方法

1. 下载插件
2. 将插件放入 LiteLoaderQQNT 插件目录
3. 重启 QQ 客户端

## 已知问题

1. 每次登录QQ时会重新拉取消息列表，可能导致少量消息重复保存
2. 数据量过大时可能影响性能，建议：
   - 定期导出备份数据
   - 及时清理不需要的记录
   - 后续版本将提供sql文件帮你存到数据库，方便管理大量数据
3.私聊功能混杂了系统消息

## 开发计划

### 2.0.0 版本
- [ ] 支持多媒体消息保存
  - 图片
  - 表情
  - 视频
  - 转发消息
- [ ] 支持QQ频道消息
- [ ] 优化数据管理
- [ ] 改进消息去重机制
- [ ] 导出需要toast提示
- [ ] 设置界面实时更新

## 更新历史

### 1.0.0
- ✅ 基础消息保存功能
- ✅ 搜索和导出功能
- ✅ 分页显示
- ✅ 支持和 MessageBlocker 共存

## 反馈与建议

如果你有任何问题或建议，欢迎提出 Issue和2543971286@qq.com。

## 注意事项

- 建议定期导出备份重要消息
- 定期清理不需要保存的消息记录
- 导出数据建议使用 JSON 格式，保留最完整的信息
