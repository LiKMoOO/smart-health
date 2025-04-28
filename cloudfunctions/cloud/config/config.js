module.exports = {

	//### 环境相关 
	CLOUD_ID: 'cloud1-5gebdbgka7397db4', // 云服务ID  

	ADMIN_NAME: 'admin', // 管理员账号（5-30位)
	ADMIN_PWD: '123456', // 管理员密码（5-30位) 


	// ##################################################################  
	PID: 'A00',  
	IS_DEMO: false,  

	NEWS_CATE: '1=最新动态,2=体检知识',
	MEET_TYPE: '1=体检预约',
	// ##################################################################
	// #### 调试相关 
	TEST_MODE: false,  
	TEST_TOKEN_ID: '',

	COLLECTION_NAME: 'ax_admin|ax_cache|ax_day|ax_export|ax_join|ax_log|ax_meet|ax_news|ax_setup|ax_temp|ax_user',

	DATA_EXPORT_PATH: 'export/', //数据导出路径
	MEET_TIMEMARK_QR_PATH: 'meet/usercheckin/', //用户签到码路径 
	SETUP_PATH: 'setup/',

	// ## 缓存相关 
	IS_CACHE: true, // 是否开启缓存
	CACHE_CALENDAR_TIME: 3600 * 1000 * 1, // 日历缓存   

	// #### 内容安全
	CLIENT_CHECK_CONTENT: false, //前台图片文字是否校验
	ADMIN_CHECK_CONTENT: false, //后台图片文字是否校验    

	// #### 预约相关
	MEET_LOG_LEVEL: 'debug',

	// ### 后台业务相关
	ADMIN_LOGIN_EXPIRE: 86400, //管理员token过期时间 (秒) 

	// #### DeepSeek API配置 ####
	DEEPSEEK_API_KEY: 'sk-7dbea75119104c51bb178da367c25ea0', // 请替换为您的DeepSeek API密钥
	DEEPSEEK_API_ENDPOINT: 'https://api.deepseek.com', // DeepSeek API 端点
	DEEPSEEK_MODEL: 'deepseek-chat' // DeepSeek 模型名称
}