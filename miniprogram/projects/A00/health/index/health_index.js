const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

// 缓存相关常量
const CACHE_KEY = 'health_index_data';
const CACHE_EXPIRE = 5 * 60 * 1000; // 5分钟缓存
const PAGE_SIZE = 10; // 分页大小

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isLoad: false,
    userInfo: null,
    healthInfo: null,
    recentMetrics: [], // 最近的健康数据记录
    recentReminders: [], // 最近的用药提醒
    metricsPage: 1, // 健康指标分页
    hasMoreMetrics: true, // 是否有更多指标数据
    healthWarnings: [], // 健康异常提醒
    moduleList: [{
      name: '健康档案',
      icon: '../../../../projects/A00/skin/images/health/profile.png',
      path: '../profile/health_profile'
    }, {
      name: '健康指标',
      icon: '../../../../projects/A00/skin/images/health/metrics.png',
      path: '../metrics/health_metrics'
    }, {
      name: '体检报告',
      icon: '../../../../projects/A00/skin/images/health/report.png',
      path: '../report/health_report'
    }, {
      name: '用药提醒',
      icon: '../../../../projects/A00/skin/images/health/medication.png',
      path: '../medication/health_medication'
    }, {
      name: '健康日志',
      icon: '../../../../projects/A00/skin/images/health/journal.png',
      path: '../journal/health_journal'
    }, {
      name: '健康分析',
      icon: '../../../../projects/A00/skin/images/health/analysis.png',
      path: '../analysis/health_analysis'
    }]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this._showLoading();
    this._loadData().then(() => {
      this._hideLoading();
      this._preloadImages(); // 预加载图片
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 检查是否需要刷新数据
    const lastUpdate = wx.getStorageSync('last_health_update');
    if (!lastUpdate || Date.now() - lastUpdate > 5 * 60 * 1000) {
      this.refreshData();
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {
    wx.showNavigationBarLoading();
    this._loadData().then(() => {
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
    }).catch(err => {
      this._handleNetworkError(err);
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {
    if (this.data.hasMoreMetrics) {
      this._loadMoreMetrics();
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '个人健康管理',
      path: '/projects/A00/health/index/health_index'
    }
  },

  /**
   * 跳转到体检报告页面
   */
  bindReportTap: function() {
    wx.navigateTo({
      url: '../report/health_report',
    });
  },

  // 加载首页数据
  async _loadData() {
    try {
      // 获取用户健康数据
      const healthData = await this._getHealthData();
      
      // 验证数据
      if (!this._validateHealthData(healthData)) {
        throw new Error('健康数据无效');
      }
      
      // 计算BMI值
      if (healthData.profile && healthData.profile.basicInfo && 
          healthData.profile.basicInfo.height && healthData.profile.basicInfo.weight) {
        healthData.profile.basicInfo.bmi = this._calculateBMI(
          healthData.profile.basicInfo.height,
          healthData.profile.basicInfo.weight
        );
      }
      
      // 检查健康指标是否有异常
      const warnings = this._checkHealthMetrics(healthData.metrics || []);
      
      this.setData({
        isLoad: true,
        healthInfo: healthData.profile || null,
        recentMetrics: healthData.metrics || [],
        recentReminders: healthData.reminders || [],
        metricsPage: 1,
        hasMoreMetrics: (healthData.metrics || []).length === PAGE_SIZE,
        healthWarnings: warnings
      });
      
      // 记录更新时间
      wx.setStorageSync('last_health_update', Date.now());
      
      // 如果有健康异常，显示提醒
      if (warnings.length > 0) {
        setTimeout(() => {
          this._showHealthWarnings(warnings);
        }, 1000);
      }
      
      return healthData;
    } catch (err) {
      console.error('加载健康数据失败：', err);
      this.setData({
        isLoad: true
      });
      this._handleError('加载健康数据失败，请重试');
      throw err;
    }
  },

  // 计算BMI值
  _calculateBMI(height, weight) {
    if (!height || !weight) return '--';
    // 确保输入值为数字
    height = parseFloat(height);
    weight = parseFloat(weight);
    
    if (isNaN(height) || isNaN(weight) || height <= 0 || weight <= 0) return '--';
    
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  },

  // 获取健康数据，添加缓存机制
  async _getHealthData() {
    try {
      // 读取缓存
      const cache = wx.getStorageSync(CACHE_KEY);
      if (cache && cache.timestamp && Date.now() - cache.timestamp < CACHE_EXPIRE) {
        return cache.data;
      }
      
      // 调用云函数获取健康数据
      const res = await cloudHelper.callCloudData('health/gethealthindex', {
        page: this.data.metricsPage,
        size: PAGE_SIZE
      });
      
      if (!res || !res.data) {
        throw new Error('获取数据失败');
      }
      
      // 更新缓存
      wx.setStorageSync(CACHE_KEY, {
        data: res.data,
        timestamp: Date.now()
      });
      
      // 脱敏敏感数据
      const healthData = this._maskSensitiveData(res.data);
      
      // 防御性检查，确保返回数据不为空
      if (!healthData) {
        console.warn('健康数据返回为空，使用默认数据');
        return {
          profile: {
            basicInfo: {
              height: '',
              weight: '',
              gender: '',
              age: ''
            }
          },
          metrics: [],
          reminders: []
        };
      }
      
      // 处理健康档案数据
      if (healthData.profile) {
        // 如果基本信息是JSON字符串，则解析
        if (typeof healthData.profile.HEALTH_PROFILE_BASIC === 'string') {
          try {
            healthData.profile.basicInfo = JSON.parse(healthData.profile.HEALTH_PROFILE_BASIC);
          } catch (e) {
            console.error('解析基本信息失败:', e);
            healthData.profile.basicInfo = {};
          }
        } else if (healthData.profile.HEALTH_PROFILE_BASIC) {
          // 如果已经是对象
          healthData.profile.basicInfo = healthData.profile.HEALTH_PROFILE_BASIC;
        } else {
          // 默认空对象
          healthData.profile.basicInfo = {};
        }
      }
      
      return healthData;
    } catch (err) {
      console.error('获取健康数据出错：', err);
      // 如果获取失败，返回空数据结构而不是模拟数据
      return {
        profile: {
          basicInfo: {
            height: '',
            weight: '',
            gender: '',
            age: ''
          }
        },
        metrics: [],
        reminders: []
      };
    }
  },

  // 加载更多健康指标数据
  async _loadMoreMetrics() {
    try {
      const nextPage = this.data.metricsPage + 1;
      
      const res = await cloudHelper.callCloudData('health/gethealthmetrics', {
        page: nextPage,
        size: PAGE_SIZE
      });
      
      if (!res || !res.data || !res.data.list) {
        throw new Error('获取更多数据失败');
      }
      
      const newMetrics = res.data.list;
      
      this.setData({
        recentMetrics: [...this.data.recentMetrics, ...newMetrics],
        metricsPage: nextPage,
        hasMoreMetrics: newMetrics.length === PAGE_SIZE
      });
    } catch (err) {
      console.error('加载更多健康指标失败:', err);
      this._handleError('加载更多数据失败');
    }
  },

  // 跳转到具体功能模块
  gotoModule: function(e) {
    try {
      const index = e.currentTarget.dataset.index;
      if (index === undefined || !this.data.moduleList[index]) {
        console.error('无效的模块索引:', index);
        return pageHelper.showModal('应用出错，请重试');
      }
      
      const path = this.data.moduleList[index].path;
      wx.navigateTo({
        url: path,
        fail: (err) => {
          console.error('跳转页面失败:', err);
          pageHelper.showModal('页面跳转失败，请重试');
        }
      });
    } catch (err) {
      console.error('模块跳转错误:', err);
      pageHelper.showModal('操作失败，请重试');
    }
  },

  // 刷新页面
  refreshData: function() {
    this._showLoading();
    this._loadData().finally(() => {
      this._hideLoading();
    });
  },
  
  // 更新健康数据
  async updateHealthData(data) {
    try {
      this._showLoading();
      await cloudHelper.callCloudData('health/updatehealthdata', data);
      
      // 清除缓存，强制刷新
      wx.removeStorageSync(CACHE_KEY);
      wx.setStorageSync('last_health_update', Date.now());
      
      this._loadData();
      this._hideLoading();
      return true;
    } catch (err) {
      console.error('更新健康数据失败:', err);
      this._hideLoading();
      this._handleError('更新失败，请重试');
      return false;
    }
  },
  
  // 检查健康指标是否有异常
  _checkHealthMetrics(metrics) {
    const warnings = [];
    
    metrics.forEach(metric => {
      switch(metric.type) {
        case 'blood_pressure':
          if (metric.value && metric.value.systolic > 140 || metric.value.diastolic > 90) {
            warnings.push('您的血压偏高，请注意休息');
          }
          break;
        case 'blood_sugar':
          if (metric.value > 7.8) {
            warnings.push('您的血糖偏高，请注意饮食');
          }
          break;
        case 'heart_rate':
          if (metric.value > 100) {
            warnings.push('您的心率偏快，请注意休息');
          } else if (metric.value < 60) {
            warnings.push('您的心率偏慢，如有不适请咨询医生');
          }
          break;
        case 'weight':
          const bmi = this.data.healthInfo?.basicInfo?.bmi;
          if (bmi && bmi > 28) {
            warnings.push('您的BMI指数偏高，建议控制饮食并增加运动');
          } else if (bmi && bmi < 18.5) {
            warnings.push('您的BMI指数偏低，建议加强营养');
          }
          break;
      }
    });
    
    return warnings;
  },
  
  // 显示健康异常提醒
  _showHealthWarnings(warnings) {
    if (warnings.length > 0) {
      wx.showModal({
        title: '健康提醒',
        content: warnings.join('\n'),
        showCancel: false
      });
    }
  },
  
  // 预加载图片
  _preloadImages() {
    this.data.moduleList.forEach(module => {
      wx.getImageInfo({
        src: module.icon,
        fail: (err) => console.error('图片预加载失败：', err)
      });
    });
  },
  
  // 显示加载动画
  _showLoading() {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
  },
  
  // 隐藏加载动画
  _hideLoading() {
    wx.hideLoading();
  },
  
  // 网络错误处理
  _handleNetworkError(err) {
    console.error('网络错误：', err);
    wx.showModal({
      title: '网络错误',
      content: '请检查网络连接后重试',
      showCancel: false
    });
  },
  
  // 通用错误处理
  _handleError(message) {
    pageHelper.showNoneToast(message);
  },
  
  // 数据验证
  _validateHealthData(data) {
    if (!data) return false;
    
    // 验证基本信息
    if (data.profile?.basicInfo) {
      const { height, weight } = data.profile.basicInfo;
      if (height && (parseFloat(height) < 50 || parseFloat(height) > 250)) {
        console.warn('身高数据异常:', height);
        return false;
      }
      if (weight && (parseFloat(weight) < 20 || parseFloat(weight) > 200)) {
        console.warn('体重数据异常:', weight);
        return false;
      }
    }
    
    return true;
  },
  
  // 敏感数据脱敏
  _maskSensitiveData(data) {
    if (!data) return data;
    
    // 复制数据，避免修改原始数据
    const maskedData = JSON.parse(JSON.stringify(data));
    
    // 对敏感数据进行脱敏处理
    if (maskedData.profile?.basicInfo?.idNumber) {
      // 身份证号脱敏，只显示前4位和后4位
      const idNumber = maskedData.profile.basicInfo.idNumber;
      if (idNumber.length > 8) {
        maskedData.profile.basicInfo.idNumber = 
          idNumber.substring(0, 4) + '********' + idNumber.substring(idNumber.length - 4);
      }
    }
    
    if (maskedData.profile?.basicInfo?.phone) {
      // 手机号脱敏，只显示前3位和后4位
      const phone = maskedData.profile.basicInfo.phone;
      if (phone.length > 7) {
        maskedData.profile.basicInfo.phone = 
          phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
      }
    }
    
    return maskedData;
  }
}) 