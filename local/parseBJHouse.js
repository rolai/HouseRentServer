var AV = require('avoscloud-sdk');
var _ = require('underscore');
var configs = require('../configs.json').prod;
var BJHouse = require('../bjhouse');
var utils = require('../utils');

AV.initialize(configs.APP_ID, configs.APP_KEY, configs.MASTER_KEY);
AV.setProduction(0);
AV.Cloud.useMasterKey();

/*
BJHouse.parseTradeData()
.then(function(data){
  if(data){
      console.log(data);
      return BJHouse.saveInDb(data);
  } else {
      return AV.Promise.as();
  }
})
.then(function() {
    console.log('done');
})
*/

var beforeTime = '2016-01-01';
BJHouse.dealOnePage(1, beforeTime)
.then(function() {
    console.log('done');
})
