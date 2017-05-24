## Install

```
$ npm install --save cert-sig-alg
```


## Usage

```js
const certSigChecker = require('cert-sig-alg');

certSigChecker(['google.com']);
/*
=> creating temp dir...
=> completed creating temp dir
=> processing google.com...
=> completed processing google.com
=> removing temp dir...
=> completed removing temp dir
=> RESULTS:
=> google.com: sha256WithRSAEncryption
=> completely finished
*/
```
