
;( function( $ ) {

	var PB_Integration = function( bundle ) {

		/**
		 * 'bundle_subtotals_data' filter callback.
		 */
		this.filter_bundle_subtotals_data = function( bundle_price_data, bundle, qty ) {

			if ( bundle_price_data.applied_discount ) {
				return bundle_price_data;
			}

			if ( typeof bundle_price_data.bulk_discount_data === 'undefined' ) {
				return bundle_price_data;
			}

			var quantities     = bundle_price_data.quantities,
				discount_data  = bundle_price_data.bulk_discount_data.discount_array,
				discount       = 0,
				total_quantity = 0;

			if ( discount_data.length > 0 ) {

				// Sum quantities.
				for ( var bundled_item_id in quantities ) {
					total_quantity += quantities[ bundled_item_id ];
				}

				// Check if there's a discount for that quantity.
				for ( var i = 0; i < discount_data.length; i++ ) {
					if ( typeof( discount_data[ i ].quantity_min ) !== 'undefined' && typeof( discount_data[ i ].quantity_max ) !== 'undefined' &&  typeof( discount_data[ i ].discount ) !== 'undefined' ) {
						if ( total_quantity >= discount_data[ i ].quantity_min && ( total_quantity <= discount_data[ i ].quantity_max || '' === discount_data[ i ].quantity_max ) ) {
							discount = discount_data[ i ].discount;
						}
					}
				}

				bundle_price_data.bulk_discount_data.discount = discount;

				if ( discount > 0 ) {

					var price_data = $.extend( true, {}, bundle_price_data );

					$.each( bundle.bundled_items, function( index, bundled_item ) {
						price_data.prices[ bundled_item.bundled_item_id ] = price_data.prices[ bundled_item.bundled_item_id ] * ( 1 - discount / 100 );
					} );

					// Determine if discount should be applied to the base price.
					if ( 'yes' === bundle.price_data.bulk_discount_data.discount_base && price_data.base_price ) {
						price_data.base_price = Number( price_data.base_price ) * ( 1 - discount / 100 );
					}

					price_data.applied_discount = true;

					price_data = bundle.calculate_subtotals( false, price_data, qty );
					price_data = bundle.calculate_totals( price_data );

					price_data.applied_discount = false;

					/*
					 * Modify the totals.
					 */

					bundle_price_data.base_price_totals = price_data.base_price_totals;

					$.each( bundle.bundled_items, function( index, bundled_item ) {

						var bundled_item_totals = price_data[ 'bundled_item_' + bundled_item.bundled_item_id + '_totals' ];

						if ( typeof bundled_item_totals !== 'undefined' ) {
							bundle_price_data[ 'bundled_item_' + bundled_item.bundled_item_id + '_totals' ] = bundled_item_totals;
						}

					} );

				} else {

					bundle_price_data.base_price_totals = bundle_price_data.base_price_subtotals;

					$.each( bundle.bundled_items, function( index, bundled_item ) {
						bundle_price_data[ 'bundled_item_' + bundled_item.bundled_item_id + '_totals' ] = bundle_price_data[ 'bundled_item_' + bundled_item.bundled_item_id + '_subtotals' ];
					} );
				}
			}

			return bundle_price_data;
		};

		/**
		 * 'bundle_total_price_html' filter callback.
		 */
		this.filter_bundle_total_price_html = function( price_html, bundle ) {

			if ( typeof bundle.price_data.bulk_discount_data === 'undefined' ) {
				return price_html;
			}

			if ( bundle.price_data.bulk_discount_data.discount && bundle.price_data.subtotals.price !== bundle.price_data.totals.price ) {

				var price_html_subtotals = '',
					price_data_subtotals = $.extend( true, {}, bundle.price_data );

				price_data_subtotals.totals = price_data_subtotals.subtotals;
				price_html_subtotals        = bundle.get_price_html( price_data_subtotals );

				var discount_string        = '<span class="discount">' + wc_bundle_params.i18n_bulk_discount + '</span>',
					discount_value         = '<span class="discount-amount">' + wc_bundle_params.i18n_bulk_discount_value.replace( '%v', wc_pb_number_round( bundle.price_data.bulk_discount_data.discount, 2 ) ) + '</span>',
					discount_html_inner    = wc_bundle_params.i18n_bulk_discount_format.replace( '%s', discount_string ).replace( '%v' , discount_value ),
					discount_html          = '<span class="price-discount">' + discount_html_inner + '</span>',
					$discounted_price_html = $( price_html ).wrapInner( '<span class="price-total"></span>' ),
					$price_html            = $( price_html_subtotals ).wrapInner( '<span class="price-subtotal"></span>' );

				// Modify existing "Total:" to "Subtotal:".
				$price_html.find( 'span.total' ).text( wc_bundle_params.i18n_bulk_discount_subtotal );

				// Append "Discount:" line.
				$price_html.append( discount_html );

				// Append new "Total:" line.
				$price_html.append( $discounted_price_html.html() );

				price_html = $price_html.prop( 'outerHTML' );
			}

			return price_html;
		};

		// Init.
		this.initialize = function() {

			/**
			 * Filter totals using 'bundle_subtotals_data' JS filter.
			 */
			bundle.filters.add_filter( 'bundle_subtotals_data', this.filter_bundle_subtotals_data, 10, this );

			/**
			 * Filter price total html using 'bundle_total_price_html' JS filter.
			 */
			bundle.filters.add_filter( 'bundle_total_price_html', this.filter_bundle_total_price_html, 10, this );
		};
	};

	// Hook into Bundles.
	$( '.bundle_form .bundle_data' ).each( function() {
		$( this ).on( 'woocommerce-product-bundle-initializing', function( event, bundle ) {
			var pb_integration = new PB_Integration( bundle );
			pb_integration.initialize();
		} );
	} );

} ) ( jQuery );
