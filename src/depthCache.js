import book from 'http'
import depth from 'websocket'

class DepthCache {
    constructor(symbol) {
        this.symbol = symbol;
        this.bids = {};
        this.asks = {};
        this.bid_price = null;
        this.ask_price = null;
    }

    addBid(bid) {
        if ((bid[1]) === "0.00000000") {
            delete this.bids[bid[0]];
        } else {
            this.bids[bid[0]] = parseFloat(bid[1]);
        }
    }

    addAsk(ask) {
        if ((ask[1]) === "0.00000000") {
            delete this.asks[ask[0]];
        } else {
            this.asks[ask[0]] = parseFloat(ask[1]);
        }
    }

    getBids() {
        // return bids sorted in descending order
        return this.bids.sort((a, b) => {return b-a});
    }

    getAsks() {
        // return asks sorted in ascending order
        return this.asks.sort((a, b) => {return a-b});
    }
}

class DepthCacheManager {
    constructor(client, symbol) {
        this.client = client;
        this.symbol = symbol;
        this.last_update_id = null;
        this.depth_message_buffer = null;
        this.depth_cache = new DepthCache(this.symbol);
        this.depth_socket = this.startSocket();
        this.init_cache();
    }

    startSocket() {
        return this.client.ws.depth(this.symbol, depth => {
            if (! this.last_update_id) {
                // initial depth snapshot fetch not yet performed,
                // buffer messages
                this.depth_message_buffer.push(depth);
            } else {
                this.processDepthMessage(depth);
            }
        });
    }

    initCache() {
        this.last_update_id = null;
        this.depth_message_buffer = [];
        let order_book = book({symbol: this.symbol, limit:1000});
        for (let bid in order_book.bids) {
            this.depth_cache.addBid(bid);
        }
        for (let ask in order_book.asks) {
            this.depth_cache.addAsk(ask);
        }
        this.last_update_id = order_book.last_update_id;
        for (let message in this.depth_message_buffer) {
            this.processDepthMessage(message);
        }
    }

    processDepthMessage(message) {
        if (message.u < this.last_update_id) {
            // finalUpdate < lastUpdate, do nothing
            return;
        }

        if(message.U !== this.last_update_id + 1) {
            // if not buffered check we get sequential updates
            // otherwise init cache again
            this.initCache();
        }

        // add any bid or ask values
        for (let bid in message.b) {
            this.depth_cache.addBid(bid);
        }
        for (let ask in message.a) {
            this.depth_cache.addAsk(ask);
        }
    }
}

export default {
    DepthCache,
    DepthCacheManager
}