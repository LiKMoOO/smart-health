/**
 * Notes: 预约后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY www.code3721.com
 * Date: 2022-12-08 07:48:00 
 */

const BaseAdminService = require('./base_admin_service.js');
const timeUtil = require('../../../framework/utils/time_util.js');

const MeetModel = require('../../model/meet_model.js');
const JoinModel = require('../../model/join_model.js');
const UserModel = require('../../model/user_model.js');

const DataService = require('./../data_service');

// 导出报名数据KEY
const EXPORT_JOIN_DATA_KEY = 'join_data';

// 导出用户数据KEY
const EXPORT_USER_DATA_KEY = 'user_data';

class AdminExportService extends BaseAdminService {
	// #####################导出报名数据
	/**获取报名数据 */
	async getJoinDataURL() {
		let dataService = new DataService();
		return await dataService.getExportDataURL(EXPORT_JOIN_DATA_KEY);
	}

	/**删除报名数据 */
	async deleteJoinDataExcel() {
		let dataService = new DataService();
		return await dataService.deleteDataExcel(EXPORT_JOIN_DATA_KEY);
	}

	// 根据表单提取数据
	_getValByForm(arr, mark, title) {
		for (let k in arr) {
			if (arr[k].mark == mark) return arr[k].val;
			if (arr[k].title == title) return arr[k].val;
		}

		return '';
	}

	/**导出报名数据 */
	async exportJoinDataExcel({
		meetId,
		startDay,
		endDay,
		status
	}) {
		// 查询条件
		let where = {};
		if (meetId) where.JOIN_MEET_ID = meetId;
		
		// 按日期范围查询
		if (startDay && endDay) {
			let start = timeUtil.time2Timestamp(startDay + ' 00:00:00');
			let end = timeUtil.time2Timestamp(endDay + ' 23:59:59');
			where.JOIN_MEET_DAY = [
				['>=', startDay],
				['<=', endDay]
			];
		}
		
		// 按状态查询
		if (status !== undefined && status !== null && status !== '') {
			where.JOIN_STATUS = Number(status);
		}
		
		// 获取符合条件的报名记录
		let orderBy = {
			JOIN_EDIT_TIME: 'desc',
			JOIN_ADD_TIME: 'desc'
		};
		let joinList = await JoinModel.getAll(where, '*', orderBy);
		if (!joinList || joinList.length == 0) {
			this.AppError('没有报名数据');
		}
		
		// 根据报名项目获取所有报名表单字段
		let formTitle = [];
		
		// 获取该项目的表单设置
		if (meetId) {
			let meet = await MeetModel.getOne({ MEET_ID: meetId }, 'MEET_FORM_SET');
			if (meet) {
				for (let i = 0; i < meet.MEET_FORM_SET.length; i++) {
					if (!meet.MEET_FORM_SET[i].title) continue;
					formTitle.push(meet.MEET_FORM_SET[i].title);
				}
			}
		} else {
			// 收集所有报名表单字段
			for (let i = 0; i < joinList.length; i++) {
				for (let j = 0; j < joinList[i].JOIN_FORMS.length; j++) {
					if (!joinList[i].JOIN_FORMS[j].title) continue;
					if (!formTitle.includes(joinList[i].JOIN_FORMS[j].title))
						formTitle.push(joinList[i].JOIN_FORMS[j].title);
				}
			}
		}
		
		// 表格头
		let header = ['记录时间', '项目', '日期', '时段', '状态', '用户'];
		for (let i = 0; i < formTitle.length; i++) {
			header.push(formTitle[i]);
		}
		
		// 数据行
		let data = [header];
		
		for (let i = 0; i < joinList.length; i++) {
			let join = joinList[i];
			
			// 基本信息
			let line = [];
			
			line.push(timeUtil.timestamp2Time(join.JOIN_ADD_TIME));
			line.push(join.JOIN_MEET_TITLE);
			line.push(join.JOIN_MEET_DAY);
			line.push(join.JOIN_MEET_TIME_START + '-' + join.JOIN_MEET_TIME_END);
			
			// 状态
			let statusDesc = JoinModel.STATUS_DESC[join.JOIN_STATUS] || '未知';
			line.push(statusDesc);
			
			// 提取用户
			let user = await UserModel.getOne({ USER_MINI_OPENID: join.JOIN_USER_ID }, 'USER_NAME,USER_MOBILE');
			let userName = user ? (user.USER_NAME || '') : '';
			let userMobile = user ? (user.USER_MOBILE || '') : '';
			line.push(userName + ' ' + userMobile);
			
			// 提取表单值
			for (let j = 0; j < formTitle.length; j++) {
				line.push(this._getValByForm(join.JOIN_FORMS, '', formTitle[j]));
			}
			
			data.push(line);
		}
		
		// 导出数据
		let dataService = new DataService();
		return await dataService.exportDataExcel(EXPORT_JOIN_DATA_KEY, '报名数据', joinList.length, data);
	}


	// #####################导出用户数据

	/**获取用户数据 */
	async getUserDataURL() {
		let dataService = new DataService();
		return await dataService.getExportDataURL(EXPORT_USER_DATA_KEY);
	}

	/**删除用户数据 */
	async deleteUserDataExcel() {
		let dataService = new DataService();
		return await dataService.deleteDataExcel(EXPORT_USER_DATA_KEY);
	}

	/**导出用户数据 */
	async exportUserDataExcel(condition) {
		// 查询条件
		let where = {};
		
		// 根据查询条件设置
		if (condition && condition.search) {
			// 支持按用户姓名，手机号等搜索
			where.USER_NAME = {
				$regex: condition.search,
				$options: 'i'
			};
		}
		
		if (condition && condition.sortType) {
			// 排序方式
			switch (condition.sortType) {
				case 'newReg': {
					where.USER_ADD_TIME = ['desc'];
					break;
				}
				case 'lastLogin': {
					where.USER_LOGIN_TIME = ['desc'];
					break;
				}
			}
		}
		
		if (condition && condition.status) {
			// 按状态筛选
			where.USER_STATUS = Number(condition.status);
		}
		
		// 获取符合条件的用户记录
		let orderBy = {
			USER_ADD_TIME: 'desc'
		};
		let userList = await UserModel.getAll(where, '*', orderBy);
		if (!userList || userList.length == 0) {
			this.AppError('没有用户数据');
		}
		
		// 表格头
		let header = ['注册时间', '用户', '手机', '状态', '登录次数', '最近登录时间', '所在单位', '所在城市', '职业领域'];
		
		// 数据行
		let data = [header];
		
		for (let i = 0; i < userList.length; i++) {
			let user = userList[i];
			
			// 基本信息
			let line = [];
			
			// 注册时间
			line.push(timeUtil.timestamp2Time(user.USER_ADD_TIME));
			
			// 用户姓名
			line.push(user.USER_NAME || '');
			
			// 手机号
			line.push(user.USER_MOBILE || '');
			
			// 状态
			let statusDesc = UserModel.STATUS_DESC[user.USER_STATUS] || '未知';
			line.push(statusDesc);
			
			// 登录次数
			line.push(user.USER_LOGIN_CNT || 0);
			
			// 最近登录时间
			let lastLoginTime = user.USER_LOGIN_TIME ? timeUtil.timestamp2Time(user.USER_LOGIN_TIME) : '-';
			line.push(lastLoginTime);
			
			// 所在单位
			line.push(user.USER_WORK || '');
			
			// 所在城市
			line.push(user.USER_CITY || '');
			
			// 职业领域
			line.push(user.USER_TRADE || '');
			
			data.push(line);
		}
		
		// 导出数据
		let dataService = new DataService();
		return await dataService.exportDataExcel(EXPORT_USER_DATA_KEY, '用户数据', userList.length, data);
	}
}

module.exports = AdminExportService;