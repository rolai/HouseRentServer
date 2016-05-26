var AV = require('avoscloud-sdk');
var _ = require('underscore');
var configs = require('../configs.json').prod;
var utils = require('../utils');
var sourceWebsites = require('../source.json').websites;

AV.initialize(configs.APP_ID, configs.APP_KEY, configs.MASTER_KEY);
AV.setProduction(0);
AV.Cloud.useMasterKey();

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
