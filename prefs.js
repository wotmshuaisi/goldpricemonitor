const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Currencies = Me.imports.currencies;

let weightUnit, settings, options;

function init() {
    settings = Convenience.getSettings();
    options = [
        { id: 0, name: "Ounce(℥)" },
        { id: 1, name: "Gram(g)" },
        { id: 2, name: "Kilogram(kg)" }
    ]
}

function buildComboBox(key, values, labeltext, type) {
    let hbox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        margin_top: 5
    });

    let setting_label = new Gtk.Label({
        label: labeltext,
        xalign: 0
    });

    let model = new Gtk.ListStore();
    model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);
    let setting_enum = new Gtk.ComboBox({ model: model });
    setting_enum.get_style_context().add_class(Gtk.STYLE_CLASS_RAISED);
    let renderer = new Gtk.CellRendererText();
    setting_enum.pack_start(renderer, true);
    setting_enum.add_attribute(renderer, 'text', 1);

    switch (type) {
        case "unit":
            // append into ComboBox
            for (let i = 0; i < values.length; i++) {
                let item = values[i];
                let iter = model.append();
                model.set(iter, [0, 1], [item.id, item.name]);
                if (item.id == settings.get_int(key)) {
                    setting_enum.set_active_iter(iter);
                }
            }
            // tracking value change
            setting_enum.connect('changed', function (entry) {
                let [success, iter] = setting_enum.get_active_iter();
                if (!success)
                    return;
                let id = model.get_value(iter, 0);
                settings.set_int(key, id);
            });
            break;
        case "currencies":
            // append into ComboBox
            for (let i = 0; i < values.length; i++) {
                let item = values[i];
                let iter = model.append();
                model.set(iter, [0, 1], [item.curr, item.name]);
                if (item.curr == settings.get_string(key)) {
                    setting_enum.set_active_iter(iter);
                }
            }
            // tracking value change
            setting_enum.connect('changed', function (entry) {
                let [success, iter] = setting_enum.get_active_iter();
                if (!success)
                    return;
                let id = model.get_value(iter, 0);
                settings.set_string(key, id);
            });
            break;
    }


    hbox.pack_start(setting_label, true, true, 0);
    hbox.add(setting_enum);

    return hbox;
}

function buildPrefsWidget() {
    let frame = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, border_width: 10, spacing: 10 });
    frame.add(buildComboBox("weight-uint", options, "Gold Weight Unit", "unit"));
    frame.add(buildComboBox("currency", Currencies.hcCurrencies, "Gold Currency", "currencies"));

    let hbox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        margin_top: 5
    });
    let setting_label = new Gtk.Label({
        label: "Refresh interval(seconds)",
        xalign: 0
    });

    let model = new Gtk.ListStore();
    model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);
    let setting_input = Gtk.SpinButton.new_with_range(0, 60 * 60 * 24, 1);
    setting_input.get_style_context().add_class(Gtk.STYLE_CLASS_RAISED);
    setting_input.value = settings.get_int("refresh-interval")

    setting_input.connect('changed', function (entry) {
        settings.set_int("refresh-interval", setting_input.get_value());
    });

    hbox.pack_start(setting_label, true, true, 0);
    hbox.add(setting_input, true, true, 1);
    frame.add(hbox)

    frame.show_all();
    return frame;
}

