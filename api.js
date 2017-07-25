const Secrets = require("./secrets");
const fetch = require("node-fetch");

class Api {
  static async _makeRequest(method, url, body, headers) {
    const opts = {
      method,
      credentials: "include",
      headers: headers
    };

    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }

    return fetch(url, opts).then(res => res.json());
  }

  static _get(url, headers) {
    return this._makeRequest("get", url, {}, headers);
  }

  static pubgProfile(nickname) {
    return this._get(`https://pubgtracker.com/api/profile/pc/${nickname}`, {"TRN-API-KEY": Secrets.PUBG_TRACKER_TOKEN});
  }
}

module.exports = Api;