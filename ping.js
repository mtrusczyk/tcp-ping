// based off of https://github.com/apaszke/tcp-ping
// rewritten with modern es6 syntax & promises

const net = require('net');

var ping = function (options, callback) {
    var i = 0;
    var results = [];
    options.address = options.address || 'localhost';
    options.port = options.port || 80;
    options.attempts = options.attempts || 10;
    options.timeout = options.timeout || 5000;
    var check = function (options, callback) {
        if (i < options.attempts) {
            connect(options, callback);
        } else {
            var avg = results.reduce(function (prev, curr) {
                return prev + curr.time;
            }, 0);
            var max = results.reduce(function (prev, curr) {
                return (prev > curr.time) ? prev : curr.time;
            }, results[0].time);
            var min = results.reduce(function (prev, curr) {
                return (prev < curr.time) ? prev : curr.time;
            }, results[0].time);
            avg = avg / results.length;
            var out = {
                address: options.address,
                port: options.port,
                attempts: options.attempts,
                avg: avg,
                max: max,
                min: min,
                results: results
            };
            callback(undefined, out);
        }
    };

    var connect = function (options, callback) {
        var s = new net.Socket();
        var start = process.hrtime();
        s.connect(options.port, options.address, function () {
            var time_arr = process.hrtime(start);
            var time = (time_arr[0] * 1e9 + time_arr[1]) / 1e6;
            results.push({
                seq: i,
                time: time
            });
            s.destroy();
            i++;
            check(options, callback);
        });
        s.on('error', function (e) {
            results.push({
                seq: i,
                time: undefined,
                err: e
            });
            s.destroy();
            i++;
            check(options, callback);
        });
        s.setTimeout(options.timeout, function () {
            results.push({
                seq: i,
                time: undefined,
                err: Error('Request timeout')
            });
            s.destroy();
            i++;
            check(options, callback);
        });
    };
    connect(options, callback);
};

const pingAsync = (options) => {
    let i = 0;
    const results = [];

    //default values
    options.attempts = options.attempts || 10;
    options.timeout = options.timeout || 1500;

    return new Promise(async (resolve, reject) => {
        while (i < options.attempts) {
            var res = await connect(options, i);
            results.push(res);
            i++;
        }
        const average = results.reduce(function (prev, curr) {
            return prev + curr.time;
        }, 0) / results.length;
        const maximum = results.reduce(function (prev, curr) {
            return (prev > curr.time) ? prev : curr.time;
        }, results[0].time);
        const minimum = results.reduce(function (prev, curr) {
            return (prev < curr.time) ? prev : curr.time;
        }, results[0].time);

        resolve({
            address: options.address,
            port: options.port,
            attempts: options.attempts,
            results: results,
            average: average,
            maximum: maximum,
            minimum: minimum
        });
    });
}

const connect = (options, attempt) => {
    return new Promise((resolve, reject) => {
        let s = new net.Socket();
        let start = process.hrtime();
        s.connect(options.port, options.address, () => {
            let time_arr = process.hrtime(start);
            let time = (time_arr[0] * 1e9 + time_arr[1]) / 1e6;
            const result = {
                seq: attempt || 0,
                time: time
            };
            s.destroy();
            resolve(result);
        });
        s.on('error', (err) => {
            const result = {
                seq: attempt || 0,
                time: undefined,
                err: err
            };
            s.destroy();
            resolve(result);
        });
        s.setTimeout(options.timeout, () => {
            const result = {
                seq: attempt || 0,
                time: undefined,
                err: Error('Request timeout')
            };
            s.destroy();
            resolve(result);
        });
    });
};

module.exports.probeAsync = (host, port, timeout) => {
    return new Promise(async (resolve, reject) => {
        var result = await connect({
            port: port,
            address: host,
            timeout: timeout || 2000
        });
        resolve(!result.err);
    })
}

module.exports.probe = function (address, port, callback) {
    address = address || 'localhost';
    port = port || 80;
    ping({
        address: address,
        port: port,
        attempts: 1,
        timeout: 5000
    }, function (err, data) {
        var available = data.min !== undefined;
        callback(err, available);
    });
};

module.exports.ping = ping;
module.exports.pingAsync = pingAsync