const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const timeHelper = require('../../../../../helper/time_helper.js');

Page({
  data: {
    isLoad: false,
    reportId: '',
    report: null,
    showAiResult: false,
    isAnalyzing: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    if (!options || !options.id) {
      pageHelper.showNoneToast('报告ID参数错误');
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      reportId: options.id
    });
    
    this._loadReportDetail().then(() => {
      // 如果有analyze=true参数，自动触发AI分析
      if (options.analyze === 'true' && this.data.report) {
        console.log('检测到analyze=true参数，自动触发AI分析');
        // 稍微延迟执行分析，让页面先完成渲染
        setTimeout(() => {
          this.bindAnalyzeByAI();
        }, 500);
      }
    });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: async function () {
    await this._loadReportDetail();
    wx.stopPullDownRefresh();
  },

  /**
   * 获取体检报告详情
   */
  _loadReportDetail: async function () {
    try {
      console.log('开始加载报告详情, reportId:', this.data.reportId);
      const params = {
        reportId: this.data.reportId
      };
      let options = {
        title: '加载中'
      };

      const result = await cloudHelper.callCloudData('medicalReport', {
        action: 'getReportDetail',
        params
      }, options);

      console.log('获取到报告详情:', result);
      
      if (!result) {
        console.error('未获取到报告详情');
        this.setData({
          isLoad: true
        });
        pageHelper.showNoneToast('未找到报告');
        return;
      }

      // 处理日期格式等数据
      if (result.aiAnalysisTime) {
        // 时间戳格式转换为可读格式
        console.log('AI分析时间:', result.aiAnalysisTime);
      }

      this.setData({
        report: result,
        isLoad: true,
        showAiResult: result && result.aiAnalysis
      });
      
      console.log('报告数据已设置到页面');
      return result;
    } catch (err) {
      console.error('加载报告详情失败:', err);
      this.setData({
        isLoad: true
      });
      pageHelper.showModal('加载报告失败，请稍后重试');
    }
  },

  /**
   * 日期格式化函数
   */
  formatDate: function(dateStr) {
    if (!dateStr) return '';
    
    try {
      // 支持多种格式
      let date;
      if (typeof dateStr === 'string') {
        if (dateStr.includes('T') || dateStr.includes('Z')) {
          date = new Date(dateStr);
        } else if (!isNaN(dateStr)) {
          date = new Date(parseInt(dateStr));
        } else {
          date = new Date(dateStr.replace(/-/g, '/'));
        }
      } else if (dateStr.constructor && dateStr.constructor.name === 'Object' && dateStr.$date) {
        // 服务器Date对象格式
        date = new Date(dateStr.$date);
      } else {
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) {
        console.error('无效的日期格式', dateStr);
        return dateStr;
      }
      
      return timeHelper.time('Y-M-D h:m:s', date);
    } catch (e) {
      console.error('日期格式化错误:', e);
      return dateStr;
    }
  },

  /**
   * 查看报告原始文件
   */
  bindViewFileTap: function () {
    if (!this.data.report || !this.data.report.reportFileId) {
      pageHelper.showModal('未找到报告文件');
      return;
    }

    // 处理多文件情况
    const fileIds = this.data.report.reportFileId.split(',');
    if (fileIds.length > 1) {
      // 如果是多个文件，弹出选择框
      const fileNames = this.data.report.reportFileName ? this.data.report.reportFileName.split('; ') : [];
      const items = fileIds.map((id, index) => {
        return {
          name: fileNames[index] || `文件${index + 1}`,
          id: id
        };
      });

      wx.showActionSheet({
        itemList: items.map(item => item.name),
        success: res => {
          const selectedFile = items[res.tapIndex];
          this._viewSingleFile(selectedFile.id);
        }
      });
    } else {
      // 单文件直接打开
      this._viewSingleFile(this.data.report.reportFileId);
    }
  },

  /**
   * 查看单个文件
   */
  _viewSingleFile: function(fileId) {
    wx.showLoading({ title: '加载文件中...' });
    
    // 根据文件ID获取临时链接并打开
    wx.cloud.getTempFileURL({
      fileList: [fileId],
      success: res => {
        wx.hideLoading();
        const tempFileURL = res.fileList[0].tempFileURL;
        this._openFile(tempFileURL);
      },
      fail: err => {
        wx.hideLoading();
        console.error('获取文件临时链接失败:', err);
        pageHelper.showModal('获取文件失败，请重试');
      }
    });
  },

  /**
   * 打开文件
   */
  _openFile: function(url) {
    console.log('打开文件URL:', url);
    
    if (url.toLowerCase().endsWith('.pdf')) {
      // PDF文件
      wx.showLoading({ title: '准备打开PDF...' });
      wx.downloadFile({
        url: url,
        success: function(res) {
          wx.hideLoading();
          const filePath = res.tempFilePath;
          console.log('PDF下载成功，临时路径:', filePath);
          wx.openDocument({
            filePath: filePath,
            success: function(res) {
              console.log('打开文档成功');
            },
            fail: function(error) {
              console.error('打开文档失败:', error);
              pageHelper.showModal('打开文档失败，请重试');
            }
          });
        },
        fail: function(error) {
          wx.hideLoading();
          console.error('下载文件失败:', error);
          pageHelper.showModal('下载文件失败，请重试');
        }
      });
    } else {
      // 图片文件
      console.log('预览图片');
      wx.previewImage({
        urls: [url],
        current: url,
        fail: function(error) {
          console.error('预览图片失败:', error);
          pageHelper.showModal('预览图片失败，请重试');
        }
      });
    }
  },

  /**
   * AI分析报告
   */
  bindAnalyzeByAI: async function() {
    if (!this.data.report) {
      pageHelper.showModal('报告不存在，无法分析');
      return;
    }

    if (this.data.isAnalyzing) {
      return;
    }

    try {
      this.setData({ isAnalyzing: true });
      
      wx.showLoading({ title: 'AI分析中...', mask: true });
      console.log('开始AI分析报告');
      
      // 准备AI分析所需内容
      let reportContent = '';
      
      // 如果有summary，放在最前面
      if (this.data.report.summary) {
        reportContent += '体检报告摘要: ' + this.data.report.summary + '\n\n';
      }
      
      // 添加基本信息
      reportContent += '体检日期: ' + this.data.report.reportDate + '\n';
      reportContent += '医院/机构: ' + this.data.report.hospital + '\n';
      reportContent += '报告类型: ' + this.data.report.reportType + '\n\n';
      
      // 添加报告明细项目
      if (this.data.report.reportItems && this.data.report.reportItems.length > 0) {
        reportContent += "体检项目详情:\n";
        this.data.report.reportItems.forEach(group => {
          reportContent += group.name + ':\n';
          
          if (group.items && group.items.length > 0) {
            group.items.forEach(item => {
              const abnormalMark = item.abnormal ? '[异常]' : '';
              reportContent += `  ${item.name}: ${item.value}${item.unit || ''} ${abnormalMark} (参考范围: ${item.referenceRange || '未知'})\n`;
            });
          }
          
          reportContent += '\n';
        });
      }
      
      console.log('准备分析的报告内容长度:', reportContent.length);
      
      // 调用AI分析云函数
      const params = {
        reportId: this.data.reportId,
        reportContent: reportContent
      };
      
      console.log('开始调用analyzeReportByAI云函数');
      const result = await cloudHelper.callCloudSumbitAsync('medicalReport', {
        action: 'analyzeReportByAI',
        params
      });
      
      console.log('AI分析云函数返回结果:', result);
      wx.hideLoading();
      
      if (result && result.code === 0) {
        await this._loadReportDetail(); // 重新加载报告以获取AI分析结果
        this.setData({ 
          showAiResult: true 
        });
        pageHelper.showSuccToast('分析完成');
      } else {
        console.error('AI分析失败, 错误信息:', result ? result.msg : '未知错误');
        pageHelper.showModal(result && result.msg ? result.msg : 'AI分析失败，请重试');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('AI分析过程中发生异常:', err);
      pageHelper.showModal('AI分析失败，请稍后重试');
    } finally {
      this.setData({ isAnalyzing: false });
    }
  },
  
  /**
   * 切换显示/隐藏AI分析结果
   */
  toggleAiResult: function() {
    this.setData({
      showAiResult: !this.data.showAiResult
    });
  }
}); 