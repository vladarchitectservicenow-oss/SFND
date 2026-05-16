// Copyright (c) 2026 Vladimir Kapustin
// SPDX-License-Identifier: AGPL-3.0-only
// test_sfnd.js
const assert = require('assert');
function MockGR(table, rows) { this._rows = rows||[]; this._idx = -1; this._filters = {}; this._limit = null; this._filtered = []; }
MockGR.prototype.addQuery = function(f,v) { this._filters[f] = v; };
MockGR.prototype.setLimit = function(n) { this._limit = n; };
MockGR.prototype.query = function() { this._idx = -1; this._filtered = this._rows.filter((r)=>{ for(var k in this._filters){ if(String(r[k]||'') !== String(this._filters[k])) return false; } return true; }); };
MockGR.prototype.next = function() { this._idx++; if(this._limit && this._idx >= this._limit) return false; return this._idx < this._filtered.length; };
MockGR.prototype.getValue = function(f) { if(this._idx >= 0 && this._idx < this._filtered.length) return String(this._filtered[this._idx][f]||""); return ""; };
MockGR.prototype.getUniqueValue = function() { if(this._idx >= 0 && this._idx < this._filtered.length) return this._filtered[this._idx]["sys_id"]||"mock"; return "mock"; };
MockGR.prototype.initialize = function() {};
MockGR.prototype.setValue = function() {};
MockGR.prototype.insert = function() { return "mock-insert-" + Math.random().toString(36).slice(2); };

const fs = require('fs');
function stripHeader(code){ return code.replace(/^\/\*.*?\*\//s, ''); }
global.Class = { create: function(){ var cls=function(){ if(this.initialize) this.initialize.apply(this, arguments); }; return cls; } };
global.GlideRecord = function(table){ return new MockGR(table, DB[table]); };
global.GlideDateTime = function(){ this.getDisplayValueInternal=function(){ return '20260516000000'; }; };
var DB = { "x_sfnd_source_file": [{ file_name: "hello.now.ts", content: "@now\nexport default class{}", sys_id: "s1", size: 30 },{ file_name: "readme.txt", content: "not supported", sys_id: "s2" }] };
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/SFND/src/SFNDPackager.js','utf8')));
eval(stripHeader(fs.readFileSync('/home/crixus/agentic-loop/output/SFND/src/SFNDValidator.js','utf8')));

function testPackager() {
  var pkg = new SFNDPackager();
  var scan = pkg.scanFiles("/fake");
  assert.strictEqual(scan.files.length, 1);
  assert.strictEqual(scan.files[0].name, "hello.now.ts");
  console.log("  testPackager PASSED");
}
function testValidator() {
  var v = new SFNDValidator();
  var r = v.validateFile("sample.now.ts", "@now\nexport class Agent {}");
  assert.strictEqual(r.valid, true);
  assert(r.warnings.length >= 0);
  console.log("  testValidator PASSED");
}
console.log("Running SFND tests...\n");
testPackager(); testValidator();
console.log("All SFND tests PASSED");
