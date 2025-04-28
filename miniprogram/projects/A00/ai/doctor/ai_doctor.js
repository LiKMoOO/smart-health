const cloudHelper = require('../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');

Page({
  data: {
    chatList: [],
    inputContent: '',
    userAvatar: '/projects/A00/skin/images/tabbar/my.png',
    botAvatar: '/projects/A00/skin/images/tabbar/ai.png',
    lastId: '',
    loading: false,
    systemPrompt: '你是一位专业医生，名叫"AI医生"。你需要用友善的态度回答用户的医疗健康问题。如果用户询问的问题超出你的能力范围或者涉及紧急医疗情况，请建议用户及时就医。请用简体中文回答，回答要简洁明了。'
  },

  onLoad: function (options) {
    // 初始化聊天列表
    this.initChatList();
  },

  // 初始化聊天列表
  initChatList: function () {
    const welcomeMessage = {
      role: 'assistant',
      content: '您好！我是您的AI医生助手。请问有什么健康问题需要咨询吗？请注意，我提供的是一般性的健康咨询，如有紧急情况请立即就医。'
    };
    
    this.setData({
      chatList: [welcomeMessage],
      lastId: 'msg-0'
    });
  },

  // 处理输入变化
  inputChange: function (e) {
    this.setData({
      inputContent: e.detail.value
    });
  },

  // 处理回车键发送
  onKeyboardConfirm: function (e) {
    if (this.data.inputContent.trim()) {
      this.sendMessage();
    }
  },

  // 处理发送消息
  sendMessage: async function () {
    const content = this.data.inputContent.trim();
    if (!content || this.data.loading) return;

    // 添加用户消息到聊天列表
    const userMessage = {
      role: 'user',
      content: content
    };
    
    const newChatList = [...this.data.chatList, userMessage];
    const lastId = `msg-${newChatList.length - 1}`;
    
    this.setData({
      chatList: newChatList,
      inputContent: '',
      lastId: lastId,
      loading: true
    });

    try {
      // 调用云函数获取AI回复
      await this.getAIResponse(newChatList);
    } catch (error) {
      console.error('获取AI回复失败:', error);
      
      // 显示错误消息
      const errorMessage = {
        role: 'assistant',
        content: '抱歉，我暂时无法回答您的问题。请稍后再试。'
      };
      
      const updatedChatList = [...this.data.chatList, errorMessage];
      const newLastId = `msg-${updatedChatList.length - 1}`;
      
      this.setData({
        chatList: updatedChatList,
        lastId: newLastId,
        loading: false
      });
      
      pageHelper.showNoneToast('网络连接出错，请稍后重试');
    }
  },

  // 获取AI回复
  getAIResponse: async function (chatHistory) {
    try {
      // 准备消息历史，添加系统提示消息并确保格式正确
      const formatMessage = (role, content) => ({ role, content });
      
      const messages = [
        formatMessage('system', this.data.systemPrompt),
        ...chatHistory.map(item => formatMessage(item.role, item.content))
      ];

      // 在发送前确认消息格式正确
      console.log('发送消息:', JSON.stringify(messages));

      // 调用云函数
      const result = await cloudHelper.callCloudSumbit('ai/doctor', {
        messages: messages
      });

      if (result) {
        // 添加AI回复到聊天列表
        const aiMessage = {
          role: 'assistant',
          content: result.data && result.data.text ? result.data.text : '抱歉，无法获取回复内容'
        };
        
        const updatedChatList = [...this.data.chatList, aiMessage];
        const newLastId = `msg-${updatedChatList.length - 1}`;
        
        this.setData({
          chatList: updatedChatList,
          lastId: newLastId,
          loading: false
        });
      } else {
        throw new Error('无效的AI响应');
      }
    } catch (error) {
      console.error('AI响应错误:', error);
      throw error;
    }
  },

  // 点击提示问题
  tapHint: function (e) {
    const text = e.currentTarget.dataset.text;
    this.setData({
      inputContent: text
    });
    this.sendMessage();
  },
});