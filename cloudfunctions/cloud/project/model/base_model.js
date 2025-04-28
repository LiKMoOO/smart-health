/**
 * Notes: 实体基类 
 * Date: 2021-03-15 19:20:00 
 */


const Model = require('../../framework/database/model.js');

class BaseModel extends Model {
	static _getProjectId() {
		if (global.PID)
			return global.PID;
		else
			return 'ONE';
	}

	static _getWhere(where, mustPID = true) { 
		if (mustPID) {
			if (typeof (where) == 'string' || typeof (where) == 'number') {
				where = {
					_id: where,
					_pid: BaseModel._getProjectId()
				};
			} else
				where._pid = BaseModel._getProjectId();
		}
		return where;
	}


	/**
	 * 获取单个object
	 * @param {*} where 
	 * @param {*} fields 
	 * @param {*} orderBy 
	 * @returns object or null
	 */
	static async getOne(where, fields = '*', orderBy = {}, mustPID = true, coll = '') {
		console.log('【DEBUG-BaseModel】获取单条记录，表名:', coll);
		try {
			where = BaseModel._getWhere(where, mustPID); 
			console.log('【DEBUG-BaseModel】查询条件:', JSON.stringify(where));
			
			// 使用传入的表名
			if (coll) {
				this.CL = coll;
			}
			
			// 获取结果
			const result = await super.getOne(where, fields, orderBy);
			console.log('【DEBUG-BaseModel】查询结果:', result ? '找到记录' : '未找到记录');
			
			return result;
		} catch (error) {
			console.error('【DEBUG-BaseModel】获取单条记录出错:', error);
			if (error.stack) {
				console.error('【DEBUG-BaseModel】错误堆栈:', error.stack);
			}
			return null; // 查询出错返回null
		}
	}

	/**
	 * 修改
	 * @param {*} where 
	 * @param {*} data 
	 */
	static async edit(where, data, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.edit(where, data);
	}

	/**
	 * 计算总数
	 * @param {*} where 
	 */
	static async count(where, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID); 
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.count(where);
	}

	/**
	 * 插入数据
	 * @param {*} data 
	 */
	static async insert(data, mustPID = true, coll = '') {
		if (mustPID) data._pid = BaseModel._getProjectId();
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.insert(data);
	}

	/**
	 * 批量插入数据
	 * @param {*} data 
	 */
	static async insertBatch(data = [], size = 1000, mustPID = true, coll = '') {
		if (mustPID) {
			for (let k in data)
				data[k]._pid = BaseModel._getProjectId();
		}

		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.insertBatch(data, size);
	}

	/**
	 * 插入或者更新数据
	 * @param {*} data 
	 */
	static async insertOrUpdate(where, data, mustPID = true, coll = '') {
		if (mustPID) {
			where._pid = BaseModel._getProjectId();
		}
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.insertOrUpdate(where, data);
	}


	/**
	 * 删除记录
	 * @param {*} where 
	 */
	static async del(where, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.del(where);
	}

	/**
	 * 清空表
	 * @param {*}   
	 */
	static async clear(coll = '') {
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.clear(); 
	}

	/**
	 * 自增处理
	 * @param {*} where 
	 * @param {*} field 
	 * @param {*} val 
	 */
	static async inc(where, field, val = 1, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.inc(where, field, val);
	}

	/**
	 * 自乘处理
	 * @param {*} where 
	 * @param {*} field 
	 * @param {*} val 
	 */
	static async mul(where, field, val = 1, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.mul(where, field, val);
	}

	/**
	 * 分组求和
	 * @param {*} where 
	 * @param {*} groupField 
	 * @param {*} field 
	 * @param {*} val 
	 */
	static async groupSum(where, groupField, field, mustPID = true, coll = '') {
		if (mustPID) where._pid = BaseModel._getProjectId();
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.groupSum(where, groupField, field);
	}

	/**
	 * 分组求COUNT
	 * @param {*} where 
	 * @param {*} groupField  
	 * @param {*} val 
	 */
	static async groupCount(where, groupField, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.groupCount(where, groupField);
	}

	/**
	 * 求和
	 * @param {*} where 
	 * @param {*} field 
	 * @param {*} val 
	 */
	static async sum(where, field, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.sum(where, field);
	}

	/**
	 * 求不重复
	 * @param {*} where 
	 * @param {*} field 
	 * @param {*} val 
	 */
	static async distinct(where, field, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.distinct(where, field);
	}

	/**
	 * 求不重复
	 * @param {*} where 
	 * @param {*} field 
	 * @param {*} val 
	 */
	static async distinctCnt(where, field, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.distinctCnt(where, field);
	}

	/**
	 * 最大
	 * @param {*} where 
	 * @param {*} field 
	 * @param {*} val 
	 */
	static async max(where, field, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.max(where, field);
	}

	/**
	 * 最小
	 * @param {*} where 
	 * @param {*} field 
	 * @param {*} val 
	 */
	static async min(where, field, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.min(where, field);
	}

	/**
	 * 随机数据
	 * @param {*} where 
	 * @param {*} field 
	 * @param {*} size 
	 */
	static async rand(where, field, size = 1, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.rand(where, field, size);
	}

	/**
	 * 所有记录
	 * @param {*} where 
	 * @param {*} fields 
	 * @param {*} orderBy 
	 * @param {*} size  
	 */
	static async getAll(where, fields, orderBy, size = 100, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			console.log('【DEBUG-BaseModel】获取所有记录，表名:', coll);
			this.CL = coll;
		}
		
		return await super.getAll(where, fields, orderBy, size);
	}


	/**
	 * 大数据情况下取得所有记录
	 * @param {*} where 
	 * @param {*} fields 
	 * @param {*} orderBy 
	 * @param {*} size  
	 */
	static async getAllBig(where, fields, orderBy, size = 1000, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.getAllBig(where, fields, orderBy, size);
	}

	/**
	 * 所有记录 数组字段拆分查询
	 * @param {*} where 
	 * @param {*} fields 
	 * @param {*} orderBy 
	 * @param {*} size  
	 */
	static async getAllByArray(arrField, where, fields, orderBy, size = 100, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.getAllByArray(arrField, where, fields, orderBy, size);
	}

	/**
	 * 分页记录
	 * @param {*} where 
	 * @param {*} fields 
	 * @param {*} orderBy 
	 * @param {*} page 
	 * @param {*} size 
	 * @param {*} isTotal 
	 * @param {*} oldTotal  // 上次分页的记录总数 
	 */
	static async getList(where, fields, orderBy, page, size, isTotal, oldTotal, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	// 联表获取分页（2张表)
	static async getListJoin(joinParams, where, fields, orderBy, page = 1, size, isTotal = true, oldTotal = 0, is2Many = false, mustPID = true, coll = '') {
		where = BaseModel._getWhere(where, mustPID);
		
		// 使用传入的表名
		if (coll) {
			this.CL = coll;
		}
		
		return await super.getListJoin(joinParams, where, fields, orderBy, page, size, isTotal, oldTotal, is2Many);
	}

}

module.exports = BaseModel;