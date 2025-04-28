/**
 * Notes: 资讯后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2021-07-11 07:48:00 
 */

const BaseAdminService = require('./base_admin_service.js');

const dataUtil = require('../../../framework/utils/data_util.js');
const util = require('../../../framework/utils/util.js');
const cloudUtil = require('../../../framework/cloud/cloud_util.js');

const NewsModel = require('../../model/news_model.js');

class AdminNewsService extends BaseAdminService {

	/**添加资讯 */
	async insertNews(adminId, {
		title,
		cateId, //分类
		cateName,
		order,
		type = 0, //类型 
		desc = '',
		url = '', //外部链接

	}) {
		// 参数校验
		if (!title) this.AppError('标题不能为空');
		if (!cateId) this.AppError('分类不能为空');
		if (type == 1 && !url) this.AppError('外部链接不能为空');
		
		// 构建基础数据
		let data = {
			NEWS_TITLE: title,
			NEWS_CATE_ID: cateId,
			NEWS_CATE_NAME: cateName,
			NEWS_ORDER: order,
			NEWS_TYPE: type,
			NEWS_DESC: desc,
			NEWS_URL: url,
			NEWS_ADMIN_ID: adminId
		};
		
		// 插入数据库
		let id = await NewsModel.insert(data);
		
		return { id };
	}

	/**删除资讯数据 */
	async delNews(id) {
		// 参数校验
		if (!id) this.AppError('资讯ID不能为空');
		
		// 获取要删除的资讯详情，用于删除相关图片资源
		let news = await NewsModel.getOne({ _id: id });
		if (!news) this.AppError('资讯不存在');
		
		// 删除资讯
		await NewsModel.del({ _id: id });
		
		// 需要删除的图片集合（资讯图片和内容中的图片）
		let cloudIds = this._getNewsPicCloudIds(news);
		
		// 删除图片
		if (cloudIds && cloudIds.length > 0) {
			await cloudUtil.deleteFiles(cloudIds);
		}
		
		return { id };
	}

	/**获取资讯信息 */
	async getNewsDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		}
		let news = await NewsModel.getOne(where, fields);
		if (!news) return null;

		return news;
	}

	/**
	 * 更新富文本详细的内容及图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateNewsContent({
		newsId,
		content // 富文本数组
	}) {
		// 参数校验
		if (!newsId) this.AppError('资讯ID不能为空');
		if (!Array.isArray(content)) this.AppError('内容格式不正确');
		
		// 获取旧的资讯信息
		let news = await NewsModel.getOne({ _id: newsId });
		if (!news) this.AppError('资讯不存在');
		
		// 提取内容中的图片URL
		let imgList = [];
		for (let k in content) {
			if (content[k].type == 'img') {
				imgList.push(content[k].val);
			}
		}
		
		// 更新资讯内容
		await NewsModel.edit({ _id: newsId }, { NEWS_CONTENT: content });
		
		return { urls: imgList };
	}

	/**
	 * 更新资讯图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateNewsPic({
		newsId,
		imgList // 图片数组
	}) {
		// 参数校验
		if (!newsId) this.AppError('资讯ID不能为空');
		if (!imgList || !Array.isArray(imgList)) this.AppError('请上传正确的图片');
		
		// 获取旧的资讯信息
		let news = await NewsModel.getOne({ _id: newsId });
		if (!news) this.AppError('资讯不存在');
		
		// 更新资讯图片
		await NewsModel.edit({ _id: newsId }, { NEWS_PIC: imgList });
		
		return { urls: imgList };
	}

	// 提取资讯中的图片cloudID
	_getNewsPicCloudIds(news) {
		let cloudIds = [];
		
		// 提取内容中的图片
		if (news.NEWS_CONTENT && news.NEWS_CONTENT.length > 0) {
			for (let k in news.NEWS_CONTENT) {
				if (news.NEWS_CONTENT[k].type == 'img') {
					// 取出图片cloudID
					let cloudId = news.NEWS_CONTENT[k].val;
					if (cloudId && !cloudIds.includes(cloudId))
						cloudIds.push(cloudId);
				}
			}
		}
		
		// 提取附加图片
		if (news.NEWS_PIC && news.NEWS_PIC.length > 0) {
			for (let k in news.NEWS_PIC) {
				let cloudId = news.NEWS_PIC[k];
				if (cloudId && !cloudIds.includes(cloudId))
					cloudIds.push(cloudId);
			}
		}
		
		return cloudIds;
	}

	/**更新资讯数据 */
	async editNews({
		id,
		title,
		cateId, //分类
		cateName,
		order,
		type = 0, //类型 
		desc = '',
		url = '', //外部链接
	}) {
		// 参数校验
		if (!id) this.AppError('资讯ID不能为空');
		if (!title) this.AppError('标题不能为空');
		if (!cateId) this.AppError('分类不能为空');
		if (type == 1 && !url) this.AppError('外部链接不能为空');
		
		// 获取资讯
		let news = await NewsModel.getOne({ _id: id });
		if (!news) this.AppError('资讯不存在');
		
		// 构建修改数据
		let data = {
			NEWS_TITLE: title,
			NEWS_CATE_ID: cateId,
			NEWS_CATE_NAME: cateName,
			NEWS_ORDER: order,
			NEWS_TYPE: type,
			NEWS_DESC: desc,
			NEWS_URL: url,
		};
		
		// 更新数据
		await NewsModel.edit({ _id: id }, data);
	}

	/**取得资讯分页列表 */
	async getNewsList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'NEWS_ORDER': 'asc',
			'NEWS_ADD_TIME': 'desc'
		};
		let fields = 'NEWS_TYPE,NEWS_URL,NEWS_TITLE,NEWS_DESC,NEWS_CATE_ID,NEWS_EDIT_TIME,NEWS_ADD_TIME,NEWS_ORDER,NEWS_STATUS,NEWS_CATE_NAME,NEWS_HOME';

		let where = {};

		if (util.isDefined(search) && search) {
			where.or = [{
				NEWS_TITLE: ['like', search]
			}, ];

		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'cateId':
					// 按类型
					where.NEWS_CATE_ID = sortVal;
					break;
				case 'status':
					// 按类型
					where.NEWS_STATUS = Number(sortVal);
					break;
				case 'home':
					// 按类型
					where.NEWS_HOME = Number(sortVal);
					break;
				case 'sort':
					// 排序
					if (sortVal == 'view') {
						orderBy = {
							'NEWS_VIEW_CNT': 'desc',
							'NEWS_ADD_TIME': 'desc'
						};
					}
					if (sortVal == 'new') {
						orderBy = {
							'NEWS_ADD_TIME': 'desc'
						};
					}
					break;
			}
		}

		return await NewsModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/**修改资讯状态 */
	async statusNews(id, status) {
		// 参数校验
		if (!id) this.AppError('资讯ID不能为空');
		if (status !== 0 && status !== 1) this.AppError('状态错误');
		
		// 查询资讯是否存在
		let news = await NewsModel.getOne({ _id: id });
		if (!news) this.AppError('资讯不存在或已删除');
		
		// 更新状态
		await NewsModel.edit({ _id: id }, { NEWS_STATUS: status });
	}

	/**资讯置顶排序设定 */
	async sortNews(id, sort) {
		// 参数校验
		if (!id) this.AppError('资讯ID不能为空');
		
		// 查询资讯是否存在
		let news = await NewsModel.getOne({ _id: id });
		if (!news) this.AppError('资讯不存在或已删除');
		
		// 更新排序
		await NewsModel.edit({ _id: id }, { NEWS_HOME: sort });
	}
}

module.exports = AdminNewsService;