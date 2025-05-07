const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isLoading: false,
    testResults: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    
  },

  /**
   * 健康首页测试 - 通过cloudHelper
   */
  async testHealthIndexHelper() {
    this.setData({
      isLoading: true,
      testResults: []
    });
    
    try {
      // 通过cloudHelper调用
      const res = await cloudHelper.callCloudData('health/gethealthindex', {
        page: 1,
        size: 10,
        userId: 'oU8vA62GI1e4iVrDxZQNrjI7-ypc'
      });
      
      this.addTestResult('健康首页数据 (cloudHelper)', res);
    } catch (err) {
      this.addTestResult('健康首页数据 (cloudHelper) - 错误', err);
    }
    
    this.setData({
      isLoading: false
    });
  },
  
  /**
   * 健康首页测试 - 直接调用
   */
  testHealthIndexDirect() {
    this.setData({
      isLoading: true,
      testResults: []
    });
    
    // 直接调用cloud函数
    wx.cloud.callFunction({
      name: 'health',
      data: {
        route: 'health/gethealthindex',  // 必须指定route参数
        params: {
          page: 1,
          size: 10,
          userId: 'oU8vA62GI1e4iVrDxZQNrjI7-ypc'
        }
      }
    }).then(res => {
      this.addTestResult('健康首页数据 (直接调用)', res.result);
    }).catch(err => {
      this.addTestResult('健康首页数据 (直接调用) - 错误', err);
    }).finally(() => {
      this.setData({
        isLoading: false
      });
    });
  },
  
  /**
   * 健康首页测试 - 错误调用（不传route）
   */
  testHealthIndexNoRoute() {
    this.setData({
      isLoading: true,
      testResults: []
    });
    
    // 直接调用cloud函数，但不传route
    wx.cloud.callFunction({
      name: 'health',
      data: {
        // 不传route参数
        params: {
          page: 1,
          size: 10,
          userId: 'oU8vA62GI1e4iVrDxZQNrjI7-ypc'
        }
      }
    }).then(res => {
      this.addTestResult('健康首页数据 (不传route)', res.result);
    }).catch(err => {
      this.addTestResult('健康首页数据 (不传route) - 错误', err);
    }).finally(() => {
      this.setData({
        isLoading: false
      });
    });
  },
  
  /**
   * 健康指标测试
   */
  testHealthMetrics() {
    this.setData({
      isLoading: true,
      testResults: []
    });
    
    // 通过cloudHelper调用
    cloudHelper.callCloudData('health/gethealthmetrics', {
      page: 1,
      size: 10,
      type: null,
      userId: 'oU8vA62GI1e4iVrDxZQNrjI7-ypc'
    }).then(res => {
      this.addTestResult('健康指标数据', res);
    }).catch(err => {
      this.addTestResult('健康指标数据 - 错误', err);
    }).finally(() => {
      this.setData({
        isLoading: false
      });
    });
  },
  
  /**
   * 更新健康数据测试
   */
  testUpdateHealthData() {
    this.setData({
      isLoading: true,
      testResults: []
    });
    
    // 通过cloudHelper调用
    cloudHelper.callCloudData('health/updatehealthdata', {
      dataType: 'profile',
      userId: 'oU8vA62GI1e4iVrDxZQNrjI7-ypc',
      data: {
        basicInfo: {
          height: 175,
          weight: 68,
          gender: '男',
          age: 35
        }
      }
    }).then(res => {
      this.addTestResult('更新健康档案', res);
    }).catch(err => {
      this.addTestResult('更新健康档案 - 错误', err);
    }).finally(() => {
      this.setData({
        isLoading: false
      });
    });
  },
  
  /**
   * 添加健康指标测试
   */
  testAddHealthMetric() {
    this.setData({
      isLoading: true,
      testResults: []
    });
    
    // 通过cloudHelper调用
    cloudHelper.callCloudData('health/updatehealthdata', {
      dataType: 'metrics',
      userId: 'oU8vA62GI1e4iVrDxZQNrjI7-ypc',
      data: {
        type: 'blood_pressure',
        value: { systolic: 120, diastolic: 80 },
        recordTime: Date.now()
      }
    }).then(res => {
      this.addTestResult('添加血压记录', res);
    }).catch(err => {
      this.addTestResult('添加血压记录 - 错误', err);
    }).finally(() => {
      this.setData({
        isLoading: false
      });
    });
  },
  
  /**
   * 添加测试结果
   */
  addTestResult(title, data) {
    const testResults = this.data.testResults;
    testResults.push({
      title,
      data: JSON.stringify(data, null, 2)
    });
    this.setData({
      testResults
    });
  },
  
  /**
   * 清空测试结果
   */
  clearResults() {
    this.setData({
      testResults: []
    });
  }
}); 