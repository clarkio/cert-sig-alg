var fs = require('fs');
var https = require('https');
var rl = require('readline');

var openssl = require('openssl-wrapper');
var Q = require('q');

var tempDir = './temp/';
var found = false;
var resolveCount = 0;
var results = [];
var hosts = ['google.com', 'yahoo.com', 'nfl.com', 'msn.com', 'twitter.com', 'github.com'];

createTempDirectory();
for (var i = 0; i < hosts.length; i++) {
    getCertificateSignatureAlgorithmAsync(hosts[i])
        .then(checkIfCompletelyDone);
}

function checkIfCompletelyDone() {
    resolveCount++;
    if (resolveCount === hosts.length) {
        removeTempDirectory()
            .then(function () {
                printResults();
            });
    }
}

function printResults() {
    console.log('\nRESULTS:');
    results.forEach(function (element, index, array) {
        var host = Object.keys(element)[0];
        console.log(host + ': ' + element[host]);
    });
    console.log('\ncompletely finished');
}

function getCertificateSignatureAlgorithmAsync(host) {
    var deferred = Q.defer();
    console.log('processing ' + host + '...');
    getHostCertificate(host)
        .then(function (buffer) {
            return createPemFileFromCertificate(buffer, host);
        })
        .then(readCertificate)
        .then(function (fileBuffer) {
            return parseCertificateForSignatureAlgorithm(fileBuffer, host, i);
        })
        .then(function (signatureAlgorithm) {
            var hash = {};
            hash[host] = signatureAlgorithm;
            results.push(hash);
            console.log('completed processing ' + host);
            deferred.resolve();
        });
    return deferred.promise;
}

function getHostCertificate(host) {
    var deferred = Q.defer();
    openssl.exec('s_client', { connect: host + ':443' }, function (err, buffer) {
        deferred.resolve(buffer);
    })
    return deferred.promise;
}

function createPemFileFromCertificate(buffer, host) {
    var deferred = Q.defer();
    var file = tempDir + host + '.pem';
    fs.writeFile(file, buffer.toString(), function (err) {
        if (err) {
            console.log(err);
            deferred.reject(err);
        } else {
            deferred.resolve(file);
        }
    });
    return deferred.promise;
}

function readCertificate(file) {
    var deferred = Q.defer();
    openssl.exec('x509', { text: true, in: file }, function (err, buffer) {
        deferred.resolve(buffer);
    });
    return deferred.promise;
}

function parseCertificateForSignatureAlgorithm(fileBuffer, element, index) {
    var deferred = Q.defer();
    var found = false;
    var signatureAlgorithm;
    fs.writeFile(tempDir + element + '.txt', fileBuffer.toString(), function (err) {
        var lineReader = rl.createInterface({
            input: fs.createReadStream(tempDir + element + '.txt')
        });

        lineReader.on('line', function (line) {
            if (!found && line.indexOf('Signature Algorithm') > -1) {
                signatureAlgorithm = line.split(':')[1].trim();
                found = true;
            }
        });

        lineReader.on('close', function () {
            found = false;
            deferred.resolve(signatureAlgorithm);
        });
    });
    return deferred.promise;
}

function createTempDirectory() {
    console.log('creating temp dir...');
    var deferred = Q.defer();
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
        console.log('completed creating temp dir');
        deferred.resolve();
    } else {
        console.log('completed creating temp dir');
        deferred.resolve();
    }
    return deferred.promise;
}

function removeTempDirectory() {
    console.log('removing temp dir...');
    var deferred = Q.defer();
    removeTempDirectoryFiles()
        .then(function () {
            fs.rmdirSync(tempDir);
            console.log('completed removing temp dir');
            deferred.resolve();
        });
    return deferred.promise;
}

function removeTempDirectoryFiles() {
    var deferred = Q.defer();
    var files = fs.readdirSync(tempDir);
    for (var i = 0; i < files.length; i++) {
        fs.unlinkSync(tempDir + files[i]);
        if (i === files.length - 1) {
            deferred.resolve();
        }
    }
    return deferred.promise;
}
