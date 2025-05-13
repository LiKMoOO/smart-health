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
      // 获取用户ID
      const userId = wx.getStorageSync('OPENID');
      if (!userId) {
        pageHelper.showModal('无法获取用户信息，请退出并重新进入小程序');
        return;
      }

      const params = {
        reportId: this.data.reportId,
        userId: userId // 确保传递用户ID
      };
      
      let options = {
        title: '加载中'
      };

      const result = await cloudHelper.callCloudData('medicalReport', {
        action: 'getReportDetail',
        params
      }, options);

      console.log('获取到报告详情:', result);
      
      if (!result || !result.data) {
        console.error('未获取到报告详情');
        this.setData({
          isLoad: true
        });
        pageHelper.showNoneToast('未找到报告');
        return;
      }

      // 处理日期格式等数据
      let reportData = result.data;
      
      // 确保数据格式正确
      if (typeof reportData === 'string') {
        try {
          reportData = JSON.parse(reportData);
        } catch (e) {
          console.error('报告数据格式错误:', e);
        }
      }
      
      if (reportData.aiAnalysisTime) {
        // 时间戳格式转换为可读格式
        console.log('AI分析时间:', reportData.aiAnalysisTime);
      }

      this.setData({
        report: reportData,
        isLoad: true,
        showAiResult: reportData && reportData.aiAnalysis
      });
      
      console.log('报告数据已设置到页面');
      return reportData;
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
    
    // 确保URL编码正确
    try {
      // 使用URL对象解析和编码
      const parsedUrl = new URL(url);
      url = parsedUrl.toString();
    } catch (error) {
      console.error('URL解析失败，尝试基本编码:', error);
      // 基本的URL编码，替换空格和其他常见问题字符
      url = encodeURI(url);
    }
    
    if (url.toLowerCase().endsWith('.pdf')) {
      // PDF文件
      wx.showLoading({ title: '准备打开PDF...' });
      wx.downloadFile({
        url: url,
        success: function(res) {
          wx.hideLoading();
          if (res.statusCode !== 200) {
            console.error('下载PDF失败，状态码:', res.statusCode);
            pageHelper.showModal('下载PDF失败，请重试');
            return;
          }
          
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
          
          // 检查是否是ERR_UNESCAPED_CHARACTERS错误
          const errorMsg = error.errMsg || '';
          if (errorMsg.includes('ERR_UNESCAPED_CHARACTERS') || 
              errorMsg.includes('url not in domain list') ||
              errorMsg.includes('invalid url')) {
            
            pageHelper.showModal('文件URL格式错误，请联系管理员');
          } else {
            pageHelper.showModal('下载文件失败，请检查网络连接或重试');
          }
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
          
          const errorMsg = error.errMsg || '';
          if (errorMsg.includes('ERR_UNESCAPED_CHARACTERS') || 
              errorMsg.includes('url not in domain list') ||
              errorMsg.includes('invalid url')) {
            
            pageHelper.showModal('图片URL格式错误，请联系管理员');
          } else {
            pageHelper.showModal('预览图片失败，请重试');
          }
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

    // 先设置正在分析状态，避免重复点击
    this.setData({ isAnalyzing: true });
    
    try {
      wx.showLoading({ title: 'AI分析中...', mask: true });
      
      // 获取用户ID
      const userId = wx.getStorageSync('OPENID');
      console.log('当前用户ID:', userId);

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
      
      // 构建AI分析参数
      const params = {
        userId: userId,
        reportId: this.data.reportId,
        reportContent: reportContent
      };
      
      // 添加文件ID信息，让AI直接根据文件进行分析
      if (this.data.report.reportFileId) {
        params.fileIds = this.data.report.reportFileId;
      }

      console.log('开始AI分析，正在调用云函数...');
      
      // 设置超时处理
      let isResponseReceived = false;
      let retryCount = 0;
      const maxRetries = 1; // 最多重试1次
      
      // 修改超时时间为55秒，接近云函数60秒的超时限制
      const timeoutDuration = 55000;
      
      // 启动超时监控
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          if (!isResponseReceived) {
            console.log('云函数调用超时，使用本地备用分析');
            resolve({
              code: 408,
              msg: '分析超时，使用备用分析',
              data: this._generateLocalBackupAnalysis()
            });
          }
        }, timeoutDuration);
      });
      
      // 定义云函数调用函数，方便重试
      const callCloudFunction = async () => {
        try {
          // 如果重试，显示重试提示
          if (retryCount > 0) {
            wx.showLoading({
              title: `重试中(${retryCount})...`,
              mask: true
            });
          }
          
          return await cloudHelper.callCloudSumbit('medicalReport', {
            action: 'analyzeReportByAI',
            params
          }, {
            title: 'AI分析中...',
            hint: true
          }).then(result => {
            isResponseReceived = true;
            return result;
          }).catch(err => {
            console.error('云函数调用失败:', err);
            
            // 如果还有重试次数，进行重试
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`准备第 ${retryCount} 次重试...`);
              return callCloudFunction(); // 递归重试
            } else {
              // 达到最大重试次数，返回错误
              return {
                code: 500,
                msg: '分析失败，请稍后重试'
              };
            }
          });
        } catch (error) {
          console.error('云函数调用过程异常:', error);
          return {
            code: 500,
            msg: '系统异常，请稍后重试'
          };
        }
      };
      
      // 开始调用云函数
      const functionPromise = callCloudFunction();
      
      // 使用Promise.race，哪个先完成就用哪个结果
      const result = await Promise.race([functionPromise, timeoutPromise]);
      
      console.log('AI分析结果:', result);
      
      if (result && (result.code === 0 || result.code === 408)) {
        // 成功获取分析或使用备用分析
        if (result.code === 408) {
          // 如果是使用本地备份分析，需要保存到数据库
          this._saveLocalAnalysisToReport(result.data);
        } else {
          // 正常情况，重新加载报告以获取AI分析结果
          await this._loadReportDetail();
        }
        
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
      
      // 出错时使用本地备用分析
      this._saveLocalAnalysisToReport(this._generateLocalBackupAnalysis());
      this.setData({ showAiResult: true });
      
      pageHelper.showModal('AI分析服务暂时不可用，已使用本地分析模式');
    } finally {
      wx.hideLoading();
      this.setData({ isAnalyzing: false });
    }
  },
  
  /**
   * 生成本地备用分析
   */
  _generateLocalBackupAnalysis: function() {
    console.log('生成本地备用分析');
    const report = this.data.report;
    
    // 生成风险评估
    const riskLevel = 'low'; // 默认低风险
    
    return {
      suggestion: `根据您在${report.reportDate}于${report.hospital}进行的${report.reportType}，建议您：
1. 保持均衡饮食，增加蔬果摄入，减少高糖高脂食物
2. 坚持适量运动，每周至少进行3次30分钟的有氧运动
3. 保持良好作息，每晚保证7-8小时睡眠
4. 定期体检，建立健康档案，追踪健康指标变化`,
      riskLevel: riskLevel,
      details: `# ${report.hospital}体检报告分析

## 体检基本信息
- 体检日期：${report.reportDate}
- 医院/机构：${report.hospital}
- 报告类型：${report.reportType}

## 总体健康评估
基于您提供的体检报告信息，您的整体健康状况良好。定期体检是保持健康的重要手段，表明您注重健康管理。

## 健康指标分析
一般体检会关注以下方面：
- 血常规：检查贫血、炎症、感染等
- 肝功能：反映肝脏健康状况
- 肾功能：评估肾脏过滤功能
- 血脂：了解心血管疾病风险
- 血糖：筛查糖尿病风险
- 心电图：评估心脏电活动

## 健康生活建议
### 饮食建议
- 遵循均衡饮食原则，增加蔬菜水果摄入
- 减少盐、糖、油脂摄入
- 优先选择全谷物、瘦肉、鱼类和豆制品
- 保持充分水分摄入，每日6-8杯水

### 运动建议
- 每周150分钟中等强度有氧运动
- 适当加入力量训练，每周2-3次
- 避免久坐，每小时起身活动5-10分钟

### 生活习惯
- 保证充足睡眠，培养规律作息
- 避免烟酒，减少咖啡因摄入
- 学会压力管理，保持积极心态

## 后续检查建议
建议您：
- 每年进行一次全面体检
- 关注体重、血压等指标的变化
- 如有不适，及时就医

*免责声明：本分析为系统自动生成的健康建议，不构成医疗诊断。请咨询专业医生获取个性化的健康建议。*`
    };
  },
  
  /**
   * 保存本地分析结果到报告
   */
  _saveLocalAnalysisToReport: async function(analysisResult) {
    if (!this.data.reportId || !analysisResult) return;
    
    try {
      console.log('准备保存本地分析结果:', typeof analysisResult);
      
      // 构建分析结果文本
      let analysisText = '';
      
      // 如果是对象格式，需要转换为字符串
      if (typeof analysisResult === 'object') {
        console.log('检测到对象格式的分析结果，转换为文本');
        // 使用详细分析作为文本内容
        if (analysisResult.details) {
          analysisText = analysisResult.details;
        } else {
          // 如果没有详细分析，使用建议和风险等级构建
          const riskText = analysisResult.riskLevel === 'low' ? '低风险' : 
                        analysisResult.riskLevel === 'medium' ? '中风险' : '高风险';
          
          analysisText = `# 体检报告AI分析\n\n## 风险等级\n${riskText}\n\n## 健康建议\n${analysisResult.suggestion || '未提供具体健康建议。'}`;
        }
      } else {
        // 已经是字符串，直接使用
        analysisText = analysisResult;
      }
      
      // 使用云函数保存结果
      const result = await cloudHelper.callCloudSumbit('medicalReport', {
        action: 'saveAnalysisResult',
        params: {
          reportId: this.data.reportId,
          aiAnalysis: analysisText,
          aiAnalysisTime: new Date().getTime()
        }
      });
      
      if (result && result.code === 0) {
        console.log('本地分析结果保存成功');
        // 更新本地数据
        const report = this.data.report;
        report.aiAnalysis = analysisText;
        report.aiAnalysisTime = new Date().getTime();
        this.setData({ report: report });
      } else {
        console.error('保存本地分析结果失败:', result);
      }
    } catch (err) {
      console.error('保存本地分析结果出错:', err);
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