/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * SFNDValidator — Validates .now.ts files for syntax and platform compatibility.
 * Scope: x_sfnd
 */
var SFNDValidator = Class.create();
SFNDValidator.prototype = {
    initialize: function() {
        this.version = "1.0.0";
        this.KEYWORDS = ["now.ts", "@now", "dsl", "fluent", "serviceNow"];
        this.DEPRECATED_PATTERNS = ["eventQueue", "GlideElementDynamicAttribute", "gs.print", "gs.getReference"];
    },

    validateFile: function(fileName, content) {
        var errors = [];
        var warnings = [];
        var lines = (content || "").split("\n");

        if (fileName.indexOf(".now.ts") < 0 && fileName.indexOf(".now.js") < 0) {
            errors.push({ line: 0, msg: "File extension not .now.ts or .now.js" });
        }
        if (lines.length < 2) {
            warnings.push({ line: 0, msg: "File appears empty or single-line" });
        }

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            for (var j = 0; j < this.DEPRECATED_PATTERNS.length; j++) {
                if (line.indexOf(this.DEPRECATED_PATTERNS[j]) >= 0) {
                    errors.push({ line: i+1, msg: "Deprecated API: " + this.DEPRECATED_PATTERNS[j] });
                }
            }
        }

        var hasKeyword = false;
        for (var k = 0; k < this.KEYWORDS.length; k++) {
            if (content.indexOf(this.KEYWORDS[k]) >= 0) { hasKeyword = true; break; }
        }
        if (!hasKeyword) {
            warnings.push({ line: 0, msg: "No Fluent keywords found — verify this is a .now.ts file" });
        }

        return {
            file: fileName,
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            lineCount: lines.length
        };
    },

    type: "SFNDValidator"
};
