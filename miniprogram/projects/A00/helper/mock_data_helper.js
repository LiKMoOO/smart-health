/**
 * 模拟数据辅助函数
 */

/**
 * 获取模拟的健康报告数据列表
 */
function getReportList() {
  // 当前时间
  const now = new Date().getTime();
  
  // 返回模拟数据
  return [
    {
      _id: 'report001',
      type: '检验',
      date: '2023-12-15',
      hospital: '北京协和医院',
      fileName: '血常规检验报告.pdf',
      fileID: 'cloud://temp-1a2b3c4d5e6f',
      createTime: now - 7 * 24 * 60 * 60 * 1000
    },
    {
      _id: 'report002',
      type: 'CT',
      date: '2023-11-20',
      hospital: '上海第一人民医院',
      fileName: '胸部CT报告.pdf',
      fileID: 'cloud://temp-2b3c4d5e6f7g',
      createTime: now - 30 * 24 * 60 * 60 * 1000
    },
    {
      _id: 'report003',
      type: '超声',
      date: '2023-10-05',
      hospital: '广州医科大学附属医院',
      fileName: '腹部超声报告.pdf',
      fileID: 'cloud://temp-3c4d5e6f7g8h',
      createTime: now - 60 * 24 * 60 * 60 * 1000
    }
  ];
}

module.exports = {
  getReportList
}; 