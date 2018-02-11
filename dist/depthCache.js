'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _http = require('./http');

var _http2 = _interopRequireDefault(_http);

var _websocket = require('./websocket');

var _websocket2 = _interopRequireDefault(_websocket);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DepthCache = function () {
    function DepthCache(symbol) {
        _classCallCheck(this, DepthCache);

        this.symbol = symbol;
        this.bids = {};
        this.asks = {};
        this.bid_price = null;
        this.ask_price = null;
    }

    _createClass(DepthCache, [{
        key: 'addBid',
        value: function addBid(bid) {
            if (bid[1] === "0.00000000") {
                delete this.bids[bid[0]];
            } else {
                this.bids[bid[0]] = parseFloat(bid[1]);
            }
        }
    }, {
        key: 'addAsk',
        value: function addAsk(ask) {
            if (ask[1] === "0.00000000") {
                delete this.asks[ask[0]];
            } else {
                this.asks[ask[0]] = parseFloat(ask[1]);
            }
        }
    }, {
        key: 'getBids',
        value: function getBids() {
            // return bids sorted in descending order
            return this.bids.sort(function (a, b) {
                return b - a;
            });
        }
    }, {
        key: 'getAsks',
        value: function getAsks() {
            // return asks sorted in ascending order
            return this.asks.sort(function (a, b) {
                return a - b;
            });
        }
    }]);

    return DepthCache;
}();

var DepthCacheManager = function () {
    function DepthCacheManager(client, symbol) {
        _classCallCheck(this, DepthCacheManager);

        this.client = client;
        this.symbol = symbol;
        this.last_update_id = null;
        this.depth_message_buffer = null;
        this.depth_cache = new DepthCache(this.symbol);
        this.depth_socket = this.startSocket();
        this.init_cache();
    }

    _createClass(DepthCacheManager, [{
        key: 'startSocket',
        value: function startSocket() {
            var _this = this;

            return this.client.ws.depth(this.symbol, function (depth) {
                if (!_this.last_update_id) {
                    // initial depth snapshot fetch not yet performed,
                    // buffer messages
                    _this.depth_message_buffer.push(depth);
                } else {
                    _this.processDepthMessage(depth);
                }
            });
        }
    }, {
        key: 'initCache',
        value: function initCache() {
            this.last_update_id = null;
            this.depth_message_buffer = [];
            var order_book = (0, _http2.default)({ symbol: this.symbol, limit: 1000 });
            for (var bid in order_book.bids) {
                this.depth_cache.addBid(bid);
            }
            for (var ask in order_book.asks) {
                this.depth_cache.addAsk(ask);
            }
            this.last_update_id = order_book.last_update_id;
            for (var message in this.depth_message_buffer) {
                this.processDepthMessage(message);
            }
        }
    }, {
        key: 'processDepthMessage',
        value: function processDepthMessage(message) {
            if (message.u < this.last_update_id) {
                // finalUpdate < lastUpdate, do nothing
                return;
            }

            if (message.U !== this.last_update_id + 1) {
                // if not buffered check we get sequential updates
                // otherwise init cache again
                this.initCache();
            }

            // add any bid or ask values
            for (var bid in message.b) {
                this.depth_cache.addBid(bid);
            }
            for (var ask in message.a) {
                this.depth_cache.addAsk(ask);
            }
        }
    }]);

    return DepthCacheManager;
}();

exports.default = {
    DepthCache: DepthCache,
    DepthCacheManager: DepthCacheManager
};