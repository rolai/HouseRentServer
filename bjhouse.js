var AV = require('./av.js');
var request = require('request');
var _ = require('underscore');
var utils = require('./utils');
var extension = require('./extension');
var LinkedHome = require('./linkedHome');

var bjhouseConfigs =  {
    trade: {
        url: "http://210.75.213.188/shh/portal/bjjs/index.aspx",
        sections: [
            {
                prefix: '<table class="tjInfo"',
                surfix: '</table>',
                items: [
                    {
                        prefix: '<td>',
                        surfix: '</td>',
                        field: 'checkedAll'
                    },
                    {
                        prefix: '<td>',
                        surfix: '</td>',
                        field: 'checkedAllArea'
                    },
                    {
                        prefix: '<td>',
                        surfix: '</td>',
                        field: 'checkedHouse'
                    },
                    {
                        prefix: '<td>',
                        surfix: '</td>',
                        field: 'checkedHouseArea'
                    }
                ]
            },
            {
                prefix: '<table class="tjInfo"',
                surfix: '</table>',
                items: [
                    {
                        prefix: '<td>',
                        surfix: '</td>',
                        field: 'dealAllInLastMonth'
                    },
                    {
                        prefix: '<td>',
                        surfix: '</td>',
                        field: 'dealAllAreaInLastMonth'
                    },
                    {
                        prefix: '<td>',
                        surfix: '</td>',
                        field: 'dealHouseInLastMonth'
                    },
                    {
                        prefix: '<td>',
                        surfix: '</td>',
                        field: 'dealHouseAreaInLastMonth'
                    }
                ]
            },
            {
                prefix: '<table class="tjInfo"',
                surfix: '</table>',
                items: [
                    {
                        prefix: '<td>',
                        surfix: '</td>',
                        field: 'dealAll'
                    },
                    {
                        prefix: '<td>',
                        surfix: '</td>',
                        field: 'dealAllArea'
                    },
                    {
                        prefix: '<td>',
                        surfix: '</td>',
                        field: 'dealHouse'
                    },
                    {
                        prefix: '<td>',
                        surfix: '</td>',
                        field: 'dealHouseArea'
                    }
                ]
            }
        ]
    },
    newSell: {
        url: "http://www.bjjs.gov.cn/tabid/2167/default.aspx",
        sections: [
            {
                prefix: '可售房源统计',
                surfix: '</table>',
                items: [
                    {
                        prefix: 'class="fontfamily">',
                        surfix: '</span>',
                        field: 'sellingAll'
                    },
                    {
                        prefix: 'class="fontfamily">',
                        surfix: '</span>',
                        field: 'sellingAllArea'
                    },
                    {
                        prefix: 'class="fontfamily">',
                        surfix: '</span>',
                        field: 'sellingHouse'
                    },
                    {
                        prefix: 'class="fontfamily">',
                        surfix: '</span>',
                        field: 'sellingHouseArea'
                    }
                ]
            },
            {
                prefix: '新发布房源',
                surfix: '</table>',
                items: [
                    {
                        prefix: 'class="fontfamily">',
                        surfix: '</span>',
                        field: 'newSellingAll'
                    },
                    {
                        prefix: 'class="fontfamily">',
                        surfix: '</span>',
                        field: 'newSellingAllArea'
                    },
                    {
                        prefix: 'class="fontfamily">',
                        surfix: '</span>',
                        field: 'newSellingHouse'
                    },
                    {
                        prefix: 'class="fontfamily">',
                        surfix: '</span>',
                        field: 'newSellingHouseArea'
                    }
                ]
            }
        ]
    }
}

var BJHouse = {

    parse: function() {
        var data = {};
        return BJHouse.parseTradeData(bjhouseConfigs.trade)
        .then(function(result){
            data = result;
            return BJHouse.parseTradeData(bjhouseConfigs.newSell);
        })
        .then(function(result) {
            _.mapObject(result, function(val, key){
                data[key] = val;
            })
            return LinkedHome.parse('http://bj.lianjia.com/');
        })
        .then(function(result){
            _.mapObject(result, function(val, key){
                data[key] = val;
            })
            return AV.Promise.as(data);
        })
    },

    parseTradeData: function(configs) {
        var url = configs.url;
        console.log(url);
        return utils.requestToPromise(url)
        .then( function(html) {
            var data = {};
            var startIndex = 0;
            var endIndex = 0;
            // console.log(html);
            _.each(configs.sections, function(section){
                //console.log(section);
                startIndex = html.indexOf(section.prefix, startIndex);
                // if(startIndex < 0) return null;
                var endIndex = html.indexOf(section.surfix, startIndex) + section.surfix.length;
                var rawText = html.substr(startIndex, endIndex - startIndex);

                // console.log(rawText);
                var s = 0;
                _.each(section.items, function(item){
                    s = rawText.indexOf(item.prefix, s);
                    // if(s < 0) return null;
                    s += item.prefix.length;

                    var e = rawText.indexOf(item.surfix, s);
                    var text = rawText.substr(s, e - s);
                    //console.log(text);
                    data[item.field] = parseFloat(text);
                    s = e;
                })

                startIndex = endIndex;
            })

            //console.log(data);
            return AV.Promise.as(data);
        });
    },

    saveInDb: function(data) {
        var date = new Date();
        date.setTime(date.getTime() - 24 * 60 * 60 * 1000);
        var dataString = date.format("yyyy-MM-dd");

        var query = new AV.Query('BJHouse');
        query.equalTo('date', dataString);
        return query.first()
        .then(function(bjhouse){
          if(!bjhouse) {
              bjhouse = AV.Object.new('BJHouse');
              bjhouse.set('utcDate', date.getTime());
              bjhouse.set('date', dataString);
          }

          _.mapObject(data, function(val, key){
              bjhouse.set(key, val);
          })

          console.log(bjhouse);
          return bjhouse.save();
       })
  },

  dealOnePage: function(page, beforeTime) {
    var url = 'http://210.75.213.188/shh/portal/bjjs/audit_house_list.aspx?pagenumber=' + page + '&pagesize=20';
    console.log(url);
    return BJHouse.parseDeal(url)
    .then(function(houseInfoList) {
      var needMore = true;
      console.log("Extrat " + houseInfoList.length + " items from " + url);
      //console.log(houseInfoList);
      _.each(houseInfoList, function(info){
        if(info.date > beforeTime) {
          var deal = AV.Object.new('BJDeal');
          _.mapObject(info, function(val, key){
              deal.set(key, val);
          })
          deal.save();
        } else {
          needMore = false;
        }
      })

      if(needMore){
        utils.sleep(1000);
        return BJHouse.dealOnePage( page + 1, beforeTime);
      } else {
        console.log(url + " done" );
        return AV.Promise.as();
      }
    })
  },

  parseDeal: function(url) {
      var fields = ['dealId', 'district', 'location', 'roomModel', 'roomArea', 'price', 'date'];

      return utils.requestToPromise(url)
      .then( function(html) {
          var list = [];
          var startIndex = 0;
          var endIndex = 0;
          //console.log(html);

          startIndex = html.indexOf('class="houseList"');
          startIndex = html.indexOf('<tbody>', startIndex);
          endIndex = html.indexOf('</tbody>', startIndex);
          html = html.substr(startIndex, endIndex - startIndex);
          startIndex = 0;
          while(true) {
              startIndex = html.indexOf('<tr>', startIndex);
              if(startIndex < 0) break;
              endIndex = html.indexOf('</tr>', startIndex) + '</tr>'.length;
              var rawText = html.substr(startIndex, endIndex - startIndex);
              startIndex = endIndex;

              var s = 0;
              var e = 0;
              var data = {};
              _.each(fields, function(field){
                  s = rawText.indexOf('<td>', s) + '<td>'.length;
                  e = rawText.indexOf('</td>', s);
                  data[field] = rawText.substr(s, e - s);
                  s = e;
              })
              if(data['roomArea']) data['roomArea'] = parseFloat(data['roomArea']);
              if(data['price']) data['price'] = parseInt(data['price']);

              list.push(data);
          }

          //console.log(list);
          return AV.Promise.as(list);
      });
  }
}

module.exports = BJHouse;
