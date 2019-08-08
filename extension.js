
const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Soup = imports.gi.Soup;

const _httpSession = new Soup.SessionAsync();

const api_endpoint = "https://data-asg.goldprice.org/GetData/"

let text, button, price;

function _refresh_done() {
}

function _refresh_price() {
    // var date = new Date();
    // price.text = date.getTime().toString();

    var request = Soup.Message.new("GET", api_endpoint + "USD-XAU/1");
    _httpSession.queue_message(request, function (session, message) {
        if (request.status_code !== 200) {
            log("[Gold Price Monitor]: bad response - ", message.status_code);
            return;
        }
        var data = JSON.parse(request.response_body.data);
        if (data.length !== 1) {
            log("[Gold Price Monitor]: unexpected response - ", request.response_body.data);
            return;
        }
        var price_text = data[0];
        price.text = price_text.split(",")[1] + "(USD) / ℥";
    })

    _refresh_done();
}

function init() {
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
    button.connect('button-press-event', _refresh_price);
    _refresh_price();
}

function enable() {
    Main.panel._rightBox.insert_child_at_index(button, 0);
}

function disable() {
    Main.panel._rightBox.remove_child(button);
}
