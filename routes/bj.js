var router = require('express').Router();
var AV = require('leanengine');
var extension = require('../extension');

var fields = [
    {
        name: '日期',
        key: 'date'
    },
    {
        name: '签约数量',
        key: 'dealHouse'
    },
    {
        name: '签约面积',
        key: 'dealHouseArea'
    },
    {
        name: '核验数量',
        key: 'checkedHouse'
    },
    {
        name: '核验面积',
        key: 'checkedHouseArea'
    },
    {
        name: '待售房源',
        key: 'sellingHouse'
    },
    {
        name: '链家成交量',
        key: 'ljDeal'
    },
    {
        name: '链家带看量',
        key: 'ljView'
    },
    {
        name: '链家新增房客比',
        key: 'ljNewHCRate'
    },
    {
        name: '成交均价',
        key: 'ljDealPrice'
    },
    {
        name: '挂牌均价',
        key: 'ljTagPrice'
    }
]
// 查询 Todo 列表
router.get('/review', function(req, res, next) {
  var query = new AV.Query('BJHouse');
  query.descending('date');
  query.limit(30);
  query.find().then(function(results) {
    //console.log(results);
    res.render('review', {
      items: results,
      fields: fields
    });
  }, function(err) {
      next(err);
  }).catch(next);
});

router.get('/rent', function(req, res, next) {
  var data = req.query;
  var count = 25;
  var page = data.page || 0;
  page = parseInt(page);
  var skip = page * count;
  //console.log(data);
  var sql = "select * from House where city = '{0}' and (title like '%{1}%' or content like '%{1}%') limit {2}, {3} order by updateTime desc".format("北京", data.keyword, skip, count);
  //console.log(sql);
  AV.Query.doCloudQuery(sql).then(function(data) {
      var results = data.results;
      res.render('rent', {
        items: results,
        page: page,
        keyword: data.keyword
      });
  }, function(error) {
      //查询失败，查看 error
      console.log(error);
      next(error);
  }).catch(next);
});

module.exports = router;
