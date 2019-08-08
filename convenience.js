const ByteArray = imports.byteArray;
const Gio = imports.gi.Gio;
const ExtensionUtils = imports.misc.extensionUtils;

function byteArrayToString(array) {
    return array instanceof Uint8Array ? ByteArray.toString(array) : array;
}

function getSettings(schema) {
    let extension = ExtensionUtils.getCurrentExtension();

    schema = schema || extension.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    let schemaDir = extension.dir.get_child('schemas');
    let schemaSource;

    if (schemaDir.query_exists(null)) {
        schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
            GioSSS.get_default(),
            false);
    } else {
        schemaSource = GioSSS.get_default();
    }

    let schemaObj = schemaSource.lookup(schema, true);

    if (!schemaObj)
        throw new Error('Schema ' + schema + ' could not be found for extension ' +
            extension.metadata.uuid + '. Please check your installation.');

    return new Gio.Settings({
        settings_schema: schemaObj
    });
}