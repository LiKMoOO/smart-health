/**
 * Notes: 预约后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2021-12-08 07:48:00 
 */

const BaseAdminService = require('./base_admin_service.js');
const TempModel = require('../../model/temp_model.js');

class AdminTempService extends BaseAdminService {

	/**添加模板 */
	async insertTemp({
		name,
		times,
	}) {
		// 参数校验
		if (!name) this.AppError('模板名称不能为空');
		if (!times || !Array.isArray(times) || times.length == 0) 
			this.AppError('请填写时间段');
		
		// 查询是否已存在
		let where = {
			TEMP_NAME: name
		};
		let cnt = await TempModel.count(where);
		if (cnt > 0) this.AppError('该模板已存在');
		
		// 构建数据
		let data = {
			TEMP_NAME: name,
			TEMP_TIMES: times
		};
		
		// 插入数据库
		let id = await TempModel.insert(data);
		
		return {
			id
		};
	}

	/**更新数据 */
	async editTemp({
		id,
		limit,
		isLimit
	}) {
		// 参数校验
		if (!id) this.AppError('模板ID不能为空');
		
		// 查询是否存在
		let where = {
			_id: id
		};
		let temp = await TempModel.getOne(where);
		if (!temp) this.AppError('该模板不存在');
		
		// 更新时间限制
		let times = temp.TEMP_TIMES;
		for (let i = 0; i < times.length; i++) {
			times[i].isLimit = isLimit || false;
			times[i].limit = limit || 50; // 默认限制50人
		}
		
		// 更新数据
		let data = {
			TEMP_TIMES: times
		};
		
		await TempModel.edit(where, data);
	}


	/**删除数据 */
	async delTemp(id) {
		// 参数校验
		if (!id) this.AppError('模板ID不能为空');
		
		// 查询是否存在
		let where = {
			_id: id
		};
		let temp = await TempModel.getOne(where);
		if (!temp) this.AppError('该模板不存在');
		
		// 删除模板
		await TempModel.del(where);
	}


	/**分页列表 */
	async getTempList() {
		let orderBy = {
			'TEMP_ADD_TIME': 'desc'
		};
		let fields = 'TEMP_NAME,TEMP_TIMES';

		let where = {};
		return await TempModel.getAll(where, fields, orderBy);
	}
}

module.exports = AdminTempService;