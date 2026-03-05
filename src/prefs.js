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

    // API Provider
    page.add(this._create_api_provider_options());

    // API Key
    page.add(this._create_api_key_options());

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

    window.connect("close-request", () => {
      this._settings = null;
    });
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
      title: "Refresh Interval (hours)",
      subtitle: "Set to 0 for manual refresh.",
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 24,
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

  _create_api_provider_options() {
    const apiproviderGroup = new Adw.PreferencesGroup({ title: "API Provider" });

    const apiproviderModel = new Gtk.StringList();
    ["goldprice.org", "goldapi.io(APIKey required)"].forEach((pos) => apiproviderModel.append(pos));

    const apiproviderRow = new Adw.ComboRow({
      title: "API Provider",
      subtitle: "Select API provider.",
      model: apiproviderModel,
    });
    this._settings.bind("api-provider", apiproviderRow, "selected", Gio.SettingsBindFlags.NO_SENSETIVITY);

    apiproviderGroup.add(apiproviderRow);
    return apiproviderGroup;
  }

  _create_api_key_options() {
    const apikeyGroup = new Adw.PreferencesGroup({ title: "API Key" });

    const apikeyRow = new Adw.EntryRow({
      title: "API Key",
      show_apply_button: true,
    });

    this._settings.bind("api-key", apikeyRow, "text", Gio.SettingsBindFlags.DEFAULT);

    apikeyGroup.add(apikeyRow);
    return apikeyGroup;
  }

}
