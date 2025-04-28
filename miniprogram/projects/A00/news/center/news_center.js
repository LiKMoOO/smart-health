const cloudHelper = require('../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');

Page({
  data: {
    newsList: [], // 最新动态列表
    isLoading: false
  },

  onLoad: function (options) {
    // 加载最新动态数据
    this.loadNewsList();
  },

  onShow: function () {
    
  },

  // 加载新闻列表（最新动态）
  loadNewsList: async function () {
    // 防止重复加载
    if (this.data.isLoading) return;
    
    this.setData({
      isLoading: true
    });

    try {
      // 拉取数据 - 最新动态(sortVal=1)
      let params = {
        sortType: 'sort',
        sortVal: 1, // 1=最新动态
      };

      let options = {
        title: 'bar'
      };

      let data = await cloudHelper.callCloudData('news/list', params, options);

      this.setData({
        newsList: data.list,
        isLoading: false
      });
    } catch (err) {
      console.error(err);
      this.setData({
        isLoading: false
      });
    }
  },

  // 跳转到体检知识页面
  gotoHealthKnowledge: function() {
    wx.navigateTo({
      url: '../cate2/news_cate2',
    });
  },

  // 下拉刷新
  onPullDownRefresh: async function () {
    await this.loadNewsList();
    wx.stopPullDownRefresh();
  },

  // 跳转到详情页
  gotoDetail: function (e) {
    let id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '../detail/news_detail?id=' + id,
    });
  }
}); 