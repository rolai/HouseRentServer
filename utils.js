var AV = require('./av.js');
var request = require('request');
const assert = require('assert');
var _ = require('underscore');

var userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36';

var utils = {
    saveHouseInfo: function(info, source, city){
      var query = new AV.Query('House');
      query.equalTo('url', info.url);
      return query.first()
      .then(function(house){
        if(house) {
          house.set('updateTime', info.updateTime);
          return house.save();
        } else {
          var house = AV.Object.new('House');
          house.set('title', info.title);
          house.set('content', info.content);
          house.set('postTime', info.postTime);
          house.set('updateTime', info.updateTime);
          house.set('prices', info.prices);
          house.set('source', source);
          house.set('city', city);
          house.set('url', info.url);
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
        _.each(houseInfoList, function(info){
          if(info.updateTime >= beforeTime) {
            utils.saveHouseInfo(info, website.source, website.city);
          } else {
            needMore = false;
          }
        })

        if(needMore){
          utils.sleep(1000);
          return utils.dealOnePage(website, startPos + 25, beforeTime);
        } else {
          console.log( website.url + " done" );
          return AV.Promise.as();
        }
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

      if(info.title) { //prase price from title
        var prices = utils.extractPrice(info.title);
        if(prices.length > 0) {
            info.prices = prices;
            console.log(info);
        }
      }
      return info;
   },

   parseHouseDescription: function(html) {
     var prefix = '<div class="topic-content">';
     var surfix = '</p>';
     var startIndex = html.indexOf(prefix) + prefix.length;
     if(startIndex <= prefix.length) return '如题';

     var endIndex = html.indexOf(surfix, startIndex);
     var text = html.substr(startIndex, endIndex - startIndex);
     prefix = '<p>';
     startIndex = text.indexOf(prefix) + prefix.length;
     if(startIndex <= prefix.length) return '如题';

     return text.substr(startIndex).replace(/<br\/>/g, '\n');
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
     var patt = /(\d{3,5})元/g
     var prices = [];
     var res;
     while ((res = patt.exec(text)) !== null) {
       prices.push(parseInt(res[1]));
     }

     return _.uniq(prices);
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
             if(!houseInfoList[index].prices) { // parse price from content
               var prices = utils.extractPrice(houseInfoList[index].content);
               if(prices.length > 0) {
                   houseInfoList[index].prices = prices;
                   console.log(houseInfoList[index]);
               }
             }
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
