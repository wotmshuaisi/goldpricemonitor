import Gio from "gi://Gio";
import Adw from "gi://Adw";

import Gtk from "gi://Gtk?version=4.0";

import { ExtensionPreferences, gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import * as Currencies from "./currencies.js";

export default class ExamplePreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    this._settings = this.getSettings();
    // Create a preferences page, with a single group
    const page = new Adw.PreferencesPage({
      title: _("Gold Price Monitor - Settings"),
      icon_name: "dialog-information-symbolic",
    });
    window.add(page);

    // Weight Unit
    page.add(this._create_weight_unit_options());

    // Currency
    page.add(this._create_currency_unit_options());

    // Refresh interval
    page.add(this._create_refresh_interval_options());

    // Hide unit
    page.add(this._create_hide_unit_options());

    // Panel position
    page.add(this._create_panel_position_options());
  }

  _create_weight_unit_options() {
    const weightGroup = new Adw.PreferencesGroup({ title: "Weight Unit" });

    const weightModel = new Gtk.StringList();
    ["Ounce(℥)", "Gram(g)", "Kilogram(kg)"].forEach((unit) => weightModel.append(unit));

    const weightRow = new Adw.ComboRow({
      title: "Select Weight Unit",
      subtitle: "Choose the unit for gold weight.",
      model: weightModel,
    });
    this._settings.bind("weight-unit", weightRow, "selected", Gio.SettingsBindFlags.NO_SENSETIVITY);

    weightGroup.add(weightRow);

    return weightGroup;
  }

  _create_currency_unit_options() {
    const currencyGroup = new Adw.PreferencesGroup({ title: "Currency" });

    const currencyModel = new Gtk.StringList();
    Currencies.list().forEach((item) => currencyModel.append(item.name));

    const currencyRow = new Adw.ComboRow({
      title: "Select Currency",
      subtitle: "Choose the display price currency.",
      model: currencyModel,
    });
    this._settings.bind("currency", currencyRow, "selected", Gio.SettingsBindFlags.NO_SENSETIVITY);

    currencyGroup.add(currencyRow);

    return currencyGroup;
  }

  _create_refresh_interval_options() {
    const refreshGroup = new Adw.PreferencesGroup({ title: "Refresh Interval" });

    const refreshRow = new Adw.SpinRow({
      title: "Refresh Interval (Minutes)",
      subtitle: "Set how often to refresh the gold price.",
      adjustment: new Gtk.Adjustment({
        lower: 1,
        upper: 120,
        step_increment: 1,
      }),
    });
    this._settings.bind("refresh-interval", refreshRow, "value", Gio.SettingsBindFlags.DEFAULT);

    refreshGroup.add(refreshRow);
    return refreshGroup;
  }

  _create_hide_unit_options() {
    const hideUnitGroup = new Adw.PreferencesGroup({ title: "Display Options" });

    const hideUnitRow = new Adw.SwitchRow({
      title: "Hide Unit",
      subtitle: "Toggle to hide or show the weight unit in the display.",
      active: this._settings.get_boolean("hide-unit"),
    });
    this._settings.bind("hide-unit", hideUnitRow, "active", Gio.SettingsBindFlags.DEFAULT);

    hideUnitGroup.add(hideUnitRow);
    return hideUnitGroup;
  }

  _create_panel_position_options() {
    const positionGroup = new Adw.PreferencesGroup({ title: "Panel Position" });

    const positionModel = new Gtk.StringList();
    ["Left", "Center", "Right"].forEach((pos) => positionModel.append(pos));

    const positionRow = new Adw.ComboRow({
      title: "Panel Position",
      subtitle: "Select the position of the indicator on the panel.",
      model: positionModel,
    });
    this._settings.bind("panel-position", positionRow, "selected", Gio.SettingsBindFlags.NO_SENSETIVITY);

    positionGroup.add(positionRow);
    return positionGroup;
  }
}
