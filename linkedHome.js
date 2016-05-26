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
            var prefix = '<div class="deal-price">';
            var surfix = '</ul>';
            var startIndex = html.indexOf(prefix) + prefix.length;
            if(startIndex < prefix.length) return null;

            prefix = '<ul>'
            startIndex = html.indexOf(prefix, startIndex) + prefix.length;
            var endIndex = html.indexOf(surfix, startIndex);
            var text = html.substr(startIndex, endIndex - startIndex);

            prefix = '<label>';
            surfix = '</label>';
            startIndex = 0;
            var info = {};
            _.each(['newHouseCustomerRate', 'dealCount', 'viewCount'], function(item){
                startIndex = text.indexOf(prefix, startIndex) + prefix.length;
                endIndex = text.indexOf(surfix, startIndex);
                if( startIndex >= prefix.length && endIndex > startIndex) {
                    var value = text.substr(startIndex, endIndex - startIndex);
                    info[item] =  item == 'new_house_customer_rate' ? parseFloat(value) : parseInt(value);
                }
            })

            console.log(info);
            return AV.Promise.as(info);
        });
    },

    saveInDb: function(info, city) {
        var date = new Date();
        date.setTime(date.getTime() - 24 * 60 * 60 * 1000);

        var house = AV.Object.new('LinkedHome');
        house.set('newHouseCustomerRate', info.newHouseCustomerRate);
        house.set('dealCount', info.dealCount);
        house.set('viewCount', info.viewCount);
        house.set('date', date.format("yyyy-MM-dd"));
        house.set('city', city);
        return house.save();
    }
}

module.exports = linkedHome;
