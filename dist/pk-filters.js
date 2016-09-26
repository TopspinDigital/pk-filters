(function() {
  'use strict';

  // Create our module
  angular.module('pkFilters', []) 
    .service('PKCommonService', function () {

        return {

            // Get's the value of a nested property if it exists
            getPropertyValue: function (obj, notation) {

                // Get our properties
                var properties = notation.split('.');

                // Use reduce to get the value of the property
                return properties.reduce(function (a, b) {
                    return a[b];
                }, obj);
            },
            
            // Convert text to camel case
            convertToCamelCase: function (text) {

                // Get the text length
                var len = text.length;

                // Make our first character lowercase
                var result = text.substring(0, 1).toLowerCase() + text.substring(1, len);

                // Split by spaces
                var parts = result.split(' ');

                // If we have more than 1 part
                if (parts.length > 1) {

                    // Get our result using reduce
                    var result = parts.reduce(function (previousItem, currentItem, index) {

                        // Captilize the current item only if we are not the first item
                        var capitalize = index > 0 ? currentItem.substring(0, 1).toUpperCase() + currentItem.substring(1, len) : currentItem;

                        // Return the previousItem plus the new item
                        return previousItem + capitalize;
                    }, '');
                }

                // Return our result
                return result;
            },

            // Gets all the filters for an array of states
            flattenFilters: function (states) {

                // Create an array of filters
                var filters = [];

                // For each state
                states.forEach(function (state) {

                    // Merge our filters
                    filters = filters.concat(state.filters);
                });

                // Return our array
                return filters;
            },
                
            // Casts a value into it's true type
            castTrueType: function (value) {

                // Get our cast types
                var isNumeric = !isNaN(value);
                
                // If we are numeric
                if (isNumeric) {
                    
                    // Return our number
                    return parseFloat(value);
                }

                // Return our value
                return value;
            }
        };
    })
    .service('PKProductFilterService', ['PKCommonService', function (helper) {

        // Private function for filtering our products
        var _filter = function (products, filters, exclude) {

            // If we have no filters
            if (!filters || !filters.length) {
                
                // Return our products
                return exclude ? products : [];
            }

            // Create our array
            var filtered = [];

            // If we have any products
            if (products && products.length) {

                // For each product
                products.forEach(function (product) {

                    // Create a boolean which is updated when matched
                    var matched = _matchItem(product, filters);

                    // If we should exclude and we don't have a match
                    if (exclude && !matched || !exclude && matched) {

                        // Add to our array
                        filtered.push(product);
                    }
                });
            }

            // Return our array
            return filtered;
        };

        // Private function for matching a single product to a set of filters
        var _matchItem = function (product, filters) {

            // Boolean to hold our match
            var matched = false;

            // For each filter
            for (var i = 0; i < filters.length; i++) {

                // Get our filter
                var filter = filters[i];

                // If we have a filter
                if (filter.expression && filter.operator) {

                    // If we are to include all, then set our flag to true, otherwise perform a match on our fields
                    matched = filter.operator === '*' ? true : filter.operator === '!*' ? false : _matchFields(product, filter);

                    // If we are not matched, return false
                    if (!matched) {

                        // Return false
                        return false;
                    }
                }
            };

            // Return our matched value or not
            return matched;
        };

        // Private function for matching fields (OR)
        var _matchFields = function (product, filter) {

            // Get our fields
            var fields = filter.field.split(',');

            // Check to see if we are multiplying
            if (filter.operator === '*=' || filter.operator === '*>' || filter.operator === '*<') {
                
                // Get our value
                var fieldValue = _multiplyFields(product, fields),
                    operator = filter.operator.substring(1);

                // Return our match
                return _matchUsingOperator(operator, fieldValue, filter.expression);
            }

            // Loop through our fields
            for (var i = 0; i < fields.length; i++) {

                // Get our field
                var field = fields[i].trim(),
                    fieldValue = helper.getPropertyValue(product, field);

                // Do we match
                if (_matchField(fieldValue, filter)) {

                    // Return true
                    return true;
                }
            }

            // Fallback
            return false;
        };

        // Private function for matching properties (AND)
        var _matchField = function (fieldValue, filter) {

            // Our variables
            var values = filter.expression.split(',');

            // Loop through our values
            for (var i = 0; i < values.length; i++) {

                // Trim the value
                var value = values[i].trim();

                // If we have found a match, exit our loop
                if (_matchUsingOperator(filter.operator, fieldValue, value)) {

                    // Return a match if any are true
                    return true;
                }
            };

            // Fallback
            return false;
        };

        // Private function for matching using the operator
        var _matchUsingOperator = function (operator, fieldValue, expression) {

            // Do a switch using our operator
            switch (operator) {

                // Is equal
                case '=':
                    return _isEqual(fieldValue, expression);

                // Is NOT equal
                case '!=':
                    return !_isEqual(fieldValue, expression);

                // Is like
                case '%':
                    return _isLike(fieldValue, expression);

                // Is NOT like
                case '!%':
                    return !_isLike(fieldValue, expression);

                // Is greater than
                case '>':
                    return _isGreaterThan(fieldValue, expression);

                // Is less than
                case '<':
                    return _isLessThan(fieldValue, expression);

                // Is boolean equal to
                case '===':
                    return _isBoolean(fieldValue, expression);

                // If we are neither of the operators, return false
                default:
                    return false;
            }
        };

        // Private function for detecting likeness
        var _isLike = function (fieldValue, expression) {

            // If we have no fieldValue, return false
            if (!fieldValue && typeof fieldValue !== 'boolean')
                return false;             

            // Return true if the fieldValue contains our expression
            return (String(fieldValue).toLowerCase().indexOf(expression.toLowerCase()) > -1)
        };

        // Private function for working out if we have matching fieldValue
        var _isEqual = function (fieldValue, expression) {

            // If we have no fieldValue, return false
            if (!fieldValue)
                return false;

            // Return true if the fieldValue equals our expression
            return fieldValue === expression;
        };

        // Private function to work out if it matches our boolean 
        var _isBoolean = function (fieldValue, expression) {

            // If we don't have a field value
            if (!fieldValue) {

                // Set to false
                fieldValue = false;
            }

            // Check if we are boolean
            if (typeof fieldValue === 'boolean') {

                // Convert our expression to a boolean
                expression = expression === 'true';

                // Do a comparision
                return fieldValue === expression;
            }

            // Should never reach this
            return false;
        }

        // Private function for working out if our expression is greater than our fieldValue
        var _isGreaterThan = function (fieldValue, expression) {

            // Get our number
            var number = _extractNumber(fieldValue);

            // Return true if our number is greater
            return number > expression;
        };

        // Private function for working out if our expression is less than our fieldValue
        var _isLessThan = function (fieldValue, expression) {

            // Get our number
            var number = _extractNumber(fieldValue);

            // Return true if our number is less
            return number < expression;
        };

        // Private function to multiply field values together
        var _multiplyFields = function (product, fields) {

            // Calculate our total        
            var total = fields.reduce(function (total, field) {

                // Get our number from our field
                var fieldValue = helper.getPropertyValue(product, field.trim()),
                    number = _extractNumber(fieldValue);

                return total * number;
            }, 1);

            // Return our total
            return total;
        }

        // Extracts a number from our expression
        var _extractNumber = function (fieldValue) {

            // If we have some fieldValue
            if (fieldValue) {

                // If we are already a number
                if (!isNaN(fieldValue)) {

                    // Return our number
                    return fieldValue;
                }

                // Get our parts
                var parts = fieldValue.split(' ');

                // Loop through our parts
                for (var i = 0; i < parts.length; i++) {

                    // Get our part
                    var part = parts[i];

                    // If our part is a number
                    if (!isNaN(part)) {

                        // Return our part
                        return part;
                    }
                }
            }

            // Fallback
            return 0;
        };

        // Create our service
        var service = {

            // Calculates the percentage based on the products
            calculatePercentageMatch: function (products, filters) {

                // If we don't have any products, return 0
                if (!products.length)
                    return 0;

                // Get our includes
                var includes = _filter(products, filters);

                // Work out the percentage
                return includes.length / products.length;
            },

            // Includes products that match our filters
            include: function (products, filters) {
                            
                // Return our filtered products
                return _filter(products, filters);
            },

            // Excludes products that match our filters
            exclude: function (products, filters) {

                // Return our filtered products
                return _filter(products, filters, true);
            },

            // Matches a single product to a set of filters
            match: _matchItem
        };

        // Return our service
        return service;
    }])
    .service('PKMasterProductFilterService', ['PKProductFilterService', 'PKCommonService', 'ArrayService', function (productFilterService, helper, arrayService) {

        // The values should be an exact match
        var _exactMatchProduct = function (product, states, criteriaName) {
            
            // Get our fieldName
            var field = helper.convertToCamelCase(criteriaName);

            // For each state
            for (var i = 0; i < states.length; i++) {

                // Get our current state
                var state = states[i],
                    value = helper.castTrueType(state.name);
                
                // If our target is the master list AND we find a value OR we find in our master list
                if (product[field] === value) {
                    
                    // Return true
                    return true;
                }
            }

            // Fallback
            return false;
        };

        // Filter our products
        var _filterProducts = function (products, criteriaName, states, exclude) {
            
            // If we have no states
            if (!states || !states.length) {

                // Return our products
                return exclude ? products : [];
            }

            // Create an array
            var filtered = [];

            // For each product
            products.forEach(function (product) {

                // Get our match
                var matched = _exactMatchProduct(product, states, criteriaName);
                
                // If we should exclude or include
                if (exclude && !matched || !exclude && matched) {

                    // Add to our array
                    arrayService.insertIfNotExist(filtered, product);
                }
            });

            // Return our included products
            return filtered;
        }
    
        // Create our service
        var service = {

            // Use states to see which master products are included
            include: function (products, criteriaName, states) {
                
                // Return our filtered list
                return _filterProducts(products, criteriaName, states);
            },

            // Use states to see which master products are excluded
            exclude: function (products, criteriaName, states) {

                // Return our filtered list
                return _filterProducts(products, criteriaName, states, true);
            },

            // Exact match for a product
            exactMatch: _exactMatchProduct
        };

        // Return our service
        return service;
    }])
    .filter('include', ['PKProductFilterService', function (service) {
        return function (items, filters) {

            // Use our service to filter our items
            return service.include(items, filters);
        };
    }])
    .filter('exclude', ['PKProductFilterService', function (service) {
        return function (items, filters) {

            // Use our service to filter our items
            return service.exclude(items, filters);
        };
    }])
    .filter('statesInclude', ['$filter', 'PKCommonService', function ($filter, helper) {
        return function (items, states) {

            // Get our filters
            var filters = helper.flattenFilters(states);

            // Return our filtered items
            return $filter('include')(items, filters);
        };
    }])
    .filter('statesExclude', ['$filter', 'PKCommonService', function ($filter, helper) {
        return function (items, states) {

            // Get our filters
            var filters = helper.flattenFilters(states);

            // Return our filtered items
            return $filter('exclude')(items, filters);
        };
    }])
    .filter('masterInclude', ['PKMasterProductFilterService', function (service) {
        return function (items, criteriaName, states) {

            // Return our filtered items
            return service.include(items, criteriaName, states);
        };
    }])
    .filter('masterExclude', ['PKMasterProductFilterService', function (service) {
        return function (items, criteriaName, states) {

            // Return our filtered items
            return service.exclude(items, criteriaName, states);
        };
    }]);
}());

(function() {
  'use strict';

  angular.module('pkFilters');
}());