var AV = require('avoscloud-sdk');
var _ = require('underscore');
var configs = require('../configs.json').prod;
var utils = require('../utils');

AV.initialize(configs.APP_ID, configs.APP_KEY, configs.MASTER_KEY);
AV.setProduction(0);
AV.Cloud.useMasterKey();

var step = 200;
var start = 0;
var query = new AV.Query('House');
query.startsWith('updateTime', '05');
query.count()
.then(function(count) {
   // count = 20;
   var promise = AV.Promise.as();
   while(start < count) {
       (function(s){
           promise = promise.then(function(){
               var q  = new AV.Query('House');
               q.startsWith('updateTime', '05');
               q.skip(s);
               q.limit(step);
               console.log("status: " + s + "/" + count);
               return q.find()
               .then(function(list) {
                   var promises = [];
                   _.each(list, function(item) {
                       var ut = item.get('updateTime');
                       //console.log(ut);
                       if(ut.indexOf('201605') >= 0 ){
                           ut = ut.replace(/201605/, '2016-05');
                       } else if(ut.indexOf('-') < 4){
                           ut = '2016-' + ut;
                       }
                       item.set('updateTime', ut);
                       var promise = item.save();
                       promises.push(promise);
                       /*
                       var info = utils.extractInfo(item.get('title') + item.get('content'));
                       //console.log(info);
                       _.mapObject(info, function(val, key){
                           item.set(key, val);
                       })
                       var promise = item.save();
                       promises.push(promise);
                      */
                   })
                   return AV.Promise.when(promises);
               })
           });
       })(start);
       start += step;
   }
   return promise;
})
.then(function(){
    console.log("done");
})
