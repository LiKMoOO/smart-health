# AI医生功能说明

## 功能概述

AI医生功能是体检预约小程序的一项创新功能，通过接入DeepSeek AI模型API，为用户提供基础的健康咨询服务。用户可以咨询常见健康问题、体检相关问题，获取健康建议等。此功能旨在提升用户体验，为用户提供更便捷的健康咨询入口。

## 技术实现

1. **前端实现**：
   - 采用微信小程序原生组件构建聊天界面
   - 支持文本消息发送和接收
   - 提供预设问题快捷选择
   - 实现消息加载状态显示

2. **后端实现**：
   - 通过云函数调用DeepSeek API
   - 使用HTTPS模块发送请求
   - 处理API响应并返回给前端

3. **AI服务**：
   - 使用DeepSeek Chat模型
   - 支持多轮对话上下文
   - 提供专业健康咨询回复

## 使用方法

1. 在小程序中点击底部导航栏的"AI医生"图标进入AI医生页面
2. 在输入框中输入您的健康问题，或点击预设问题
3. 点击发送按钮，等待AI回复
4. 继续提问即可进行多轮对话

## 配置说明

需要在云函数配置文件中设置DeepSeek API相关参数：

```javascript
// 在 cloudfunctions/cloud/config/config.js 中配置
DEEPSEEK_API_KEY: 'YOUR_DEEPSEEK_API_KEY', // 替换为您的DeepSeek API密钥
DEEPSEEK_API_ENDPOINT: 'https://api.deepseek.com/v1/chat/completions', // API端点
DEEPSEEK_MODEL: 'deepseek-chat' // 模型名称
```

## 文件结构

```
miniprogram/projects/A00/ai/doctor/
├── ai_doctor.js       # 页面逻辑
├── ai_doctor.json     # 页面配置
├── ai_doctor.wxml     # 页面结构
└── ai_doctor.wxss     # 页面样式

cloudfunctions/cloud/
├── project/
│   ├── controller/
│   │   └── ai_controller.js  # AI控制器
│   └── service/
│       └── ai_service.js     # AI服务实现
└── config/
    └── config.js             # 配置文件(包含API密钥等)
```

## 注意事项

1. **API密钥安全**：
   - DeepSeek API密钥仅存储在云函数配置中，不在前端暴露
   - 定期更新API密钥以提高安全性

2. **响应内容控制**：
   - 已配置system prompt引导AI仅提供医疗健康咨询
   - 避免回答与医疗健康无关的问题

3. **使用限制**：
   - AI医生提供的是一般性健康咨询，不能替代专业医疗诊断
   - 对于严重健康问题，系统会建议用户及时就医

4. **性能优化**：
   - 使用节流控制避免频繁API调用
   - 后端实现了错误处理机制

## 功能扩展建议

1. **添加语音输入**：整合微信语音识别，支持语音提问
2. **添加图片识别**：接入医学图像识别API，分析简单医学图像
3. **个性化体验**：基于用户的体检历史提供个性化健康建议
4. **预约关联**：允许AI医生直接帮助用户预约相关体检项目 