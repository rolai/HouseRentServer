var AV = require('avoscloud-sdk');
var _ = require('underscore');
var configs = require('../configs.json').prod;
var utils = require('../utils');
var smth = require('../smth');
var extension = require('../extension');
var sourceWebsites = require('../source.json').smth;

AV.initialize(configs.APP_ID, configs.APP_KEY, configs.MASTER_KEY);
AV.setProduction(0);
AV.Cloud.useMasterKey();

_.each(sourceWebsites, function(website){
  var query = new AV.Query('House');
  query.equalTo('source', website.source);
  query.addDescending('updateTime');

  //var beforeTime = (new Date()).format("yyyy-MM-dd");
  var beforeTime = "2016-05-20";
  var startPos = 0;
  query.first()
  .then(function(row) {
    if(row){
      beforeTime = row.get('updateTime');
    }

    console.log(beforeTime);
    return smth.dealOnePage(website, 1, beforeTime);
  })
})
