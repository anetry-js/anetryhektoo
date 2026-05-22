const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

const RAW_URL =
  'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/all/data.txt';

const liveProxies = [];

// Download proxy list
function fetchProxies() {
  return new Promise((resolve, reject) => {

    https.get(RAW_URL, (res) => {

      if (res.statusCode !== 200) {
        reject(new Error(`Failed download: ${res.statusCode}`));
        return;
      }

      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {

        const unique = [
          ...new Set(
            data
              .split('\n')
              .map(v => v.trim())
              .filter(Boolean)
          )
        ];

        resolve(unique.slice(0, 75));

      });

    }).on('error', reject);

  });
}

// Check proxy
function check(proxy) {

  return new Promise((resolve) => {

    let cmd;

    if (proxy.startsWith('socks')) {

      cmd = `curl --socks5 ${proxy.replace('socks5://', '')} https://api.ipify.org --max-time 10 -s`;

    } else {

      cmd = `curl -x ${proxy} https://api.ipify.org --max-time 10 -s`;

    }

    exec(cmd, (err, stdout) => {

      if (err || !stdout.trim()) {

        console.log(`❌ DEAD => ${proxy}`);

      } else {

        console.log(`✅ LIVE => ${proxy} | IP: ${stdout.trim()}`);

        liveProxies.push(proxy);

      }

      resolve();

    });

  });

}

(async () => {

  try {

    console.log('📥 Downloading proxy list...\n');

    const proxies = await fetchProxies();

    console.log(`🧹 Unique proxies: ${proxies.length}`);
    console.log(`🔍 Scanning proxies...\n`);

    await Promise.all(
      proxies.map(proxy => check(proxy))
    );

    const uniqueLive = [...new Set(liveProxies)];

    fs.writeFileSync(
      'proxy.txt',
      uniqueLive.join('\n')
    );

    console.log(`\n💾 Saved ${uniqueLive.length} live proxies to proxy.txt`);

  } catch (e) {

    console.log('ERROR:', e.message);

  }

})();