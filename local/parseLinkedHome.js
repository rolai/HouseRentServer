var AV = require('avoscloud-sdk');
var _ = require('underscore');
var configs = require('../configs.json').prod;
var LinkedHome = require('../linkedHome');
var homes = require('../source.json').linkedHome;
var utils = require('../utils');

AV.initialize(configs.APP_ID, configs.APP_KEY, configs.MASTER_KEY);
AV.setProduction(0);
AV.Cloud.useMasterKey();

process.setMaxListeners(0);

var promises = [];
_.each(homes, function(website){
   utils.sleep(1000);
   console.log(website)
   var promise = LinkedHome.parse(website.url)
   .then(function(info){
      if(info && info.ljDeal){
          return LinkedHome.saveInDb(info, website.city);
      } else {
          return AV.Promise.as();
      }
   })
   promises.push(promise);
})

AV.Promise.when(promises).then(function(){
    console.log('done');
})
