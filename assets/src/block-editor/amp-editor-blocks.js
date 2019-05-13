/**
 * External dependencies
 */
import { extend, each } from 'lodash';

/**
 * WordPress dependencies
 */
import { __, _x } from '@wordpress/i18n';
import { addFilter } from '@wordpress/hooks';
import { getBlockType, unregisterBlockType } from '@wordpress/blocks';
import { SelectControl, PanelBody, TextControl, ToggleControl, FontSizePicker, Notice } from '@wordpress/components';
import { createElement, RawHTML, cloneElement } from '@wordpress/element';
import { InspectorControls } from '@wordpress/editor';

const ampEditorBlocks = ( function() {
	const component = {

		/**
		 * Holds data.
		 */
		data: {
			ampLayoutOptions: [
				{
					value: 'nodisplay',
					label: __( 'No Display', 'amp' ),
					notAvailable: [
						'core-embed/vimeo',
						'core-embed/dailymotion',
						'core-embed/hulu',
						'core-embed/reddit',
						'core-embed/soundcloud',
					],
				},
				{
					// Not supported by amp-audio and amp-pixel.
					value: 'fixed',
					label: __( 'Fixed', 'amp' ),
					notAvailable: [
						'core-embed/soundcloud',
					],
				},
				{
					// To ensure your AMP element displays, you must specify a width and height for the containing element.
					value: 'responsive',
					label: __( 'Responsive', 'amp' ),
					notAvailable: [
						'core-embed/soundcloud',
					],
				},
				{
					value: 'fixed-height',
					label: __( 'Fixed height', 'amp' ),
					notAvailable: [],
				},
				{
					value: 'fill',
					label: __( 'Fill', 'amp' ),
					notAvailable: [
						'core-embed/soundcloud',
					],
				},
				{
					value: 'flex-item',
					label: __( 'Flex Item', 'amp' ),
					notAvailable: [
						'core-embed/soundcloud',
					],
				},
				{
					// Not supported by video.
					value: 'intrinsic',
					label: __( 'Intrinsic', 'amp' ),
					notAvailable: [
						'core/video',
						'core-embed/youtube',
						'core-embed/facebook',
						'core-embed/instagram',
						'core-embed/vimeo',
						'core-embed/dailymotion',
						'core-embed/hulu',
						'core-embed/reddit',
						'core-embed/soundcloud',
					],
				},
			],
			defaultWidth: 608, // Max-width in the editor.
			defaultHeight: 400,
			mediaBlocks: [
				'core/image',
				'core/video',
			],
			textBlocks: [
				'core/paragraph',
				'core/heading',
				'core/code',
				'core/quote',
				'core/subhead',
			],
			ampSettingsLabel: __( 'AMP Settings', 'amp' ),
			fontSizes: {
				small: 14,
				larger: 48,
			},
			ampPanelLabel: __( 'AMP Settings', 'amp' ),
		},
		hasThemeSupport: true,
		isNativeAMP: false,
	};

	/**
	 * Add filters.
	 *
	 * @param {Object} data Data.
	 */
	component.boot = function boot( data ) {
		if ( data ) {
			extend( component.data, data );
		}

		addFilter( 'blocks.registerBlockType', 'ampEditorBlocks/addAttributes', component.addAMPAttributes );
		addFilter( 'blocks.getSaveElement', 'ampEditorBlocks/filterSave', component.filterBlocksSave );
		addFilter( 'editor.BlockEdit', 'ampEditorBlocks/filterEdit', component.filterBlocksEdit );
		addFilter( 'blocks.getSaveContent.extraProps', 'ampEditorBlocks/addExtraAttributes', component.addAMPExtraProps );
		component.maybeUnregisterBlocks();
	};

	/**
	 * Check if layout is available for the block.
	 *
	 * @param {string} blockName Block name.
	 * @param {Object} option Layout option object.
	 * @return {boolean} If is available.
	 */
	component.isLayoutAvailable = function isLayoutAvailable( blockName, option ) {
		return -1 === option.notAvailable.indexOf( blockName );
	};

	/**
	 * Get layout options depending on the block.
	 *
	 * @param {string} blockName Block name.
	 * @return {[*]} Options.
	 */
	component.getLayoutOptions = function getLayoutOptions( blockName ) {
		const layoutOptions = [
			{
				value: '',
				label: __( 'Default', 'amp' ),
			},
		];

		each( component.data.ampLayoutOptions, function( option ) {
			if ( component.isLayoutAvailable( blockName, option ) ) {
				layoutOptions.push( {
					value: option.value,
					label: option.label,
				} );
			}
		} );

		return layoutOptions;
	};

	/**
	 * Add extra data-amp-layout attribute to save to DB.
	 *
	 * @param {Object} props Properties.
	 * @param {Object} blockType Block type.
	 * @param {Object} attributes Attributes.
	 * @return {Object} Props.
	 */
	component.addAMPExtraProps = function addAMPExtraProps( props, blockType, attributes ) {
		const ampAttributes = {};

		// Shortcode props are handled differently.
		if ( 'core/shortcode' === blockType.name ) {
			return props;
		}

		// AMP blocks handle layout and other props on their own.
		if ( 'amp/' === blockType.name.substr( 0, 4 ) ) {
			return props;
		}

		if ( attributes.ampLayout ) {
			ampAttributes[ 'data-amp-layout' ] = attributes.ampLayout;
		}
		if ( attributes.ampNoLoading ) {
			ampAttributes[ 'data-amp-noloading' ] = attributes.ampNoLoading;
		}
		if ( attributes.ampLightbox ) {
			ampAttributes[ 'data-amp-lightbox' ] = attributes.ampLightbox;
		}
		if ( attributes.ampCarousel ) {
			ampAttributes[ 'data-amp-carousel' ] = attributes.ampCarousel;
		}

		return extend( ampAttributes, props );
	};

	/**
	 * Add AMP attributes (in this test case just ampLayout) to every core block.
	 *
	 * @param {Object} settings Settings.
	 * @param {string} name Block name.
	 * @return {Object} Settings.
	 */
	component.addAMPAttributes = function addAMPAttributes( settings, name ) {
		// AMP Carousel settings.
		if ( 'core/shortcode' === name || 'core/gallery' === name ) {
			if ( ! settings.attributes ) {
				settings.attributes = {};
			}
			settings.attributes.ampCarousel = {
				type: 'boolean',
			};
			settings.attributes.ampLightbox = {
				type: 'boolean',
			};
		}

		// Add AMP Lightbox settings.
		if ( 'core/image' === name ) {
			if ( ! settings.attributes ) {
				settings.attributes = {};
			}
			settings.attributes.ampLightbox = {
				type: 'boolean',
			};
		}

		// Fit-text for text blocks.
		if ( -1 !== component.data.textBlocks.indexOf( name ) ) {
			if ( ! settings.attributes ) {
				settings.attributes = {};
			}
			settings.attributes.ampFitText = {
				default: false,
			};
			settings.attributes.minFont = {
				default: component.data.fontSizes.small,
				source: 'attribute',
				selector: 'amp-fit-text',
				attribute: 'min-font-size',
			};
			settings.attributes.maxFont = {
				default: component.data.fontSizes.larger,
				source: 'attribute',
				selector: 'amp-fit-text',
				attribute: 'max-font-size',
			};
			settings.attributes.height = {
				default: 50,
				source: 'attribute',
				selector: 'amp-fit-text',
				attribute: 'height',
			};
		}

		// Layout settings for embeds and media blocks.
		if ( 0 === name.indexOf( 'core-embed' ) || -1 !== component.data.mediaBlocks.indexOf( name ) ) {
			if ( ! settings.attributes ) {
				settings.attributes = {};
			}
			settings.attributes.ampLayout = {
				type: 'string',
			};
			settings.attributes.ampNoLoading = {
				type: 'boolean',
			};
		}
		return settings;
	};

	/**
	 * Filters blocks edit function of all blocks.
	 *
	 * @param {Function} BlockEdit Edit function.
	 * @return {Function} Edit function.
	 */
	component.filterBlocksEdit = function filterBlocksEdit( BlockEdit ) {
		return function( props ) {
			const attributes = props.attributes;
			const name = props.name;

			let inspectorControls;

			const ampLayout = attributes.ampLayout;

			if ( 'core/shortcode' === name ) {
				// Lets remove amp-carousel from edit view.
				if ( component.hasGalleryShortcodeCarouselAttribute( attributes.text || '' ) ) {
					props.setAttributes( { text: component.removeAmpCarouselFromShortcodeAtts( attributes.text ) } );
				}
				// Lets remove amp-lightbox from edit view.
				if ( component.hasGalleryShortcodeLightboxAttribute( attributes.text || '' ) ) {
					props.setAttributes( { text: component.removeAmpLightboxFromShortcodeAtts( attributes.text ) } );
				}

				inspectorControls = component.setUpShortcodeInspectorControls( props );
				if ( '' === inspectorControls ) {
					// Return original.
					return [
						createElement( BlockEdit, extend( {
							key: 'original',
						}, props ) ),
					];
				}
			} else if ( 'core/gallery' === name ) {
				inspectorControls = component.setUpGalleryInpsectorControls( props );
			} else if ( 'core/image' === name ) {
				inspectorControls = component.setUpImageInpsectorControls( props );
			} else if ( -1 !== component.data.mediaBlocks.indexOf( name ) || 0 === name.indexOf( 'core-embed/' ) ) {
				inspectorControls = component.setUpInspectorControls( props );
			} else if ( -1 !== component.data.textBlocks.indexOf( name ) ) {
				inspectorControls = component.setUpTextBlocksInspectorControls( props );
			}

			// Return just inspector controls in case of 'nodisplay'.
			if ( ampLayout && 'nodisplay' === ampLayout ) {
				return [
					inspectorControls,
				];
			}

			return [
				createElement( BlockEdit, extend( {
					key: 'original',
				}, props ) ),
				inspectorControls,
			];
		};
	};

	/**
	 * Set width and height in case of image block.
	 *
	 * @param {Object} props Props.
	 * @param {string} layout Layout.
	 */
	component.setImageBlockLayoutAttributes = function setImageBlockLayoutAttributes( props, layout ) {
		const attributes = props.attributes;
		switch ( layout ) {
			case 'fixed-height':
				if ( ! attributes.height ) {
					props.setAttributes( { height: component.data.defaultHeight } );
				}
				// Lightbox doesn't work with fixed height, so unset it.
				if ( attributes.ampLightbox ) {
					props.setAttributes( { ampLightbox: false } );
				}
				break;

			case 'fixed':
				if ( ! attributes.height ) {
					props.setAttributes( { height: component.data.defaultHeight } );
				}
				if ( ! attributes.width ) {
					props.setAttributes( { width: component.data.defaultWidth } );
				}
				break;
		}
	};

	/**
	 * Default setup for inspector controls.
	 *
	 * @param {Object} props Props.
	 * @return {Object|Element|*|{$$typeof, type, key, ref, props, _owner}} Inspector Controls.
	 */
	component.setUpInspectorControls = function setUpInspectorControls( props ) {
		const { isSelected } = props;

		return isSelected && (
			createElement( InspectorControls, { key: 'inspector' },
				createElement( PanelBody, { title: component.data.ampPanelLabel },
					component.getAmpLayoutControl( props ),
					component.getAmpNoloadingToggle( props )
				)
			)
		);
	};

	/**
	 * Get AMP Layout select control.
	 *
	 * @param {Object} props Props.
	 * @return {Object} Element.
	 */
	component.getAmpLayoutControl = function getAmpLayoutControl( props ) {
		const { name, attributes: { ampLayout } } = props;

		let label = __( 'AMP Layout', 'amp' );

		if ( 'core/image' === name ) {
			label = __( 'AMP Layout (modifies width/height)', 'amp' );
		}

		return createElement( SelectControl, {
			label,
			value: ampLayout,
			options: component.getLayoutOptions( name ),
			onChange( value ) {
				props.setAttributes( { ampLayout: value } );
				if ( 'core/image' === props.name ) {
					component.setImageBlockLayoutAttributes( props, value );
				}
			},
		} );
	};

	/**
	 * Get AMP Noloading toggle control.
	 *
	 * @param {Object} props Props.
	 * @return {Object} Element.
	 */
	component.getAmpNoloadingToggle = function getAmpNoloadingToggle( props ) {
		const { attributes: { ampNoLoading } } = props;

		const label = __( 'AMP Noloading', 'amp' );

		return createElement( ToggleControl, {
			label,
			checked: ampNoLoading,
			onChange() {
				props.setAttributes( { ampNoLoading: ! ampNoLoading } );
			},
		} );
	};

	/**
	 * Setup inspector controls for text blocks.
	 *
	 * @todo Consider wrapping the render function to delete the original font size in text settings when ampFitText.
	 *
	 * @param {Object} props Props.
	 * @return {Object|Element|*|{$$typeof, type, key, ref, props, _owner}} Inspector Controls.
	 */
	component.setUpTextBlocksInspectorControls = function setUpInspectorControls( props ) {
		const { isSelected, attributes } = props;
		const { ampFitText } = attributes;
		let { minFont, maxFont, height } = attributes;

		const FONT_SIZES = [
			{
				name: 'small',
				shortName: _x( 'S', 'font size', 'amp' ),
				size: 14,
			},
			{
				name: 'regular',
				shortName: _x( 'M', 'font size', 'amp' ),
				size: 16,
			},
			{
				name: 'large',
				shortName: _x( 'L', 'font size', 'amp' ),
				size: 36,
			},
			{
				name: 'larger',
				shortName: _x( 'XL', 'font size', 'amp' ),
				size: 48,
			},
		];

		if ( ! isSelected ) {
			return null;
		}

		const label = __( 'Automatically fit text to container', 'amp' );

		const inspectorPanelBodyArgs = [
			PanelBody,
			{ title: component.data.ampSettingsLabel, className: ampFitText ? 'is-amp-fit-text' : '' },
			createElement( ToggleControl, {
				label,
				checked: ampFitText,
				onChange() {
					props.setAttributes( { ampFitText: ! ampFitText } );
				},
			} ),
		];

		if ( ampFitText ) {
			maxFont = parseInt( maxFont, 10 );
			height = parseInt( height, 10 );
			minFont = parseInt( minFont, 10 );
			inspectorPanelBodyArgs.push.apply( inspectorPanelBodyArgs, [
				createElement( TextControl, {
					label: __( 'Height', 'amp' ),
					value: height,
					min: 1,
					onChange( nextHeight ) {
						props.setAttributes( { height: nextHeight } );
					},
				} ),
				maxFont > height && createElement(
					Notice,
					{
						status: 'error',
						isDismissible: false,
					},
					__( 'The height must be greater than the max font size.', 'amp' )
				),
				createElement( PanelBody, { title: __( 'Minimum font size', 'amp' ) },
					createElement( FontSizePicker, {
						fallbackFontSize: 14,
						value: minFont,
						fontSizes: FONT_SIZES,
						onChange( nextMinFont ) {
							if ( ! nextMinFont ) {
								nextMinFont = component.data.fontSizes.small; // @todo Supplying fallbackFontSize should be done automatically by the component?
							}
							if ( parseInt( nextMinFont, 10 ) <= maxFont ) {
								props.setAttributes( { minFont: nextMinFont } );
							}
						},
					} )
				),
				minFont > maxFont && createElement(
					Notice,
					{
						status: 'error',
						isDismissible: false,
					},
					__( 'The min font size must less than the max font size.', 'amp' )
				),
				createElement( PanelBody, { title: __( 'Maximum font size', 'amp' ) },
					createElement( FontSizePicker, {
						value: maxFont,
						fallbackFontSize: 48,
						fontSizes: FONT_SIZES,
						onChange( nextMaxFont ) {
							if ( ! nextMaxFont ) {
								nextMaxFont = component.data.fontSizes.larger; // @todo Supplying fallbackFontSize should be done automatically by the component?
							}
							props.setAttributes( {
								maxFont: nextMaxFont,
								height: Math.max( nextMaxFont, height ),
							} );
						},
					} )
				),
			] );
		}

		return (
			createElement( InspectorControls, { key: 'inspector' },
				createElement.apply( null, inspectorPanelBodyArgs )
			)
		);
	};

	/**
	 * Set up inspector controls for shortcode block.
	 * Adds ampCarousel attribute in case of gallery shortcode.
	 *
	 * @param {Object} props Props.
	 * @return {Object} Inspector controls.
	 */
	component.setUpShortcodeInspectorControls = function setUpShortcodeInspectorControls( props ) {
		const { isSelected } = props;

		if ( component.isGalleryShortcode( props.attributes ) ) {
			return isSelected && (
				createElement( InspectorControls, { key: 'inspector' },
					createElement( PanelBody, { title: component.data.ampPanelLabel },
						component.data.hasThemeSupport && component.getAmpCarouselToggle( props ),
						component.getAmpLightboxToggle( props )
					)
				)
			);
		}

		return '';
	};

	/**
	 * Get AMP Lightbox toggle control.
	 *
	 * @param {Object} props Props.
	 * @return {Object} Element.
	 */
	component.getAmpLightboxToggle = function getAmpLightboxToggle( props ) {
		const { attributes: { ampLightbox } } = props;

		const label = __( 'Add lightbox effect', 'amp' );

		return createElement( ToggleControl, {
			label,
			checked: ampLightbox,
			onChange( nextValue ) {
				props.setAttributes( { ampLightbox: ! ampLightbox } );
				if ( nextValue ) {
					// Lightbox doesn't work with fixed height, so change.
					if ( 'fixed-height' === props.attributes.ampLayout ) {
						props.setAttributes( { ampLayout: 'fixed' } );
					}
					// In case of lightbox set linking images to 'none'.
					if ( props.attributes.linkTo && 'none' !== props.attributes.linkTo ) {
						props.setAttributes( { linkTo: 'none' } );
					}
				}
			},
		} );
	};

	/**
	 * Get AMP Carousel toggle control.
	 *
	 * @param {Object} props Props.
	 * @return {Object} Element.
	 */
	component.getAmpCarouselToggle = function getAmpCarouselToggle( props ) {
		const { attributes: { ampCarousel } } = props;

		const label = __( 'Display as carousel', 'amp' );

		return createElement( ToggleControl, {
			label,
			checked: ampCarousel,
			onChange() {
				props.setAttributes( { ampCarousel: ! ampCarousel } );
			},
		} );
	};

	/**
	 * Set up inspector controls for Image block.
	 *
	 * @param {Object} props Props.
	 * @return {Object} Inspector Controls.
	 */
	component.setUpImageInpsectorControls = function setUpImageInpsectorControls( props ) {
		const { isSelected } = props;

		return isSelected && (
			createElement( InspectorControls, { key: 'inspector' },
				createElement( PanelBody, { title: component.data.ampPanelLabel },
					component.getAmpLayoutControl( props ),
					component.getAmpNoloadingToggle( props ),
					component.getAmpLightboxToggle( props )
				)
			)
		);
	};

	/**
	 * Set up inspector controls for Gallery block.
	 * Adds ampCarousel attribute for displaying the output as amp-carousel.
	 *
	 * @param {Object} props Props.
	 * @return {Object} Inspector controls.
	 */
	component.setUpGalleryInpsectorControls = function setUpGalleryInpsectorControls( props ) {
		const { isSelected } = props;

		return isSelected && (
			createElement( InspectorControls, { key: 'inspector' },
				createElement( PanelBody, { title: component.data.ampPanelLabel },
					component.data.hasThemeSupport && component.getAmpCarouselToggle( props ),
					component.getAmpLightboxToggle( props )
				)
			)
		);
	};

	/**
	 * Filters blocks' save function.
	 *
	 * @param {Object} element        Element.
	 * @param {string} blockType      Block type.
	 * @param {string} blockType.name Block type name.
	 * @param {Object} attributes     Attributes.
	 *
	 * @return {Object} Output element.
	 */
	component.filterBlocksSave = function filterBlocksSave( element, blockType, attributes ) {
		let text = attributes.text || '',
			content = '';

		const fitTextProps = {
			layout: 'fixed-height',
		};

		if ( 'core/shortcode' === blockType.name && component.isGalleryShortcode( attributes ) ) {
			if ( ! attributes.ampLightbox ) {
				if ( component.hasGalleryShortcodeLightboxAttribute( attributes.text || '' ) ) {
					text = component.removeAmpLightboxFromShortcodeAtts( attributes.text );
				}
			}
			if ( attributes.ampCarousel ) {
				// If the text contains amp-carousel or amp-lightbox, lets remove it.
				if ( component.hasGalleryShortcodeCarouselAttribute( text ) ) {
					text = component.removeAmpCarouselFromShortcodeAtts( text );
				}

				// If lightbox is not set, we can return here.
				if ( ! attributes.ampLightbox ) {
					if ( attributes.text !== text ) {
						return createElement(
							RawHTML,
							{},
							text
						);
					}

					// Else lets return original.
					return element;
				}
			} else if ( ! component.hasGalleryShortcodeCarouselAttribute( attributes.text || '' ) ) {
				// Add amp-carousel=false attribute to the shortcode.
				text = attributes.text.replace( '[gallery', '[gallery amp-carousel=false' );
			} else {
				text = attributes.text;
			}

			if ( attributes.ampLightbox && ! component.hasGalleryShortcodeLightboxAttribute( text ) ) {
				text = text.replace( '[gallery', '[gallery amp-lightbox=true' );
			}

			if ( attributes.text !== text ) {
				return createElement(
					RawHTML,
					{},
					text
				);
			}
		} else if ( 'core/paragraph' === blockType.name && ! attributes.ampFitText ) {
			content = component.getAmpFitTextContent( attributes.content );
			if ( content !== attributes.content ) {
				return cloneElement(
					element,
					{
						key: 'new',
						value: content,
					}
				);
			}
		} else if ( -1 !== component.data.textBlocks.indexOf( blockType.name ) && attributes.ampFitText ) {
			if ( attributes.minFont ) {
				fitTextProps[ 'min-font-size' ] = attributes.minFont;
			}
			if ( attributes.maxFont ) {
				fitTextProps[ 'max-font-size' ] = attributes.maxFont;
			}
			if ( attributes.height ) {
				fitTextProps.height = attributes.height;
			}

			/*
			 * This is a workaround for AMP Stories since AMP Story CSS is overriding the amp-fit-text CSS.
			 * Note that amp-fit-text should support containing elements as well:
			 * "The expected content for amp-fit-text is text or other inline content, but it can also contain non-inline content."
			 */
			if ( 'core/paragraph' === blockType.name ) {
				let ampFitTextContent = '<amp-fit-text';
				each( fitTextProps, function( value, att ) {
					ampFitTextContent += ' ' + att + '="' + value + '"';
				} );
				ampFitTextContent += '>' + component.getAmpFitTextContent( attributes.content ) + '</amp-fit-text>';

				return cloneElement(
					element,
					{
						key: 'new',
						value: ampFitTextContent,
					}
				);
			}

			fitTextProps.children = element;
			return createElement( 'amp-fit-text', fitTextProps );
		}
		return element;
	};

	/**
	 * Get inner content of AMP Fit Text tag.
	 *
	 * @param {string} content Original content.
	 * @return {string} Modified content.
	 */
	component.getAmpFitTextContent = function getAmpFitTextContent( content ) {
		const contentRegex = /<amp-fit-text\b[^>]*>(.*?)<\/amp-fit-text>/;
		const match = contentRegex.exec( content );

		let newContent = content;

		if ( match && match[ 1 ] ) {
			newContent = match[ 1 ];
		}

		return newContent;
	};

	/**
	 * Check if AMP Lightbox is set.
	 *
	 * @param {Object} attributes Attributes.
	 * @return {boolean} If is set.
	 */
	component.hasAmpLightboxSet = function hasAmpLightboxSet( attributes ) {
		return attributes.ampLightbox && false !== attributes.ampLightbox;
	};

	/**
	 * Check if AMP Carousel is set.
	 *
	 * @param {Object} attributes Attributes.
	 * @return {boolean} If is set.
	 */
	component.hasAmpCarouselSet = function hasAmpCarouselSet( attributes ) {
		return attributes.ampCarousel && false !== attributes.ampCarousel;
	};

	/**
	 * Check if AMP NoLoading is set.
	 *
	 * @param {Object} attributes Attributes.
	 * @return {boolean} If is set.
	 */
	component.hasAmpNoLoadingSet = function hasAmpNoLoadingSet( attributes ) {
		return attributes.ampNoLoading && false !== attributes.ampNoLoading;
	};

	/**
	 * Check if AMP Layout is set.
	 *
	 * @param {Object} attributes Attributes.
	 * @return {boolean} If AMP Layout is set.
	 */
	component.hasAmpLayoutSet = function hasAmpLayoutSet( attributes ) {
		return attributes.ampLayout && attributes.ampLayout.length;
	};

	/**
	 * Removes amp-carousel=false from attributes.
	 *
	 * @param {string} shortcode Shortcode text.
	 * @return {string} Modified shortcode.
	 */
	component.removeAmpCarouselFromShortcodeAtts = function removeAmpCarouselFromShortcodeAtts( shortcode ) {
		return shortcode.replace( ' amp-carousel=false', '' );
	};

	/**
	 * Removes amp-lightbox=true from attributes.
	 *
	 * @param {string} shortcode Shortcode text.
	 * @return {string} Modified shortcode.
	 */
	component.removeAmpLightboxFromShortcodeAtts = function removeAmpLightboxFromShortcodeAtts( shortcode ) {
		return shortcode.replace( ' amp-lightbox=true', '' );
	};

	/**
	 * Check if shortcode includes amp-carousel attribute.
	 *
	 * @param {string} text Shortcode.
	 * @return {boolean} If has amp-carousel.
	 */
	component.hasGalleryShortcodeCarouselAttribute = function hasGalleryShortcodeCarouselAttribute( text ) {
		return -1 !== text.indexOf( 'amp-carousel=false' );
	};

	/**
	 * Check if shortcode includes amp-lightbox attribute.
	 *
	 * @param {string} text Shortcode.
	 * @return {boolean} If has amp-lightbox.
	 */
	component.hasGalleryShortcodeLightboxAttribute = function hasGalleryShortcodeLightboxAttribute( text ) {
		return -1 !== text.indexOf( 'amp-lightbox=true' );
	};

	/**
	 * Check if shortcode is gallery shortcode.
	 *
	 * @param {Object} attributes Attributes.
	 * @return {boolean} If is gallery shortcode.
	 */
	component.isGalleryShortcode = function isGalleryShortcode( attributes ) {
		return attributes.text && -1 !== attributes.text.indexOf( 'gallery' );
	};

	/**
	 * If there's no theme support, unregister blocks that are only meant for AMP.
	 * The Latest Stories block is meant for AMP and non-AMP, so don't unregister it here.
	 */
	component.maybeUnregisterBlocks = function maybeUnregisterBlocks() {
		const ampDependentBlocks = [
			'amp-brid-player',
			'amp-ima-video',
			'amp-jwplayer',
			'amp-mathml',
			'amp-o2-player',
			'amp-ooyala-player',
			'amp-reach-player',
			'amp-springboard-player',
			'amp-timeago',
		];

		if ( component.data.isNativeAMP ) {
			return;
		}

		ampDependentBlocks.forEach( function( block ) {
			const blockName = 'amp/' + block;
			if ( getBlockType( blockName ) ) {
				unregisterBlockType( blockName );
			}
		} );
	};

	return component;
}() );

window.ampEditorBlocks = ampEditorBlocks;