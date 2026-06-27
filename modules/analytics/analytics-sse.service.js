'use strict';

let _counter = 0;
const _clients = new Map(); // id → Express Response

const analyticsSSE = {
    add(res) {
        const id = ++_counter;
        _clients.set(id, res);
        return id;
    },
    remove(id) {
        _clients.delete(id);
    },
    push(event, data) {
        if (_clients.size === 0) return;
        const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        for (const res of _clients.values()) {
            try { res.write(chunk); } catch (_) {}
        }
    },
    get size() { return _clients.size; },
};

// Heartbeat every 15 s — keeps proxies / load-balancers from closing idle connections
setInterval(() => {
    if (_clients.size === 0) return;
    const chunk = `event: heartbeat\ndata: ${Date.now()}\n\n`;
    for (const res of _clients.values()) {
        try { res.write(chunk); } catch (_) {}
    }
}, 15000);

module.exports = analyticsSSE;
