var AV = require('./av.js');
var request = require('request');
var _ = require('underscore');
var utils = require('./utils');
var extension = require('./extension');

var linkedHome = {
    parse: function(url) {
        return utils.requestToPromise(url)
        .then( function(html) {
            // console.log(html);
            var info = {};
            var prefix = '二手房市场行情';
            var surfix = '</ul>';
            var startIndex = html.indexOf(prefix) + prefix.length;
            endIndex = html.indexOf(surfix, startIndex);
            var rawText = html.substr(startIndex, endIndex - startIndex);

            prefix = '<label';
            surfix = '</label>';
            startIndex = 0;
            _.each(['ljDealPrice', 'ljTagPrice'], function(item){
                startIndex = rawText.indexOf(prefix, startIndex) + prefix.length;
                endIndex = rawText.indexOf(surfix, startIndex);
                if( startIndex >= prefix.length && endIndex > startIndex) {
                    var value = rawText.substr(startIndex, endIndex - startIndex);
                    console.log(value);
                    var patt = /(\d+)/;
                    var res;
                    if ((res = patt.exec(value)) !== null) {
                        info[item] =  parseFloat(res[1]);
                    }
                }
            })

            prefix = '<ul>';
            startIndex = rawText.indexOf(prefix, startIndex) + prefix.length;
            var text = rawText.substr(startIndex);

            prefix = '<label>';
            surfix = '</label>';
            startIndex = 0;
            _.each(['ljNewHCRate', 'ljDeal', 'ljView'], function(item){
                startIndex = text.indexOf(prefix, startIndex) + prefix.length;
                endIndex = text.indexOf(surfix, startIndex);
                if( startIndex >= prefix.length && endIndex > startIndex) {
                    var value = text.substr(startIndex, endIndex - startIndex);
                    info[item] =  parseFloat(value);
                }
            })

            // console.log(info);
            return AV.Promise.as(info);
        });
    },

    saveInDb: function(info, city) {
        var date = new Date();
        date.setTime(date.getTime() - 24 * 60 * 60 * 1000);
        var dataString = date.format("yyyy-MM-dd");

        var query = new AV.Query('LinkedHome');
        query.equalTo('city', city);
        query.equalTo('date', dataString);
        return query.first()
        .then(function(house){
          if(house) {
              house.set('newHouseCustomerRate', info.newHouseCustomerRate);
              house.set('dealCount', info.dealCount);
              house.set('viewCount', info.viewCount);
            return house.save();
          } else {
            var house = AV.Object.new('LinkedHome');
            house.set('newHouseCustomerRate', info.newHouseCustomerRate);
            house.set('dealCount', info.dealCount);
            house.set('viewCount', info.viewCount);
            house.set('date', date.format("yyyy-MM-dd"));
            house.set('city', city);
            return house.save();
        }
    })
  }
}

module.exports = linkedHome;
