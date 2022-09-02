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

/* exported init */

const GETTEXT_DOMAIN = 'goldprice-indicator-extension';

const { GObject, St, Gtk, Clutter } = imports.gi;
const Gio = imports.gi.Gio;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Soup = imports.gi.Soup;
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;

const GoldPriceIndicator = GObject.registerClass(
    class GoldPriceIndicator extends PanelMenu.Button {

        _init() {
            super._init(0.0, _('GOldPriceIndicatorButton'));
            this.periodic_task;
            this.lock = false;
            this.settings;
            this.extension_icon;
            this.price;
            this.lastUpdate;
            this.menu;
            this.api_url = 'https://data-asg.goldprice.org/GetData/';
            this.WEIGHT_OPTIONS = {
                0: "℥",
                1: "g",
                2: "kg",
            };
            this._httpSession = new Soup.SessionAsync();


            let gschema = Gio.SettingsSchemaSource.new_from_directory(
                Me.dir.get_child('schemas').get_path(),
                Gio.SettingsSchemaSource.get_default(),
                false
            );
            // settings
            this.settings = new Gio.Settings({
                settings_schema: gschema.lookup('org.gnome.shell.extensions.gold-price-monitor', true)
            });

            // Indicator
            let box = new St.BoxLayout({ style_class: 'panel-status-menu-box' });

            // Icon + Label
            // this.extension_icon = new St.Icon({
            //     // icon_name: 'face-smile-symbolic',
            //     icon_name: 'content-loading-symbolic',
            //     style_class: 'system-status-icon',
            // });
            this.price = new St.Label({
                text: '...',
                y_align: Clutter.ActorAlign.CENTER,
            });

            // drop-down menu
            this.lastUpdate = new PopupMenu.PopupMenuItem(_('Last update:'));
            let refresh = new PopupMenu.PopupMenuItem(_('Refresh'));

            refresh.connect('activate', () => {
                this.refreshData();
            });

            // set widgets
            this.menu.addMenuItem(this.lastUpdate);
            this.menu.addMenuItem(refresh);

            // box.add_child(this.extension_icon);
            box.add_child(this.price);
            box.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
            this.add_child(box);

            this.refreshData();

        }

        buildRequest() {
            const url = this.api_url + this.settings.get_value('currency').unpack() + '-XAU/1';
            let request = Soup.Message.new('GET', url);
            request.request_headers.append('Cache-Control', 'no-cache');
            request.request_headers.append('User-Agent', 'Mozilla/5.0 (Windows NT 6.3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.84 Safari/537.36');

            this.log([url]); // debug
            return request;
        }

        refreshData() {
            if (this.lock) {
                return;
            }
            this.lock = true;
            this._httpSession.queue_message(this.buildRequest(), (_, response) => {
                if (response.status_code > 299) {
                    this.log(['Remote server error:', response.status_code, response.response_body.data]);
                    return;
                }
                const json_data = JSON.parse(response.response_body.data);
                if (json_data.length === 0) {
                    this.log(['Remote server error:', response.response_body.data]);
                    return;
                }

                let latest_price = Number.parseFloat(json_data[0].split(",")[1]);
                switch (this.settings.get_value('weight-uint').unpack()) {
                    case 1:
                        latest_price = latest_price / 31.1034768;
                        break;
                    case 2:
                        latest_price = latest_price / 31.1034768 * 1000;
                        break;
                }

                latest_price = latest_price.toFixed(3);
                if (!this.settings.get_value('hide-unit').unpack()) {
                    latest_price += "(" + this.settings.get_value('currency').unpack() + ") / " + this.WEIGHT_OPTIONS[this.settings.get_value('weight-uint').unpack()];
                }

                this.log([`Update price from: ${this.price.text} to ${latest_price}`]);

                this.price.text = latest_price;

                this.lastUpdate.label_actor.text = 'Last update: ' + new Date().toLocaleTimeString();;
            });
            this.lock = false;
            this.purgeBackgroundTask();
            this.periodic_task = Mainloop.timeout_add_seconds(this.settings.get_value('refresh-interval').unpack() * 60, () => { this, this.refreshData });
        }

        log(logs) {
            global.log('[GoldPriceMonitor]', logs.join(', '));
        }

        purgeBackgroundTask() {
            if (this.periodic_task) {
                GLib.Source.remove(this.periodic_task);
                this.periodic_task = null;
            }
        }

    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new GoldPriceIndicator();

        const indicator_position = this._indicator.settings.get_value('panel-position').unpack()
        if (indicator_position === 'Left') {
            Main.panel.addToStatusArea(this._uuid, this._indicator, Main.panel._leftBox.get_children().length, 'left');
        } else if (indicator_position === 'Center') {
            Main.panel.addToStatusArea(this._uuid, this._indicator, Main.panel._centerBox.get_children().length, 'center');
        } else {
            Main.panel.addToStatusArea(this._uuid, this._indicator);
        }

        this._indicator.settings.connect('changed::panel-position', () => { this.addToPanel() });

    }

    disable() {
        this._indicator.purgeBackgroundTask();
        this._indicator.destroy();
        this._indicator = null;
    }


    addToPanel() {
        this._indicator.destroy();
        this._indicator = null;
        this._indicator = new GoldPriceIndicator();
        const indicator_position = this._indicator.settings.get_value('panel-position').unpack()
        if (indicator_position === 'Left') {
            Main.panel.addToStatusArea(this._uuid, this._indicator, Main.panel._leftBox.get_children().length, 'left');
        } else if (indicator_position === 'Center') {
            Main.panel.addToStatusArea(this._uuid, this._indicator, Main.panel._centerBox.get_children().length, 'center');
        } else {
            Main.panel.addToStatusArea(this._uuid, this._indicator);
        }
    }

}

function init(meta) {
    return new Extension(meta.uuid);
}
