"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertRejection = exports.assertSchemas = exports.assertSchema = void 0;
var ajv_1 = require("ajv");
var ajv_formats_1 = require("ajv-formats");
var chai_1 = require("chai");
var fs_1 = require("fs");
var path_1 = require("path");
var typescript_1 = require("typescript");
var TJS = require("../typescript-json-schema");
var ajvWarnings = [];
var ajv = new ajv_1.default({
    logger: {
        log: console.log,
        warn: function (message) {
            ajvWarnings.push(message);
        },
        error: function (message) {
            throw new Error("AJV error: " + message);
        },
    },
    strict: false,
});
ajv_formats_1.default(ajv);
var BASE = "test/programs/";
function assertSchema(group, type, settings, compilerOptions, only, ajvOptions) {
    if (settings === void 0) { settings = {}; }
    if (ajvOptions === void 0) { ajvOptions = {}; }
    var run = only ? it.only : it;
    run(group + " should create correct schema", function () {
        if (!("required" in settings)) {
            settings.required = true;
        }
        var files = [path_1.resolve(BASE + group + "/main.ts")];
        var actual = TJS.generateSchema(TJS.getProgramFromFiles(files, compilerOptions), type, settings, files);
        var file = fs_1.readFileSync(BASE + group + "/schema.json", "utf8");
        var expected = JSON.parse(file);
        chai_1.assert.isObject(actual);
        chai_1.assert.deepEqual(actual, expected, "The schema is not as expected");
        if (actual !== null) {
            ajv.validateSchema(actual);
            chai_1.assert.equal(ajv.errors, null, "The schema is not valid");
            if (!ajvOptions.skipCompile) {
                ajvWarnings = [];
                ajv.compile(actual);
                chai_1.assert.deepEqual(ajvWarnings, ajvOptions.expectedWarnings || [], "Got unexpected AJV warnings");
            }
        }
    });
}
exports.assertSchema = assertSchema;
function assertSchemas(group, type, settings, compilerOptions) {
    if (settings === void 0) { settings = {}; }
    it(group + " should create correct schema", function () {
        if (!("required" in settings)) {
            settings.required = true;
        }
        var generator = TJS.buildGenerator(TJS.getProgramFromFiles([path_1.resolve(BASE + group + "/main.ts")], compilerOptions), settings);
        var symbols = generator.getSymbols(type);
        for (var _i = 0, symbols_1 = symbols; _i < symbols_1.length; _i++) {
            var symbol = symbols_1[_i];
            var actual = generator.getSchemaForSymbol(symbol.name);
            var file = fs_1.readFileSync(BASE + group + ("/schema." + symbol.name + ".json"), "utf8");
            var expected = JSON.parse(file);
            chai_1.assert.isObject(actual);
            chai_1.assert.deepEqual(actual, expected, "The schema is not as expected");
            if (actual !== null) {
                ajv.validateSchema(actual);
                chai_1.assert.equal(ajv.errors, null, "The schema is not valid");
            }
        }
    });
}
exports.assertSchemas = assertSchemas;
function assertRejection(group, type, settings, compilerOptions) {
    if (settings === void 0) { settings = {}; }
    it(group + " should reject input", function () {
        var schema = null;
        chai_1.assert.throws(function () {
            if (!("required" in settings)) {
                settings.required = true;
            }
            var files = [path_1.resolve(BASE + group + "/main.ts")];
            schema = TJS.generateSchema(TJS.getProgramFromFiles(files, compilerOptions), type, settings, files);
        });
        chai_1.assert.equal(schema, null, "Expected no schema to be generated");
    });
}
exports.assertRejection = assertRejection;
describe("interfaces", function () {
    it("should return an instance of JsonSchemaGenerator", function () {
        var program = TJS.getProgramFromFiles([path_1.resolve(BASE + "comments/main.ts")]);
        var generator = TJS.buildGenerator(program);
        chai_1.assert.instanceOf(generator, TJS.JsonSchemaGenerator);
        if (generator !== null) {
            chai_1.assert.doesNotThrow(function () { return generator.getSchemaForSymbol("MyObject"); });
            chai_1.assert.doesNotThrow(function () { return generator.getSchemaForSymbol("Vector3D"); });
            var symbols = generator.getUserSymbols();
            chai_1.assert(symbols.indexOf("MyObject") > -1);
            chai_1.assert(symbols.indexOf("Vector3D") > -1);
        }
    });
    it("should output the schemas set by setSchemaOverride", function () {
        var program = TJS.getProgramFromFiles([path_1.resolve(BASE + "interface-multi/main.ts")]);
        var generator = TJS.buildGenerator(program);
        chai_1.assert(generator !== null);
        if (generator !== null) {
            var schemaOverride = { type: "string" };
            generator.setSchemaOverride("MySubObject", schemaOverride);
            var schema = generator.getSchemaForSymbol("MyObject");
            chai_1.assert.deepEqual(schema.definitions["MySubObject"], schemaOverride);
        }
    });
    it("should ignore type aliases that have schema overrides", function () {
        var program = TJS.getProgramFromFiles([path_1.resolve(BASE + "type-alias-schema-override/main.ts")]);
        var generator = TJS.buildGenerator(program);
        chai_1.assert(generator !== null);
        if (generator !== null) {
            var schemaOverride = { type: "string" };
            generator.setSchemaOverride("Some", schemaOverride);
            var schema = generator.getSchemaForSymbol("MyObject");
            chai_1.assert.deepEqual(schema, {
                $schema: "http://json-schema.org/draft-07/schema#",
                definitions: {
                    Some: {
                        type: "string",
                    },
                },
                properties: {
                    some: {
                        $ref: "#/definitions/Some",
                    },
                },
                type: "object",
            });
        }
    });
});
describe("schema", function () {
    describe("type aliases", function () {
        assertSchema("type-alias-single", "MyString");
        assertSchema("type-alias-single-annotated", "MyString");
        assertSchema("type-aliases", "MyObject", {
            aliasRef: true,
        });
        assertSchema("type-aliases-fixed-size-array", "MyFixedSizeArray");
        assertSchema("type-aliases-multitype-array", "MyArray");
        assertSchema("type-aliases-local-namsepace", "MyObject", {
            aliasRef: true,
            strictNullChecks: true,
        });
        assertSchema("type-aliases-partial", "MyObject", {
            aliasRef: true,
        });
        assertSchema("type-aliases-alias-ref", "MyAlias", {
            aliasRef: true,
            topRef: false,
        });
        assertSchema("type-aliases-recursive-object-topref", "MyObject", {
            aliasRef: true,
            topRef: true,
        });
        assertSchema("type-no-aliases-recursive-topref", "MyAlias", {
            aliasRef: false,
            topRef: true,
        });
        assertSchema("type-mapped-types", "MyMappedType");
        assertSchema("type-aliases-tuple-of-variable-length", "MyTuple");
        assertSchema("type-aliases-tuple-with-rest-element", "MyTuple");
    });
    describe("enums", function () {
        assertSchema("enums-string", "MyObject");
        assertSchema("enums-number", "MyObject");
        assertSchema("enums-number-initialized", "Enum");
        assertSchema("enums-compiled-compute", "Enum");
        assertSchema("enums-mixed", "MyObject");
        assertSchema("enums-value-in-interface", "MyObject");
    });
    describe("unions and intersections", function () {
        assertSchema("type-union", "MyObject");
        assertSchema("type-intersection", "MyObject", {
            noExtraProps: true,
        });
        assertSchema("type-union-tagged", "Shape");
        assertSchema("type-aliases-union-namespace", "MyModel");
        assertSchema("type-intersection-recursive", "*");
    });
    describe("annotations", function () {
        assertSchema("annotation-default", "MyObject");
        assertSchema("annotation-ref", "MyObject", {}, undefined, undefined, {
            skipCompile: true,
        });
        assertSchema("annotation-tjs", "MyObject", {
            validationKeywords: ["hide"],
        });
        assertSchema("annotation-id", "MyObject", {}, undefined, undefined);
        assertSchema("annotation-title", "MyObject");
        assertSchema("annotation-items", "MyObject");
        assertSchema("typeof-keyword", "MyObject", { typeOfKeyword: true });
        assertSchema("user-validation-keywords", "MyObject", {
            validationKeywords: ["chance", "important"],
        });
    });
    describe("generics", function () {
        assertSchema("generic-simple", "MyObject");
        assertSchema("generic-arrays", "MyObject");
        assertSchema("generic-multiple", "MyObject");
        assertSchema("generic-multiargs", "MyObject");
        assertSchema("generic-anonymous", "MyObject");
        assertSchema("generic-recursive", "MyObject", {
            topRef: true,
        });
        if (+typescript_1.versionMajorMinor < 3.7) {
            assertSchema("generic-hell", "MyObject");
        }
    });
    describe("comments", function () {
        assertSchema("comments", "MyObject");
        assertSchema("comments-override", "MyObject");
        assertSchema("comments-imports", "MyObject", {
            aliasRef: true,
        });
        assertSchema("comments-from-lib", "MyObject");
    });
    describe("types", function () {
        assertSchema("force-type", "MyObject");
        assertSchema("force-type-imported", "MyObject");
        assertSchema("type-anonymous", "MyObject");
        assertSchema("type-primitives", "MyObject");
        assertSchema("type-nullable", "MyObject");
        assertSchema("any-unknown", "MyObject");
        assertSchema("never", "Never");
    });
    describe("class and interface", function () {
        assertSchema("class-single", "MyObject");
        assertSchema("class-extends", "MyObject");
        assertSchema("abstract-class", "AbstractBase");
        assertSchema("abstract-extends", "MyObjectFromAbstract");
        assertSchema("interface-single", "MyObject");
        assertSchema("interface-multi", "MyObject");
        assertSchema("interface-extends", "MyObject");
        assertSchema("interface-recursion", "MyObject", {
            topRef: true,
        });
        assertSchema("module-interface-single", "MyObject");
        assertSchema("ignored-required", "MyObject");
        assertSchema("default-properties", "MyObject");
    });
    describe("maps and arrays", function () {
        assertSchema("array-readonly", "MyReadOnlyArray");
        assertSchema("array-types", "MyArray");
        assertSchema("map-types", "MyObject");
        assertSchema("extra-properties", "MyObject");
    });
    describe("string literals", function () {
        assertSchema("string-literals", "MyObject");
        assertSchema("string-literals-inline", "MyObject");
    });
    describe("custom dates", function () {
        assertSchema("custom-dates", "foo.Bar");
    });
    describe("dates", function () {
        assertSchema("dates", "MyObject");
        assertRejection("dates", "MyObject", {
            rejectDateType: true,
        });
    });
    describe("namespaces", function () {
        assertSchema("namespace", "Type");
        assertSchema("namespace-deep-1", "RootNamespace.Def");
        assertSchema("namespace-deep-2", "RootNamespace.SubNamespace.HelperA");
    });
    describe("uniqueNames", function () {
        assertSchemas("unique-names", "MyObject", {
            uniqueNames: true,
        });
        assertRejection("unique-names", "MyObject", {
            uniqueNames: true,
        });
        assertSchema("unique-names-multiple-subdefinitions", "MyObject", {
            uniqueNames: true,
        });
    });
    describe("other", function () {
        assertSchema("array-and-description", "MyObject");
        assertSchema("optionals", "MyObject");
        assertSchema("optionals-derived", "MyDerived");
        assertSchema("strict-null-checks", "MyObject", undefined, {
            strictNullChecks: true,
        });
        assertSchema("imports", "MyObject");
        assertSchema("generate-all-types", "*");
        assertSchema("private-members", "MyObject", {
            excludePrivate: true,
        });
        assertSchema("builtin-names", "Ext.Foo");
        assertSchema("user-symbols", "*");
        assertSchemas("argument-id", "MyObject", {
            id: "someSchemaId",
        });
        assertSchemas("type-default-number-as-integer", "*", {
            defaultNumberType: "integer",
        });
    });
    describe("object index", function () {
        assertSchema("object-numeric-index", "IndexInterface");
        assertSchema("object-numeric-index-as-property", "Target", { required: false });
    });
    describe("recursive type", function () {
        assertSchema("type-recursive", "TestChildren");
    });
    describe("typeof globalThis", function () {
        assertSchema("type-globalThis", "Test");
    });
});
describe("tsconfig.json", function () {
    it("should read files from tsconfig.json", function () {
        var program = TJS.programFromConfig(path_1.resolve(BASE + "tsconfig/tsconfig.json"));
        var generator = TJS.buildGenerator(program);
        chai_1.assert(generator !== null);
        chai_1.assert.instanceOf(generator, TJS.JsonSchemaGenerator);
        if (generator !== null) {
            chai_1.assert.doesNotThrow(function () { return generator.getSchemaForSymbol("IncludedAlways"); });
            chai_1.assert.doesNotThrow(function () { return generator.getSchemaForSymbol("IncludedOnlyByTsConfig"); });
            chai_1.assert.throws(function () { return generator.getSchemaForSymbol("Excluded"); });
        }
    });
    it("should support includeOnlyFiles with tsconfig.json", function () {
        var program = TJS.programFromConfig(path_1.resolve(BASE + "tsconfig/tsconfig.json"), [
            path_1.resolve(BASE + "tsconfig/includedAlways.ts"),
        ]);
        var generator = TJS.buildGenerator(program);
        chai_1.assert(generator !== null);
        chai_1.assert.instanceOf(generator, TJS.JsonSchemaGenerator);
        if (generator !== null) {
            chai_1.assert.doesNotThrow(function () { return generator.getSchemaForSymbol("IncludedAlways"); });
            chai_1.assert.throws(function () { return generator.getSchemaForSymbol("Excluded"); });
            chai_1.assert.throws(function () { return generator.getSchemaForSymbol("IncludedOnlyByTsConfig"); });
        }
    });
});
describe("Functionality 'required' in annotation", function () {
    assertSchema("annotation-required", "MyObject", {
        tsNodeRegister: true,
    });
});
//# sourceMappingURL=schema.test.js.map