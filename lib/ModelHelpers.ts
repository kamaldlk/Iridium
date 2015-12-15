﻿import MongoDB = require('mongodb');
import {Model} from './Model';
import Skmatc = require('skmatc');
import {Omnom} from './utils/Omnom';
import _ = require('lodash');
import Bluebird = require('bluebird');

/**
 * A number of helper methods used commonly within Iridium, they provide a means to transform,
 * validate, wrap and diff instances and documents. By keeping these methods in one place we
 * help to improve testability and reduce code duplication (mouse abuse) throughout the codebase.
 * @internal
 */
export class ModelHelpers<TDocument extends { _id?: any }, TInstance> {
    constructor(public model: Model<TDocument, TInstance>) {
        this._validator = Skmatc.scope(model.schema);
        model.validators.forEach(validator => this._validator.register(validator));
    }

    private _validator: Skmatc.Skmatc;

    /**
     * Validates a document to ensure that it matches the model's ISchema requirements
     * @param {any} document The document to validate against the ISchema
     * @returns {SkmatcCore.IResult} The result of the validation
     */
    validate(document: TDocument): Skmatc.Result {
        return this._validator.validate(document);
    }

    /**
     * Wraps the given document in an instance wrapper for use throughout the application
     * @param {any} document The document to be wrapped as an instance
     * @param {Boolean} isNew Whether the instance originated from the database or was created by the application
     * @param {Boolean} isPartial Whether the document supplied contains all information present in the database
     * @returns {any} An instance which wraps this document
     */
    wrapDocument(document: TDocument, isNew?: boolean, isPartial?: boolean): TInstance {
        return new this.model.Instance(document, isNew, isPartial);
    }

    /**
     * Converts the given document to its database form into a form
     * using the transforms defined on the model.
     * @param {any} document The document to be converted
     * @returns {any} A new document cloned from the original and transformed
     */
    transformToDB<T>(document: T): T {
        for (var property in this.model.transforms)
            if(document.hasOwnProperty(property)) {
                document[property] = this.model.transforms[property].toDB(document[property], property, this.model);
            }
        return document;
    }

    /**
     * Converts the given document to its database form into a form
     * using the transforms defined on the model.
     * @param {any} document The document to be converted
     * @returns {any} A new document cloned from the original and transformed
     */
    convertToDB<T>(document: T): T {
        var doc: T = this.cloneDocument(document);
        return this.transformToDB(doc);
    }

    /**
     * Performs a diff operation between two documents and creates a MongoDB changes object to represent the differences
     * @param {any} original The original document prior to changes being made
     * @param {any} modified The document after changes were made
     */
    diff(original: TDocument, modified: TDocument): any {
        var omnom = new Omnom();
        omnom.diff(original, modified);
        return omnom.changes;
    }
    
    /**
     * Clones the given document recursively, taking into account complex types like
     * Buffers correctly.
     * 
     * @param {any} The document you wish to clone deeply.
     */
    cloneDocument<T>(original: T): T {
        return _.cloneDeep(original, (value) => {
           if(Buffer.isBuffer(value)) {
               return (<Buffer>value).slice();
           }
        });
    }
    
    /**
     * Clones the given document recursively, taking into account complex types like
     * Buffers correctly. Optimized for working with query documents instead of true
     * documents.
     * 
     * @param {any} The document you wish to clone deeply.
     */
    cloneConditions<T>(original: T): T {
        return this.cloneDocument(original);
    }
}
