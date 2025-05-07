# 健康管理云函数使用说明

## 功能概述
健康管理云函数提供了健康数据管理相关的API，包括健康档案管理、健康指标记录和用药提醒等功能。

## 调用方式

### 通过cloud云函数调用（推荐）
推荐通过cloud云函数进行调用，路由前缀为 `health/`：

```javascript
// 示例：获取健康首页数据
const data = await cloudHelper.callCloudData('health/'gethealthindex, {
  page: 1,
  size: 10
});
```

### 直接调用health云函数
如果需要直接调用health云函数，必须传递route参数：

```javascript
// 示例：直接调用health云函数
wx.cloud.callFunction({
  name: 'health',
  data: {
    route: 'health/gethealthindex',  // 必须指定route参数
    params: {
      page: 1,
      size: 10
    }
  }
}).then(res => {
  console.log(res.result);
});
```

## 接口说明

### 1. 获取健康首页数据
- 路由：`health/gethealthindex`
- 功能：获取用户健康档案、最近健康指标记录和用药提醒
- 参数：
  - `page`: 页码，默认1
  - `size`: 每页记录数，默认10

```javascript
// 返回数据结构
{
  code: 0,
  data: {
    profile: {      // 健康档案
      basicInfo: {  // 基本信息
        height: 175,
        weight: 68,
        gender: '男',
        age: 35
      }
    },
    metrics: [      // 健康指标记录
      {
        type: 'blood_pressure',
        value: { systolic: 120, diastolic: 80 },
        recordTime: 1621500000000,
        isAbnormal: false
      }
    ],
    reminders: [    // 用药提醒
      {
        medicationName: '阿司匹林',
        dosage: '100mg',
        frequency: '每日一次',
        nextReminder: 1621500000000
      }
    ]
  },
  msg: '获取成功'
}
```

### 2. 获取健康指标数据
- 路由：`health/gethealthmetrics`
- 功能：获取健康指标记录（分页）
- 参数：
  - `page`: 页码，默认1
  - `size`: 每页记录数，默认10
  - `type`: 指标类型，可选值：blood_pressure, blood_sugar, heart_rate, weight等，不传则获取所有类型

```javascript
// 返回数据结构
{
  code: 0,
  data: {
    list: [  // 健康指标列表
      {
        type: 'blood_sugar',
        value: 5.6,
        recordTime: 1621500000000,
        isAbnormal: false
      }
    ],
    total: 20,   // 总记录数
    page: 1,     // 当前页码
    size: 10     // 每页记录数
  },
  msg: '获取成功'
}
```

### 3. 更新健康数据
- 路由：`health/updatehealthdata`
- 功能：添加/更新健康数据
- 参数：
  - `dataType`: 数据类型，必填，可选值：profile(档案), metrics(指标), reminder(提醒)
  - `data`: 具体数据，根据dataType不同而不同

#### 3.1 更新健康档案
```javascript
// 示例
await cloudHelper.callCloudData('health/updatehealthdata', {
  dataType: 'profile',
  data: {
    basicInfo: {
      height: 175,
      weight: 68,
      gender: '男',
      age: 35
    }
  }
});
```

#### 3.2 添加健康指标记录
```javascript
// 示例：添加血压记录
await cloudHelper.callCloudData('health/updatehealthdata', {
  dataType: 'metrics',
  data: {
    type: 'blood_pressure',
    value: { systolic: 120, diastolic: 80 },
    recordTime: Date.now()
  }
});

// 示例：添加血糖记录
await cloudHelper.callCloudData('health/updatehealthdata', {
  dataType: 'metrics',
  data: {
    type: 'blood_sugar',
    value: 5.6,
    recordTime: Date.now()
  }
});
```

#### 3.3 添加/更新用药提醒
```javascript
// 示例：添加用药提醒
await cloudHelper.callCloudData('health/updatehealthdata', {
  dataType: 'reminder',
  data: {
    medicationName: '阿司匹林',
    dosage: '100mg',
    frequency: '每日一次',
    nextReminder: Date.now() + 24 * 60 * 60 * 1000  // 24小时后提醒
  }
});

// 示例：更新用药提醒
await cloudHelper.callCloudData('health/updatehealthdata', {
  dataType: 'reminder',
  data: {
    _id: 'reminder_id',  // 提醒ID，更新时必填
    medicationName: '阿司匹林',
    dosage: '100mg',
    frequency: '每日两次',
    nextReminder: Date.now() + 12 * 60 * 60 * 1000  // 12小时后提醒
  }
});
```

## 数据库集合说明

### 1. health_profiles - 健康档案集合
保存用户的健康基本信息
```javascript
{
  userId: "openid",                   // 用户ID，对应微信的OPENID
  HEALTH_PROFILE_BASIC: {             // 基本健康信息
    height: 175,                     // 身高(cm)
    weight: 68,                      // 体重(kg)
    gender: "男",                    // 性别
    age: 35                          // 年龄
  },
  createTime: 1621500000000,          // 创建时间
  updateTime: 1621500000000           // 更新时间
}
```

### 2. health_metrics - 健康指标集合
保存用户的健康指标记录
```javascript
{
  userId: "openid",                   // 用户ID，对应微信的OPENID
  type: "blood_pressure",             // 指标类型：blood_pressure(血压), blood_sugar(血糖), heart_rate(心率), weight(体重)
  value: { systolic: 120, diastolic: 80 }, // 指标值，血压时为对象，其他为数值
  recordTime: 1621500000000,          // 记录时间
  createTime: 1621500000000           // 创建时间
}
```

### 3. health_reminders - 用药提醒集合
保存用户的用药提醒
```javascript
{
  userId: "openid",                   // 用户ID，对应微信的OPENID
  medicationName: "阿司匹林",          // 药品名称
  dosage: "100mg",                    // 剂量
  frequency: "每日一次",               // 服用频率
  nextReminder: 1621500000000,        // 下次提醒时间
  createTime: 1621500000000,          // 创建时间
  updateTime: 1621500000000           // 更新时间
}
``` 