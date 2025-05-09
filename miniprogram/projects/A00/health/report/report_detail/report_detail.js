const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');

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
        this.bindAnalyzeByAI();
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

      this.setData({
        report: result.data,
        isLoad: true,
        showAiResult: result.data && result.data.aiAnalysis
      });
      
      return result;
    } catch (err) {
      console.error(err);
      this.setData({
        isLoad: true
      });
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
        console.error(err);
        pageHelper.showModal('获取文件失败，请重试');
      }
    });
  },

  /**
   * 打开文件
   */
  _openFile: function(url) {
    if (url.toLowerCase().endsWith('.pdf')) {
      // PDF文件
      wx.downloadFile({
        url: url,
        success: function(res) {
          const filePath = res.tempFilePath;
          wx.openDocument({
            filePath: filePath,
            success: function(res) {
              console.log('打开文档成功');
            },
            fail: function(error) {
              console.error('打开文档失败', error);
              pageHelper.showModal('打开文档失败，请重试');
            }
          });
        },
        fail: function(error) {
          console.error('下载文件失败', error);
          pageHelper.showModal('下载文件失败，请重试');
        }
      });
    } else {
      // 图片文件
      wx.previewImage({
        urls: [url],
        current: url
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
      
      // 准备AI分析所需内容
      let reportContent = '';
      
      // 如果有summary，放在最前面
      if (this.data.report.summary) {
        reportContent += this.data.report.summary + '\n\n';
      }
      
      // 添加报告明细项目
      if (this.data.report.reportItems && this.data.report.reportItems.length > 0) {
        this.data.report.reportItems.forEach(group => {
          reportContent += group.name + ':\n';
          
          if (group.items && group.items.length > 0) {
            group.items.forEach(item => {
              const abnormalMark = item.abnormal ? '[异常]' : '';
              reportContent += `  ${item.name}: ${item.value}${item.unit} ${abnormalMark} (参考范围: ${item.referenceRange})\n`;
            });
          }
          
          reportContent += '\n';
        });
      }
      
      // 调用AI分析云函数
      const params = {
        reportId: this.data.reportId,
        reportContent: reportContent
      };
      
      const result = await cloudHelper.callCloudData('medicalReport', {
        action: 'analyzeReportByAI',
        params
      });
      
      wx.hideLoading();
      
      if (result && result.code === 0) {
        await this._loadReportDetail(); // 重新加载报告以获取AI分析结果
        this.setData({ showAiResult: true });
        pageHelper.showSuccToast('分析完成');
      } else {
        pageHelper.showModal(result.msg || 'AI分析失败，请重试');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('AI分析失败', err);
      pageHelper.showModal('AI分析失败，请重试');
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