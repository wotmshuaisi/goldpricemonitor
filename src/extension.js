/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GObject from "gi://GObject";
import St from "gi://St";
import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Soup from "gi://Soup?version=3.0";

import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Util from "resource:///org/gnome/shell/misc/util.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Currencies from "./currencies.js";

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    displayText = "...";

    _get_settings() {
      this._settings = Extension.lookupByUUID("Gold_Price_Monitor@wotmshuaisi_github").getSettings();
    }

    _init() {
      super._init(0.0, _("Gold Price Indicator"));
      this._get_settings();
      this._httpSession = new Soup.Session();
      this.api_url = "https://data-asg.goldprice.org/GetData/";
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
        Util.spawn(["gnome-extensions", "prefs", "Gold_Price_Monitor@wotmshuaisi_github"]);
      });
      // Display
      this.menu.addMenuItem(this.lastUpdate);
      this.menu.addMenuItem(refreshBtn);
      this.menu.addMenuItem(settingsBtn);
      this.add_child(this.price);
      // Event loop
      this._fetch_data();
      this.backgroundTask = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this._get_refresh_interval() * 60, () => {
        this._fetch_data();
        return GLib.SOURCE_CONTINUE;
      });
    }

    _get_unit() {
      switch (this._settings.get_value("weight-unit").unpack()) {
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
      const cIdx = this._settings.get_value("currency").unpack();
      return Currencies.list()[cIdx].unit;
    }

    _get_refresh_interval() {
      return this._settings.get_value("refresh-interval").unpack();
    }

    _build_req() {
      const url = `${this.api_url}${this._get_currency()}-XAU/1`;
      let request = Soup.Message.new("GET", url);
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
      let msg = this._build_req();
      this._httpSession.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (_, response) => {
        response = new TextDecoder("utf-8").decode(this._httpSession.send_and_read_finish(response).get_data());

        if (msg.get_status() > 299) {
          this._log(["Remote server error:", msg.get_status(), response]);
          return;
        }

        const json_data = JSON.parse(response);
        if (json_data.length === 0) {
          this._log(["Remote server error:", response]);
          return;
        }

        let latest_price = Number.parseFloat(json_data[0].split(",")[1]);
        switch (this._settings.get_value("weight-unit").unpack()) {
          case 1:
            latest_price = latest_price / 31.1034768;
            break;
          case 2:
            latest_price = (latest_price / 31.1034768) * 1000;
            break;
        }

        latest_price = latest_price.toFixed(3);
        if (!this._settings.get_value("hide-unit").unpack()) {
          latest_price += `(${this._get_currency()})/${this._get_unit()}`;
        }

        this._log([`Update price from: ${this.price.text} to ${latest_price}`]);

        this.price.text = latest_price;

        this.lastUpdate.label_actor.text = "Last update: " + new Date().toLocaleTimeString();
      });
      this.lock = false;
    }

    _log(logs) {
      console.debug("[GoldPriceMonitor]", logs.join(", "));
      // Main.notifyError("GoldPriceMonitor", logs.join(", "));
    }

    _onDestroy() {
      // Remove the background taks
      GLib.source_remove(this.backgroundTask);
      super._onDestroy();
    }
  }
);

export default class GoldPriceIndicatorExtension extends Extension {
  enable() {
    this._settings = this.getSettings();
    this.run();

    this._settings.connect("changed::weight-unit", (settings, key) => {
      this.disable();
      this.run();
    });

    this._settings.connect("changed::currency", (settings, key) => {
      this.disable();
      this.run();
    });

    this._settings.connect("changed::refresh-interval", (settings, key) => {
      this.disable();
      this.run();
    });

    this._settings.connect("changed::hide-unit", (settings, key) => {
      this.disable();
      this.run();
    });

    this._settings.connect("changed::panel-position", (settings, key) => {
      this.disable();
      this.run();
    });
  }

  run() {
    this._indicator = new Indicator();

    this.addToPanel(this._settings.get_value("panel-position").unpack());
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
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
