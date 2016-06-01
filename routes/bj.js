var router = require('express').Router();
var AV = require('leanengine');
var extension = require('../extension');

var configs = {
  data: [
    {
      name: '日期',
      key: 'date'
    },
    {
      name: '网签数量',
      key: 'dealHouse'
    },
    {
      name: '网签面积',
      key: 'dealHouseArea'
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
      name: '新增房客比',
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
  ],
  volume: [
    {
      name: '日期',
      key: 'date'
    },
    {
      name: '网签数量',
      key: 'dealHouse'
    },
    {
      name: '待售房源',
      key: 'sellingHouse'
    },
    {
      name: '链家成交量',
      key: 'ljDeal'
    }
  ],
  price: [
    {
      name: '日期',
      key: 'date'
    },
    {
      name: '成交均价',
      key: 'ljDealPrice'
    },
    {
      name: '挂牌均价',
      key: 'ljTagPrice'
    }
  ],
  linkedhome: [
    {
      name: '日期',
      key: 'date'
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
      name: '新增房客比',
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
}

router.get('/:view', function(req, res, next) {
  var view = req.params.view;
  if(['data', 'price', 'volume', 'linkedhome'].indexOf(view) < 0) view = 'volume';
  var fields = configs[view];

  var query = new AV.Query('BJHouse');
  query.descending('date');
  query.limit(30);
  query.find().then(function(rows) {
    //console.log(results);
    var data = {};
    fields.forEach(function(field){
      data[field.key] = [];
    })
    rows.forEach(function(row){
      fields.forEach(function(field){
        var value = row.get(field.key);
        if(field.key == 'date') value = "'" + value + "'";
        data[field.key].push(value)
      })
    })

    res.render(view, {
      items: rows,
      fields: fields,
      data: data,
      view: view
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
