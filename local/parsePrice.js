var AV = require('avoscloud-sdk');
var _ = require('underscore');
var configs = require('../configs.json').prod;
var utils = require('../utils');

AV.initialize(configs.APP_ID, configs.APP_KEY, configs.MASTER_KEY);
AV.setProduction(0);
AV.Cloud.useMasterKey();

var step = 300;
var start = 0;
var query = new AV.Query('House');
query.count()
.then(function(count) {
   //count = 10;
   var promises = [];
   while(start < count) {
       var q  = new AV.Query('House');
       q.skip(start);
       q.limit(step);

       var p = q.find()
       .then(function(list) {
           var promises2 = [];
           _.each(list, function(item) {
               //if(!item.get('prices')) {
                   var prices = utils.extractPrice(item.get('title'));
                   if( prices.length <= 0) prices = utils.extractPrice(item.get('content'));
                   if( prices.length > 0) {
                       console.log(prices);
                       item.set('price', prices);
                       var promise = item.save();
                       promises2.push(promise);
                   }
               //}
           })
           return AV.Promise.when(promises2);
       })
       promises.push(p);
       start += step;
   }
   return AV.Promise.when(promises);
})
.then(function(){
    console.log('done');
})
