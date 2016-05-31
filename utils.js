var AV = require('./av.js');
var request = require('request');
const assert = require('assert');
var _ = require('underscore');
var htmlToText = require('html-to-text');

var userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36';

var utils = {
    saveHouseInfo: function(info, source, city){
      if(info.updateTime && info.updateTime.indexOf('-') < 4) {
        info.updateTime = (new Date()).getFullYear() + '-' + info.updateTime;
      }

      var q1 = new AV.Query('House');
      q1.equalTo('url', info.url);
      var q2 = new AV.Query('House');
      q2.equalTo('city', city);
      q2.equalTo('title', info.title);
      q2.startsWith('postTime', info.postTime.substr(0, 10));//同一天只能发一个相同标题的房源

      var query = AV.Query.or(q1, q2);
      return query.first()
      .then(function(house){
        if(house) {
          house.set('updateTime', info.updateTime);
          return house.save();
        } else {
          var house = AV.Object.new('House');
          _.mapObject(info, function(val, key){
              house.set(key, val);
          })
          house.set('source', source);
          house.set('city', city);
          return house.save();
        }
      })
    },

    sleep: function(milliseconds) {
      var start = new Date().getTime();
      for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
          break;
        }
      }
    },

    dealOnePage: function(website, startPos, beforeTime) {
      var url = website.url + '?start=' + startPos;
      console.log(url);
      return utils.parse(url)
      .then(function(houseInfoList) {
        var needMore = true;
        console.log("Extrat " + houseInfoList.length + " items from " + url);
        //console.log(houseInfoList);
        var promises = [];
        _.each(houseInfoList, function(info){
          if(info.updateTime >= beforeTime) {
            var p = utils.saveHouseInfo(info, website.source, website.city);
            promises.push(p);
          } else {
            needMore = false;
          }
        })

        return AV.Promise.when(promises)
        .then(function(){
            if(needMore){
              utils.sleep(500);
              return utils.dealOnePage(website, startPos + 25, beforeTime);
            } else {
              console.log( website.url + " done" );
              return AV.Promise.as();
            }
        })
      })
    },

    parseHouseList: function(html) {
      var list = [];
      var startPos = 0;
      while(true) {
        var startIndex = html.indexOf('<tr class="">', startPos);
        var endIndex = html.indexOf('</tr>', startIndex);
        if(startIndex < 0 || endIndex < 0) break;

        list.push(html.substr(startIndex, endIndex - startIndex + 5));
        startPos = endIndex + 5;
      }

      return _.map(list, utils.parseHouseInfo);
    },

    parseHouseInfo: function(houseInfoHtml) {
      var info = {};
      var rules =[{
        field: 'url',
        prefix: '<a href="',
        surfix: '"'
      }, {
        field: 'title',
        prefix: 'title="',
        surfix: '"'
      }, {
        field: 'updateTime',
        prefix: 'class="time">',
        surfix: '</td>'
      }];

      var startIndex = 0;
      var endIndex = 0;
      _.each(rules, function(rule){
        startIndex = houseInfoHtml.indexOf(rule.prefix, startIndex) + rule.prefix.length;
        endIndex = houseInfoHtml.indexOf(rule.surfix, startIndex);
        info[rule.field] = houseInfoHtml.substr(startIndex, endIndex - startIndex);
        startIndex = endIndex + rule.surfix.length;
      })

      return info;
   },

   parseHouseDescription: function(html) {
     var prefix = '<div class="topic-content">';
     var surfix = '</p>';
     var startIndex = html.indexOf(prefix) + prefix.length;
     if(startIndex <= prefix.length) return '如题';

     var endIndex = html.indexOf(surfix, startIndex) + surfix.length;
     var rawText = html.substr(startIndex, endIndex - startIndex);
     prefix = '<p>';
     startIndex = rawText.indexOf(prefix);
     if(startIndex < 0) return '如题';
     rawText = rawText.substr(startIndex);

     var text = htmlToText.fromString(rawText, {
         wordwrap: false
     });
     return text;
   },

   parsePostTime: function(html) {
     var prefix = '<span class="color-green">';
     var surfix = '</span>';
     var startIndex = html.indexOf(prefix) + prefix.length;
     if(startIndex <= prefix.length) return '';

     var endIndex = html.indexOf(surfix, startIndex);
     return html.substr(startIndex, endIndex - startIndex);
   },

   requestToPromise: function(url) {
     var options = {
       url: url,
       jar: true,
       headers: {
         //'Cookie': 'ASP.NET_SessionId=r1wtrp45qvgliwekq0kujv45',
         'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'
       }
     };

     return new AV.Promise(function(resolve, reject) {
       request(options, function(err, res, body) {
         //console.log(body);
         if (err) {
           return reject(err);
         } else if (res.statusCode !== 200) {
           err = new Error("Unexpected status code: " + res.statusCode);
           err.res = res;
           return reject(err);
         }
         resolve(body);
       });
     });
   },

   extractPrice: function(text){
     var patt1 = /(\d{3,5})(?=元|\/月|每月|一个月)/g
     var patt2 = /(租金|价钱|价格|房租)(:|：| )*(\d{3,5})/g
     var prices = [];
     var res;
     while ((res = patt1.exec(text)) !== null) {
         prices.push(parseInt(res[1]));
     }
     while ((res = patt2.exec(text)) !== null) {
         prices.push(parseInt(res[3]));
     }

/*
     if(prices.length == 0){
         var patt3 = /(\d+0)/g
         while ((res = patt3.exec(text)) !== null) {
             var p = parseInt(res[1]);
             if (p < 10000 && p > 500) prices.push(p);
         }
     }
*/
     return _.uniq(prices);
   },

   extractInfo: function(text) {
       var areaPatt = /(\d{1,3})(多)?平/;
       var modelPatt = /([\d一二两三四五六七八九][居室房]([123一二两三]厅)?([12一二两]厨)?([1234一二两三四]卫)?([12一二两]厨)?)/;

       var info = {};
       var res;
       if ((res = areaPatt.exec(text)) !== null) {
           info.area = res[1];
       }

       if ((res = modelPatt.exec(text)) !== null) {
           info.model = res[1];
       }

       var prices = utils.extractPrice(text);
       if(prices.length > 0){
           info.prices = prices;
       }

       return info;
   },

   parse: function(url) {
     return utils.requestToPromise(url)
     .then(function(html){
       //console.log(html);
       var houseInfoList = utils.parseHouseList(html);
       var promises = [];
       _.each(houseInfoList, function(info, index){
         if(info.url){
           var promise = utils.requestToPromise(info.url).then( function(body) {
             houseInfoList[index].postTime = utils.parsePostTime(body);
             houseInfoList[index].content = utils.parseHouseDescription(body);
             //if(!houseInfoList[index].prices) { // parse price from content
             var data = utils.extractInfo(info.title + body);
             _.mapObject(data, function(val, key){
                 houseInfoList[index][key] = val;
             })
             return AV.Promise.as();
           });
           promises.push(promise);
         }
       })

       return AV.Promise.when(promises).then(function(){
         return AV.Promise.as(houseInfoList);
       });
     })
   }
}


module.exports = utils;
