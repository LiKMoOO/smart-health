const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 表单数据
    formData: {
      medicationName: '',
      dosage: '',
      unit: '片',
      frequency: '每日一次',
      reminderTime: [],
      startDate: '',
      endDate: '',
      notes: '',
      beforeMeal: false, // 默认饭后服用
    },
    
    // 单位选项
    unitOptions: ['片', '毫克', '克', '毫升', '支', '粒', '丸', '包', '袋', '滴', '喷', '其他'],
    unitIndex: 0,
    
    // 频率选项
    frequencyOptions: ['每日一次', '每日两次', '每日三次', '每周一次', '每周两次', '每周三次', '需要时服用', '其他'],
    frequencyIndex: 0,
    
    // 时间选择器
    showTimePicker: false,
    hours: Array.from({length: 24}, (_, i) => i < 10 ? '0' + i : '' + i),
    minutes: Array.from({length: 60}, (_, i) => i < 10 ? '0' + i : '' + i),
    timePickerValue: [8, 0],  // 默认8:00
    
    // 正在提交
    isSubmitting: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 初始化表单
    this._initForm();
  },
  
  /**
   * 初始化表单数据
   */
  _initForm: function() {
    // 设置当前日期为开始日期
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    const startDate = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
    
    // 默认添加一个上午8点的提醒
    const defaultTime = '08:00';
    
    this.setData({
      'formData.startDate': startDate,
      'formData.reminderTime': [defaultTime]
    });
  },
  
  /**
   * 单位选择器变化处理
   */
  bindUnitChange: function(e) {
    const index = e.detail.value;
    this.setData({
      unitIndex: index,
      'formData.unit': this.data.unitOptions[index]
    });
  },
  
  /**
   * 频率选择器变化处理
   */
  bindFrequencyChange: function(e) {
    const index = e.detail.value;
    this.setData({
      frequencyIndex: index,
      'formData.frequency': this.data.frequencyOptions[index]
    });
  },
  
  /**
   * 饭前/饭后单选按钮处理
   */
  bindBeforeMealTap: function(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'formData.beforeMeal': value
    });
  },
  
  /**
   * 开始日期选择器变化处理
   */
  bindStartDateChange: function(e) {
    const date = e.detail.value;
    this.setData({
      'formData.startDate': date
    });
  },
  
  /**
   * 结束日期选择器变化处理
   */
  bindEndDateChange: function(e) {
    const date = e.detail.value;
    this.setData({
      'formData.endDate': date
    });
  },
  
  /**
   * 添加时间点按钮处理
   */
  bindAddTimeTap: function() {
    // 显示时间选择器
    this.setData({
      showTimePicker: true,
      timePickerValue: [8, 0]  // 默认设置为8:00
    });
  },
  
  /**
   * 删除时间点处理
   */
  bindDeleteTime: function(e) {
    const index = e.currentTarget.dataset.index;
    let reminderTime = [...this.data.formData.reminderTime];
    reminderTime.splice(index, 1);
    
    this.setData({
      'formData.reminderTime': reminderTime
    });
  },
  
  /**
   * 关闭时间选择器
   */
  bindCloseTimePicker: function() {
    this.setData({
      showTimePicker: false
    });
  },
  
  /**
   * 时间选择器变化处理
   */
  bindTimePickerChange: function(e) {
    this.setData({
      timePickerValue: e.detail.value
    });
  },
  
  /**
   * 确认时间选择
   */
  bindConfirmTimePicker: function() {
    const [hourIndex, minuteIndex] = this.data.timePickerValue;
    const hour = this.data.hours[hourIndex];
    const minute = this.data.minutes[minuteIndex];
    
    const time = `${hour}:${minute}`;
    
    // 检查是否已存在相同时间
    if (this.data.formData.reminderTime.includes(time)) {
      pageHelper.showNoneToast('该时间已存在');
      return;
    }
    
    // 添加时间并按时间排序
    let reminderTime = [...this.data.formData.reminderTime, time];
    reminderTime.sort();
    
    this.setData({
      'formData.reminderTime': reminderTime,
      showTimePicker: false
    });
  },
  
  /**
   * 取消按钮处理
   */
  bindCancelTap: function() {
    wx.navigateBack();
  },
  
  /**
   * 表单提交处理
   */
  bindFormSubmit: async function(e) {
    // 防止重复提交
    if (this.data.isSubmitting) return;
    
    // 获取表单数据
    const formData = e.detail.value;
    
    // 合并页面中的数据
    const data = {
      ...formData,
      unit: this.data.formData.unit,
      frequency: this.data.formData.frequency,
      reminderTime: this.data.formData.reminderTime,
      startDate: this.data.formData.startDate,
      endDate: this.data.formData.endDate,
      beforeMeal: this.data.formData.beforeMeal
    };
    
    // 表单验证
    if (!data.medicationName) {
      pageHelper.showModal('请输入药品名称');
      return;
    }
    
    if (data.reminderTime.length === 0) {
      pageHelper.showModal('请至少添加一个提醒时间');
      return;
    }
    
    if (!data.startDate) {
      pageHelper.showModal('请选择开始日期');
      return;
    }
    
    // 开始提交
    try {
      this.setData({ isSubmitting: true });
      
      // 调用云函数添加用药提醒
      const result = await cloudHelper.callCloudSumbit('medicationReminder', {
        action: 'addMedication',
        params: data
      }, {
        title: '保存中'
      });
      
      if (result && result.code === 0) {
        pageHelper.showSuccToast('添加成功');
        
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (err) {
      console.error('添加用药提醒失败', err);
      pageHelper.showModal('添加失败，请重试');
    } finally {
      this.setData({ isSubmitting: false });
    }
  }
}) 