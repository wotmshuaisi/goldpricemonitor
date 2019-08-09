const St = imports.gi.St;
const Lang = imports.lang;
const Soup = imports.gi.Soup;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Mainloop = imports.mainloop;
const Tweener = imports.ui.tweener;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

// for application - constants
const _httpSession = new Soup.SessionAsync();
const api_endpoint = "https://data-asg.goldprice.org/GetData/";
const WEIGHT_UNIT = "weight-uint";
const CURRENCY = "currency";
const REFRESH_INTERVAL = "refresh-interval";
const WEIGHT_OPTIONS = {
    0: "℥",
    1: "g",
    2: "kg",
}
// for application - variables
let text, button, price, settings, taskLock, refresh_trigger, pause;

function _refresh_price() {
    // lock
    if (taskLock === true) {
        return
    }
    taskLock = true
    // request
    let request = Soup.Message.new("GET", api_endpoint + settings.get_string(CURRENCY) + "-XAU/1");
    _httpSession.queue_message(request, function (session, message) {
        if (request.status_code !== 200) {
            log("[Gold Price Monitor]: bad response - ", message.status_code);
            return;
        }
        let data = JSON.parse(request.response_body.data);
        if (data.length !== 1) {
            log("[Gold Price Monitor]: unexpected response - ", request.response_body.data);
            return;
        }
        let price_number = Number.parseFloat(data[0].split(",")[1]);
        switch (settings.get_int(WEIGHT_UNIT)) {
            case 1:
                price_number = price_number / 31.1034768;
                break;
            case 2:
                price_number = price_number / 31.1034768 * 1000;
                break;
        }
        price.text = price_number.toFixed(3) + "(" + settings.get_string(CURRENCY) + ") / " + WEIGHT_OPTIONS[settings.get_int(WEIGHT_UNIT)];
    });

    _refresh_done();
}


function _refresh_done() {
    taskLock = false;
    if (pause == true) {
        return;
    }
    if (refresh_trigger) {
        Mainloop.source_remove(refresh_trigger);
        refresh_trigger = null;
    }
    refresh_trigger = Mainloop.timeout_add_seconds(settings.get_int(REFRESH_INTERVAL) * 60, Lang.bind(this, _refresh_price));
}


function init() {
    // settings
    settings = Convenience.getSettings();
    // Widget
    button = new St.Bin({
        style_class: 'panel-button',
        reactive: true,
        can_focus: true,
        x_fill: true,
        y_fill: false,
        track_hover: true
    });
    price = new St.Label({
        text: "Loading..."
    });
    button.set_child(price);
    // Events
    button.connect('button-press-event', _refresh_price);
    _refresh_price();
}

function enable() {
    pause = false;
    Main.panel._rightBox.insert_child_at_index(button, 0);
}

function disable() {
    pause = true;
    Main.panel._rightBox.remove_child(button);
}
