import GObject from "gi://GObject";
import St from "gi://St";
import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Soup from "gi://Soup";

import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Util from "resource:///org/gnome/shell/misc/util.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Currencies from "./currencies.js";

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    displayText = "...";


    _init(ext) {
      super._init(0.0, _("Gold Price Indicator"));
      this._httpSession = new Soup.Session();
      this._ext = ext;
      this.apiProviders = [
        "https://data-asg.goldprice.org/GetData/", // primary provider (no key required)
        "https://www.goldapi.io/api/",              // secondary provider (requires API key)
        "https://api.gold-api.com/price/"           // gold-api.com provider (no key required)
      ]
      this.api_url = "";
      this.lock = false;
      this.price;
      this.lastUpdate;

      // Components
      this.price = new St.Label({
        text: "...",
        y_align: Clutter.ActorAlign.CENTER,
      });
      this.lastUpdate = new PopupMenu.PopupMenuItem(_(`Last update: ...`));
      let refreshBtn = new PopupMenu.PopupMenuItem(_(`Refresh`));
      let settingsBtn = new PopupMenu.PopupMenuItem(_(`Settings`));
      // Events
      refreshBtn.connect("activate", () => {
        this._fetch_data();
      });
      settingsBtn.connect("activate", () => {
        this._ext.openPreferences();
      });
      // Display
      this.menu.addMenuItem(this.lastUpdate);
      this.menu.addMenuItem(refreshBtn);
      this.menu.addMenuItem(settingsBtn);
      this.add_child(this.price);
      // Event loop
      this._fetch_data();
      if (this._get_refresh_interval() > 0) {
        this.backgroundTask = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this._get_refresh_interval() * 3600, () => {
          this._fetch_data();
          return GLib.SOURCE_CONTINUE;
        });
      }
    }

    _get_setting_val(key) {
      return this._ext._settings.get_value(key).unpack();
    }

    _get_unit() {
      switch (this._get_setting_val("weight-unit")) {
        case 0:
          return "℥";
        case 1:
          return "g";
        case 2:
          return "kg";
      }
      return "℥";
    }

    _get_currency() {
      const cIdx = this._get_setting_val("currency");
      return Currencies.list()[cIdx].unit;
    }

    _get_refresh_interval() {
      return this._get_setting_val("refresh-interval");
    }

    // helper accessors for the settings we added
    _get_api_provider() {
      return this._get_setting_val("api-provider");
    }

    _get_api_key() {
      return this._get_setting_val("api-key");
    }

    _get_selected_metals() {
      let metals = [];
      if (this._get_setting_val("show-gold")) {
        metals.push("XAU");
      }
      if (this._get_setting_val("show-silver")) {
        metals.push("XAG");
      }
      if (metals.length === 0) {
        metals.push("XAU");
      }
      return metals;
    }

    _build_req(metal) {
      const currency = this._get_currency();
      const provider = this._get_api_provider();
      let request = null;
      var url = "";
      // choose base url depending on selected provider
      switch (provider) {
        case 1:
          // goldapi.io
          this.api_url = this.apiProviders[1];
          // goldapi accepts /{metal}/{currency}
          url = `${this.api_url}${metal}/${currency}`;
          request = Soup.Message.new("GET", url);
          // add the API key header for goldapi.io if provided
          const key = this._get_api_key();
          if (key && key.length > 0) {
            request.request_headers.append("x-access-token", key);
          }
          break;
        case 2:
          // gold-api.com
          this.api_url = this.apiProviders[2];
          // gold-api accepts /price/{metal}/{currency}
          url = `${this.api_url}${metal}/${currency}`;
          request = Soup.Message.new("GET", url);
          break;
        default:
          // goldprice.org
          this.api_url = this.apiProviders[0];
          url = `${this.api_url}${currency}-${metal}/1`;
          request = Soup.Message.new("GET", url);
          break;
      }
      request.request_headers.append("Cache-Control", "no-cache");
      request.request_headers.append("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6831.62 Safari/537.36");

      this._log([url]); // debug
      return request;
    }

    _fetch_data() {
      if (this.lock) {
        return;
      }
      this.lock = true;
      const metals = this._get_selected_metals();
      const results = {};
      let pending = metals.length;

      metals.forEach((metal) => {
        this._fetch_metal_price(metal, (m, priceVal) => {
          results[m] = priceVal;
          pending--;
          if (pending === 0) {
            let displayParts = [];
            const hideSymbols = this._get_setting_val("hide-symbols");
            metals.forEach((item) => {
              const formatted = this._format_price(results[item]);
              if (metals.length > 1 && !hideSymbols) {
                displayParts.push(`${item}: ${formatted}`);
              } else {
                displayParts.push(formatted);
              }
            });

            this.price.text = displayParts.join(" | ");
            this.lastUpdate.label_actor.text = "Last update: " + new Date().toLocaleTimeString();
            this.lock = false;
          }
        });
      });
    }

    _fetch_metal_price(metal, callback) {
      let msg = this._build_req(metal);
      this._httpSession.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (_, response) => {
        try {
          const resBytes = this._httpSession.send_and_read_finish(response);
          const responseText = new TextDecoder("utf-8").decode(resBytes.get_data());

          if (msg.get_status() > 299) {
            this._log(["Remote server error for", metal, msg.get_status(), responseText]);
            callback(metal, null);
            return;
          }

          const json_data = JSON.parse(responseText);
          let latest_price;

          // provider-specific parsing
          switch (this._get_api_provider()) {
            case 0:
              // goldprice.org returns an array of comma separated strings
              if (!Array.isArray(json_data) || json_data.length === 0) {
                this._log(["Remote server error:", responseText]);
                callback(metal, null);
                return;
              }
              latest_price = Number.parseFloat(json_data[0].split(",")[1]);
              break;
            case 1:
            case 2:
              // goldapi.io and gold-api.com return an object with a `price` property
              if (!json_data || typeof json_data.price === "undefined") {
                this._log(["Remote server error:", responseText]);
                callback(metal, null);
                return;
              }
              latest_price = Number.parseFloat(json_data.price);
              break;
            default:
              latest_price = 0.0;
              break;
          }

          callback(metal, latest_price);
        } catch (e) {
          this._log(["Error parsing data for", metal, e]);
          callback(metal, null);
        }
      });
    }

    _format_price(raw_price) {
      if (raw_price === null || typeof raw_price === "undefined" || isNaN(raw_price)) {
        return "N/A";
      }
      let priceVal = raw_price;
      switch (this._get_setting_val("weight-unit")) {
        case 1:
          priceVal = priceVal / 31.1034768;
          break;
        case 2:
          priceVal = (priceVal / 31.1034768) * 1000;
          break;
      }

      let formatted = priceVal.toFixed(3);
      if (!this._get_setting_val("hide-unit")) {
        formatted += `(${this._get_currency()})/${this._get_unit()}`;
      }
      return formatted;
    }

    _log(logs) {
      console.debug("[GoldPriceMonitor]", logs.join(", "));
      // Main.notifyError("GoldPriceMonitor", logs.join(", "));
    }

    destroy() {
      // Remove the background taks
      this._httpSession.abort();
      GLib.source_remove(this.backgroundTask);
      super.destroy();
    }
  }
);

export default class GoldPriceIndicatorExtension extends Extension {
  enable() {
    this._settings = this.getSettings();
    this._indicator = new Indicator(this);
    this.addToPanel(this._settings.get_value("panel-position").unpack());

    ["weight-unit", "currency", "refresh-interval", "hide-unit", "hide-symbols", "panel-position", "api-provider", "api-key", "show-gold", "show-silver"].forEach((key) => {
      this._settings.connect(`changed::${key}`, () => {
        this.disable();
        this.enable();
      });
    });
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
    this._settings = null;
  }

  addToPanel(indicator_position) {
    switch (indicator_position) {
      case 0:
        Main.panel.addToStatusArea(this.uuid, this._indicator, Main.panel._leftBox.get_children().length, "left");
        break;
      case 1:
        Main.panel.addToStatusArea(this.uuid, this._indicator, Main.panel._centerBox.get_children().length, "center");
        break;
      case 2:
        Main.panel.addToStatusArea(this.uuid, this._indicator);
        break;
    }
  }
}
