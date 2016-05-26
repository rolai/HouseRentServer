var AV = require('leanengine');
var configs = require('./configs.json');

var keys = AV.keys = configs['prod'];
AV.initialize(keys.APP_ID, keys.APP_KEY, keys.MASTER_KEY);
AV.setProduction(1);
AV.Cloud.useMasterKey();

module.exports = AV;
