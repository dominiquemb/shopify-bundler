        var Bundler = {
            addonsList: [],
            alreadyAdded: [],

            // data: ajax response containing status
            // id: the ID of the current item being processed
            // addonsOnly: used in the case when only add-ons are being added/removed, without changing the parent variant
            // parentVariantId: the ID of the variant which the bundle is tied to
            // For example, if you choose to buy a Keysmart with a USB add-on,
            // then the parent variant ID is the Keysmart variant. The USB is
            // just part of the bundle. 
            // bundleId: a unique ID given to a bundle (meaning a group of items having a parent/master item and add-ons)
            handleAddToCart: function(data, id, addonsOnly, parentVariantId, bundleId) {
                var that = this;
                if (data.status == 200 || addonsOnly) {
                    // do not re-add items that are already added
                    this.alreadyAdded.push(id);
                    $.each(that.alreadyAdded, function(i, val) {
                        var indexToRemove = that.addonsList.indexOf(val);
                        if (indexToRemove > -1) {
                            that.addonsList.splice(indexToRemove, 1);
                        }
                    });
                    $(".cart-error").css("display", "none");
                    if (this.addonsList.length > 0) {
                        var nextVariant = this.addonsList[this.addonsList.length - 1];
                        this.addonsList.pop();
                        $.ajax({
                            type: "POST",
                            url: "/cart/add.js",
                            data: {
                                quantity: 1,
                                id: nextVariant,
                                properties: {
                                    parentVariantId: parentVariantId,
                                    bundleId: bundleId
                                }
                            },
                            success: function(data) {
                                that.handleAddToCart(data, nextVariant, false, parentVariantId, bundleId);
                            },
                            error: function(data) {
                                that.handleAddToCart(data, nextVariant, false, parentVariantId, bundleId);
                            }
                        });
                    } else if (this.addonsList.length == 0) {
                        // TODO - put this in the submit click handler
                        $(".trigger-cart").removeAttr("disabled");
                        window.location.href = "/cart/";
                    }
                } else if (data.status == 422) {
                    $(".cart-error").css("display", "block");
                    $(".cart-error").html(JSON.parse(data.responseText).description);
                    $(".trigger-cart").removeAttr("disabled");
                }
            },

            init: function() {
                var that = this;
                // bundleId is a unique identifier used to link items that are part of a bundle (such as add-ons)
                var bundleId = Math.floor(Math.random() * 1e5);
                $("select.add-on").select2();
                $(".single .select2-search, .select2-focusser").remove();

                $("input.update.btn").click(function(evt) {
                    // very very silly, we are updating quantities via AJAX but not the subtotal,
                    // so literally just reload the cart page if they click 'UPDATE CART'
                    window.location.href = '/cart/';

                    evt.preventDefault();
                    evt.stopPropagation();
                    return false

                })


                // product page, add to cart
                $(".trigger-cart").click(function(evt) {
                    evt.preventDefault();
                    $(".trigger-cart").attr("disabled", "disabled");
                    var properties = {};

		    // TODO: Re-write this whole thing
		    $('input.add-on:checked').each(function() {
			var prop_type = $(this).attr('data-property-type');
			that.addonsList.push($(this).val());
			properties["bundleId"] = bundleId;

                        // this breaks if we put anything (like html) in the label
			properties[prop_type] = $(this).parent().find('label').html();
		    });
                    // Loop through each add-on dropdown (USB, key quantity, and other add-ons)
                    // It's very important to use the selector ".add-on.select2-container" and NOT just ".add-on" 
                    // Appending ".select2-container" specifies that we want the select2 dropdown, which provides us with an easy-to-use 'data' object 
                    $(".add-on.select2-container").each(function() {
                        // Check to see if we're dealing with a multiple-option selector or a single-option selector. If it's a multi-option selector, $(this).select2('data') will give us an array of options and their IDs and text values.
                        if ($.isArray($(this).select2("data"))) {
                            $.each($(this).select2("data"), function(i, elem) {
                                if (elem.id.length > 0) {
                                    var prop_type = $(elem.element[0]).parent().attr("data-property-type");
                                    that.addonsList.push(elem.id);
                                    properties["bundleId"] = bundleId;
                                    // Check to see if we've already got an add-on
                                    if (properties[prop_type]) {
                                        properties[prop_type] += ", " + elem.text;
                                    } else {
                                        properties[prop_type] = elem.text;
                                    }
                                }
                            });
                        } else {
                            // Else, this is a single-option selector
                            if ($(this).select2("data").id.length > 0) {
                                var prop_type = $($(this).select2("data").element[0]).parent().attr("data-property-type");
                                that.addonsList.push($(this).select2("data").id);
                                properties[prop_type] = $(this).select2("data").text;
                                properties["bundleId"] = bundleId;
                            }
                        }
                    });
                    // item ID is the variant ID of the main product (not the add-ons)
                    var item_id = $(".color-option.is-active").attr("data-value");
                    var item_name = $(".color-option.is-active").attr("data-name");
                    // When the user clicks 'Buy Now', first add the main variant ID before handling add-ons. 
                    // The add-ons are handled in the handleAddToCart method (called below).
                    if (that.alreadyAdded.indexOf(item_id) == -1) {
                        $.ajax({
                            type: "POST",
                            url: "/cart/add.js",
                            data: {
                                quantity: 1,
                                id: item_id,
                                properties: properties
                            },
                            success: function(data) {
                                that.handleAddToCart(data, item_id, false, item_id, bundleId);
                            },
                            error: function(data) {
                                that.handleAddToCart(data, item_id, false, item_id, bundleId);
                            }
                        });
                    } else {
                        // item ID is the variant ID of the main product (not the add-ons)
                        var item_id = $(".color-option.is-active").attr("data-value");
                        that.handleAddToCart(false, false, true, item_id, bundleId);
                    }
                });
                // end buy now handler

            }
        };
        Bundler.init();
