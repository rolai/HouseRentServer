var AV = require('leanengine');
var Request = require('request');
var _ = require('underscore');
var utils = require('./utils');
var LinkedHome = require('./linkedHome');
var sourceWebsites = require('./source.json').websites;
var homes = require('./source.json').linkedHome;
var extension = require('./extension');

/**
 * 一个简单的云代码方法
 */

AV.Cloud.define('parse', function(request, response) {
  _.each(sourceWebsites, function(website){
    var query = new AV.Query('House');
    query.equalTo('source', website.source);
    query.addDescending('updateTime');

    var beforeTime = '05-24';
    var startPos = 0;
    query.first()
    .then(function(row) {
      if(row){
        beforeTime = row.get('updateTime');
      }

      return utils.dealOnePage(website, 0, beforeTime);
    })
  })

  response.success('fine!');
});

AV.Cloud.define('query', function(request, response) {
  var data = request.params;
  var count = data.pageSize || 10;
  if(count > 30) count = 30;
  var page = data.page || 0;
  var skip = page * count;
/*
  var query = new AV.SearchQuery('House');
  query.queryString(data.keyword);
  query.find().then(function(results) {
       console.log("Find " + query.hits() + " docs.");
       response.success(results);
       //处理 results 结果
   }).catch(function(err){
       //处理 err
       response.success(err);
   });
*/

  var sql = "select * from House where city = '{0}' and (title like '%{1}%' or content like '%{1}%') limit {2}, {3} order by updateTime desc".format(data.city, data.keyword, skip, count);
  AV.Query.doCloudQuery(sql).then(function(res) {
      // data 中的 results 是本次查询返回的结果，AV.Object 实例列表
      var results = res.results;
      response.success(results);
      //do something with results...
  }, function(error) {
      //查询失败，查看 error
      console.log(error);
      response.success(error);
  });

});


AV.Cloud.define('parseLinkedHome', function(request, response) {
    var promises = [];
    _.each(homes, function(website){
       utils.sleep(500);
       console.log(website)
       var promise = LinkedHome.parse(website.url)
       .then(function(info){
          if(info && info.dealCount){
              return LinkedHome.saveInDb(info, website.city);
          } else {
              return AV.Promise.as();
          }
       })
       promises.push(promise);
    })

    response.success('fine!');
    AV.Promise.when(promises).then(function(){
        console.log('done');
    })
});

module.exports = AV.Cloud;
