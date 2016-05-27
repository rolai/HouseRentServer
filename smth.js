var AV = require('./av.js');
var request = require('request');
var _ = require('underscore');
var utils = require('./utils');
var extension = require('./extension');
var htmlToText = require('html-to-text');

var smth = {
    requestToPromise: function(url) {
      var options = {
        method: 'GET',
        uri: url,
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

    dealOnePage: function(website, page, beforeTime) {
      var url = website.url + '?p=' + page;
      console.log(url);
      return smth.parse(url)
      .then(function(houseInfoList) {
        var needMore = true;
        console.log("Extrat " + houseInfoList.length + " items from " + url);
        // console.log(houseInfoList);
        _.each(houseInfoList, function(info){
          if(info.updateTime >= beforeTime) {
            utils.saveHouseInfo(info, website.source, website.city);
          } else {
            needMore = false;
          }
        })

        if(needMore){
          utils.sleep(1000);
          return smth.dealOnePage(website, page + 1, beforeTime);
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
        var startIndex = html.indexOf('<li>', startPos);
        var endIndex = html.indexOf('</li>', startIndex) + '</li>'.length;
        if(startIndex < 0 || endIndex < 0) break;

        var content = html.substr(startIndex, endIndex - startIndex);
        if(content.indexOf('class="top') < 0) list.push(content);

        startPos = endIndex;
      }

      return _.map(list, smth.parseHouseInfo);
    },

    parseHouseInfo: function(houseInfoHtml) {
      var info = {};
      var rules =[{
        field: 'url',
        prefix: 'href="',
        surfix: '"'
      }, {
        field: 'title',
        prefix: '>',
        surfix: '</a>'
      }, {
        field: 'postTime',
        prefix: '<div>',
        surfix: '&nbsp;<a'
      }, {
        field: 'updateTime',
        prefix: '|',
        surfix: '&nbsp;<a'
      }];

      var startIndex = 0;
      var endIndex = 0;
      _.each(rules, function(rule){
        if(rule.preprefix) startIndex = houseInfoHtml.indexOf(rule.preprefix, startIndex) + rule.preprefix.length;

        startIndex = houseInfoHtml.indexOf(rule.prefix, startIndex) + rule.prefix.length;
        endIndex = houseInfoHtml.indexOf(rule.surfix, startIndex);
        info[rule.field] = houseInfoHtml.substr(startIndex, endIndex - startIndex);
        startIndex = endIndex + rule.surfix.length;
      })

      var today = (new Date()).format("yyyy-MM-dd");
      if(info.url) info.url = 'http://m.newsmth.net' + info.url;
      if(info.postTime.indexOf('-') < 0) info.postTime = today + ' ' + info.postTime;
      if(info.updateTime.indexOf('-') < 0) info.updateTime = today + ' ' + info.updateTime;
      if(info.title) { //prase price from title
        var prices = utils.extractPrice(info.title);
        if(prices.length > 0) {
            info.prices = prices;
        }
      }
      return info;
   },

   parseHouseDescription: function(html) {
     var prefix = '<div class="sp">';
     var surfix = '</div>';
     var startIndex = html.indexOf(prefix) + prefix.length;
     if(startIndex < prefix.length) return '如题';

     var endIndex = html.indexOf(surfix, startIndex) + surfix.length;
     var rawText = html.substr(startIndex, endIndex - startIndex);

     var text = htmlToText.fromString(rawText, {
         wordwrap: false
     });

     return text;
   },

   parse: function(url) {
     return smth.requestToPromise(url)
     .then(function(html){
       var houseInfoList = smth.parseHouseList(html);
       var promises = [];
       _.each(houseInfoList, function(info, index){
         if(info.url){
           var promise = smth.requestToPromise(info.url).then( function(body) {
             houseInfoList[index].content = smth.parseHouseDescription(body);
             if(!houseInfoList[index].prices) { // parse price from content
               var prices = utils.extractPrice(houseInfoList[index].content);
               if(prices.length > 0) {
                   houseInfoList[index].prices = prices;
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

module.exports = smth;
