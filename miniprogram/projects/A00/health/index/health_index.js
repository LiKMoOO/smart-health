const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

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
    this._loadData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 页面显示
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {
    this._loadData();
    wx.stopPullDownRefresh();
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
      
      // 计算BMI值
      if (healthData.profile && healthData.profile.basicInfo && 
          healthData.profile.basicInfo.height && healthData.profile.basicInfo.weight) {
        healthData.profile.basicInfo.bmi = this._calculateBMI(
          healthData.profile.basicInfo.height,
          healthData.profile.basicInfo.weight
        );
      }
      
      this.setData({
        isLoad: true,
        healthInfo: healthData.profile || null,
        recentMetrics: healthData.metrics || [],
        recentReminders: healthData.reminders || []
      });
    } catch (err) {
      console.error('加载健康数据失败：', err);
      this.setData({
        isLoad: true
      });
      pageHelper.showNoneToast('加载健康数据失败，请重试');
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

  // 获取健康数据
  async _getHealthData() {
    try {
      // 调用云函数获取健康数据
      const healthData = await cloudHelper.callCloudData('health/gethealthindex', {});
      
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
    this._loadData();
  }
}) 