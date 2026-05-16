/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * SFND — ServiceNow Fluent Now (.now.ts) Deployment Toolkit
 * Scope: x_sfnd
 * Problem: No CI/CD tooling exists for ServiceNow Fluent DSL outside platform.
 */

var SFNDPackager = Class.create();
SFNDPackager.prototype = {
    initialize: function() {
        this.version = "1.0.0";
        this.SUPPORTED_EXTENSIONS = [".now.ts", ".now.js", ".fluent"];
    },

    /**
     * Scan a source directory for .now.ts files and package into an update set format.
     * @param {String} sourcePath — local filesystem path or repo root
     * @return {Object} { files: [], totalSize: 0, manifest: {} }
     */
    scanFiles: function(sourcePath) {
        var out = { files: [], totalSize: 0, manifest: { version: "1.0.0", created: new GlideDateTime().getDisplayValueInternal() } };
        // In ServiceNow context we simulate scanning from a sys_attachment or sys_repo table
        // For the scoped app, this reads from a custom table x_sfnd_source_file
        try {
            var gr = new GlideRecord("x_sfnd_source_file");
            gr.query();
            while (gr.next()) {
                var ext = (gr.getValue("file_name") || "").toLowerCase();
                var isSupported = false;
                for (var i = 0; i < this.SUPPORTED_EXTENSIONS.length; i++) {
                    if (ext.indexOf(this.SUPPORTED_EXTENSIONS[i]) >= 0) { isSupported = true; break; }
                }
                if (isSupported) {
                    out.files.push({
                        name: gr.getValue("file_name"),
                        content: gr.getValue("content") || "",
                        sys_id: gr.getUniqueValue(),
                        size: (gr.getValue("content") || "").length
                    });
                    out.totalSize += (gr.getValue("content") || "").length;
                }
            }
        } catch (e) {}
        return out;
    },

    /**
     * Generate an update set XML snippet for packaged files.
     */
    generateUpdateSetXML: function(packageData) {
        var lines = [];
        lines.push('    \u003c!-- SFND generated update set --\u003e');
        lines.push('    \u003csys_update_set action="INSERT_OR_UPDATE"\u003e');
        lines.push('      \u003cname\u003eSFND Fluent Deploy ' + packageData.manifest.created + '\u003c/name\u003e');
        lines.push('      \u003cstate\u003epreviewed\u003c/state\u003e');
        lines.push('    \u003c/sys_update_set\u003e');
        for (var i = 0; i < packageData.files.length; i++) {
            var f = packageData.files[i];
            lines.push('    \u003cx_sfnd_source_file action="INSERT_OR_UPDATE"\u003e');
            lines.push('      \u003cfile_name\u003e' + this._escapeXml(f.name) + '\u003c/file_name\u003e');
            lines.push('      \u003ccontent\u003e\u003c![CDATA[' + f.content + ']]\u003e\u003c/content\u003e');
            lines.push('    \u003c/x_sfnd_source_file\u003e');
        }
        return lines.join("\n");
    },

    _escapeXml: function(text) {
        return (text || "").replace(/[<>&]/g, function(c){ return { "<":"&lt;", ">":"&gt;", "&":"&amp;" }[c]; });
    },

    type: "SFNDPackager"
};
