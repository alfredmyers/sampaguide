
/**
 * @fileoverview Custom functionality to apply throughout every adsize. This
 * has a dependency on common.js and utils.js
 */
var custom = (function() {

  /**
   * Classes which our JS hooks into. Add more class names as necessary.
   * @enum
   * @private
   */
  var elementClass_ = {
    item: 'js-item',
    itemBG: 'js-item-bg',
    itemName: 'js-item-name',
    itemPrice: 'js-item-price',
    itemSalePrice: 'js-item-saleprice',
    itemRegularPrice: 'js-item-regularprice',
    itemCTAOn: 'js-item-cta-on',
    itemRating: 'js-rating-holder',
    bubbleHolder: 'js-bubble-holder',
    bubbleFull: 'js-bubble-full',
    bubbleHalf: 'js-bubble-half',
    bubbleEmpty: 'js-bubble-empty'
  };

  var elementId_ = {
    gpaDataProvider: 'gpa-data-provider',
    logoImg: 'logo-img'
  };

  var ratingsArray = [];
  var regPricesArray = [];
  var salePricesArray = [];
  var headlineExists;
  var showRegPrice = true;
  var theFrameOnAutoplay;

  /**
   * Initialization. Called from handleAdInitialized on each page.
   */
  function init() {
    utils.log('custom.init()');
    var data = common.getAdData();
    if (!data) return;

    // console.log("ratings array: " + ratingsArray);

    // If you're using the swipe gallery to display feed items.
    initItemsUsingGallery_();

    // If you're NOT using the swipe gallery to display feed items.
    //initItemsWithoutGallery_();

    console.log("regular prices: ", regPricesArray);
    console.log("sale prices: ", salePricesArray);
    console.log("ratings: ", ratingsArray);

    console.log("headline exists: ", headlineExists);
    if (!headlineExists) {
      var logoImg = document.querySelector('#' + elementId_.logoImg);
      logoImg.className += " horiz-center";
      if ( !checkSizeLogoVertical() ) {
        console.log("logo should also move vertically");
        logoImg.className += " v-center";
        logoImg.style.setProperty ("position", "absolute", "important");
      }

    }

  }

  function transformDynamicData () {
    var dataProvider = document.querySelector('#' + elementId_.gpaDataProvider);
    console.log("data: " + dataProvider);
    dataProvider.addDataTransformer(function(dynamicData) {
      var data = dynamicData;
      if ( data.Headline.txt == undefined ) {
        headlineExists = false;
        console.log("headline text if: " + data.Headline.txt);
      } else if (data.Headline.txt || data.Headline.txt != "" ) {
        headlineExists = true;
        console.log("headline text else if: " + data.Headline.txt);
      } else {
        headlineExists = false;
        console.log("headline text else: " + data.Headline.txt);
      }

      if (data.Design.priceSize == 0) {
        console.log("price size = 0; hide regular price");
        showRegPrice = false;
      }

      if (data.Product) {
        var rating = data.Product[0].advertiserReviewRating;
        var delimiter = 'advertiserReviewRating';

        if (rating == null) {
          rating = data.Product[0].advertiser_review_rating;
          delimiter = 'advertiser_review_rating';
          console.info("Rating System is using 'advertiser_review_rating'.")
        } else {
          console.info("Rating System is using 'advertiserReviewRating'.")
        }

        for (var i = 0; i < data.Product.length; i++) {
          /* ~~~~~~~~~~~~~
          THIS NEEDS TO BE TESTED IN ADWORDS
          ~~~~~~~~~~~~~~~ */
          if (delimiter == 'advertiser_review_rating') {
            ratingsArray.push(data.Product[i].advertiser_review_rating);
          } else {
            ratingsArray.push(data.Product[i].advertiserReviewRating);
          }

          /* ~~~~~~~~~~~~~
          DROP ALL CENTS VALUES
          ~~~~~~~~~~~~~~~ */
          if (data.Product[i].price) {
            data.Product[i].price = data.Product[i].price.replace(/(\.|\,)[\d]{2}(?![\d])/g,'');
            if (data.Product[i].salePrice) {
              data.Product[i].salePrice = data.Product[i].salePrice.replace(/(\.|\,)[\d]{2}(?![\d])/g,'');
            }
          }

          regPricesArray.push(data.Product[i].price);
          salePricesArray.push(data.Product[i].salePrice);

          data.Product[i].regularPrice = null;

          /* ~~~~~~~~~~~~~
          IF THERE IS A SALE PRICE AND THE SALE PRICE IS NOT EQUAL TO THE REGULAR PRICE
          ~~~~~~~~~~~~~~~ */
          if (data.Product[i].salePrice && !data.Product[i].price) {
            data.Product[i].price = data.Product[i].salePrice;
          }
          if (data.Product[i].salePrice && data.Product[i].salePrice != data.Product[i].price && showRegPrice == true) {
            data.Product[i].regularPrice = data.Product[i].price;
            data.Product[i].price = data.Product[i].salePrice;

            /* ~~~~~~~~~~~~~
            CALCULATE THE % DISCOUNT
            ~~~~~~~~~~~~~~~ */
            data.Product[i].salePercentDiscount = null;
            data.Product[i].salePercentDiscount = calculateDiscount_(i);
          }
        }
      }
    });
  }

  function calculateDiscount_(index){
    var originalPrice = regPricesArray[index];
    var discountedPrice = salePricesArray[index];
    var discountRate;
    var matcher = /\D/g;

    if (originalPrice) {
      originalPrice = parseInt(originalPrice.replace(matcher, ''));
      discountedPrice = parseInt(discountedPrice.replace(matcher, ''));

      originalPrice = Math.abs(originalPrice);
      discountedPrice = Math.abs(discountedPrice);
      discountRate = (discountedPrice / originalPrice) * 100;
      discountRate = 100 - (discountRate);
      discountRate = Math.abs(Math.round(discountRate));
      discountRate = "-" + discountRate + "%*";
    }

    return discountRate;
  }

  function checkSize(){
    var size = parseInt(common.getPageSize().width) + "x" + parseInt(common.getPageSize().height);
    var result = true;

    switch(size){
      case "320x50":
        result = false;
      break;
      default:
        result = true;
    }
    return result;
  }

  function checkSizeLogoVertical(){
    var size = parseInt(common.getPageSize().width) + "x" + parseInt(common.getPageSize().height);
    var result = true;

    switch(size){
      case "160x600": case "120x600": case "728x90": case "970x90": case "468x60":
        result = false;
      break;
      default:
        result = true;
    }
    return result;
  }



  /**
   * Find all items used in the swipe gallery and initialize custom behavior.
   * @private
   */
  function initItemsUsingGallery_() {
    var gallery = common.getGallery();

    // Apply settings to each item in the gallery
    var items = gallery.querySelectorAll('.' + elementClass_.item);
    theFrameOnAutoplay = items[common.getCurrentItemIndex()];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      initItemDisplay_(item, i);
      setRatings_(item, i);
    }
  }

  /**
   * Find all items used outside the gallery and initialize custom behavior.
   * @private
   */
  function initItemsWithoutGallery_() {
    // Apply settings to each item
    var items = document.querySelectorAll('.' + elementClass_.item);
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      initItemDisplay_(item);
    }
  }

  function setRatings_(item, index) {
    var itemRating = item.querySelector('.' + elementClass_.itemRating);
    var bubbleHolders = itemRating.querySelectorAll('.' + elementClass_.bubbleHolder);
    var bubbleCount = parseFloat(ratingsArray[index]);

    if (bubbleCount > 5 || isNaN(bubbleCount)) return;
    if (bubbleCount % 1 != 0) {
      bubbleCount = Math.round(bubbleCount*2)/2;
    }
    // console.log("bubbleCount should be a number rounded to nearest .5: " + bubbleCount);

    for (var i = 0; i < bubbleHolders.length; i++) {
      bubbleHolders[i].querySelector('.' + elementClass_.bubbleEmpty).style.opacity = 1;
    }
    for (var j = 0; j < bubbleCount; j++) {
      bubbleHolders[j].querySelector('.' + elementClass_.bubbleEmpty).style.opacity = 0;
      bubbleHolders[j].querySelector('.' + elementClass_.bubbleFull).style.opacity = 1;
    }
    
    switch(bubbleCount){
      case 0.5: case 1.5: case 2.5: case 3.5: case 4.5:
        bubbleHolders[Math.floor(bubbleCount)].querySelector('.' + elementClass_.bubbleEmpty).style.opacity = 0;
        bubbleHolders[Math.floor(bubbleCount)].querySelector('.' + elementClass_.bubbleFull).style.opacity = 0;
        bubbleHolders[Math.floor(bubbleCount)].querySelector('.' + elementClass_.bubbleHalf).style.opacity = 1;
      break;
      default:
        // console.log("stars not on half");
    }
  }

  /**
   * Set each frame to active on swipegallery autoplay.
   * @param {Event} event Event fired once each frame autoplays.
   */
  function frameAutoplayed(event) {
    var gallery = event.target;
    var index = parseInt(event.detail.id) - 1;

    // Update the current item index.
    common.setCurrentItemIndex(index);

    // Apply mouseover / mouseout to relevant items.
    var items = gallery.querySelectorAll('.' + elementClass_.item);
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (common.isCurrentItemIndex(i)) {
        itemMouseOver(item);
      } else {
        itemMouseOut(item);
      }
    }

    theFrameOnAutoplay = items[common.getCurrentItemIndex()];
    
  }

  /**
   * On finalisation of swipegallery autoplay.
   * @param {Event} event Event fired once autoplay finished.
   */
  function autoplayEnded(event) {
    var gallery = event.target;
    // Set the current item index back to 0.
    common.setCurrentItemIndex(0);
  }

  /**
   * Set the display settings for each item.
   * Add any custom functionality you need applied on load.
   * @param {Element} item Item element.
   * @private
   */
  function initItemDisplay_(item, index) {

    // if you're using sales prices.
    // setSalePricesDisplay_(item);

    // Set mouseout.
    itemMouseOut(item);
  }

  /**
   * Sets the 3 price elements to display correctly when using sales price.
   * Find your price elements and set into common functionality.
   * @param {Element} item Item element.
   * @private
   */
  function setSalePricesDisplay_(item) {
    // Get reference to each price element.
    var itemPrice = item.querySelector('.' + elementClass_.itemPrice);
    var itemSalePrice = item.querySelector('.' + elementClass_.itemSalePrice);
    var itemRegularPrice = item.querySelector('.' + elementClass_.itemRegularPrice);

    // Sets each item to display correct prices.
    common.displayCorrectPrices(itemPrice, itemSalePrice, itemRegularPrice);

  }

  /**
   * Custom Item Mouse Interactions. Add your own behavior.
   */

  /**
   * Custom Mouseover interaction functionality.
   * @param {Element} item
   */
  function itemMouseOver(item) {
    if(!checkSize()) return;

    if (theFrameOnAutoplay) {
      itemMouseOut(theFrameOnAutoplay);
      // console.log("should stop running after the first mouseover has been done");
      theFrameOnAutoplay = undefined;
    }

    var itemBG = item.querySelector('.' + elementClass_.itemBG);
    var itemCTAOn = item.querySelector('.' + elementClass_.itemCTAOn);

    itemBG.style.backgroundColor = "#ffffff";
    itemCTAOn.style.opacity =  1;
  }

  /**
   * Custom Mouseout interaction functionality.
   * @param {Element} item
   */
  function itemMouseOut(item) {
    if(!checkSize()) return;
    var itemBG = item.querySelector('.' + elementClass_.itemBG);
    var itemCTAOn = item.querySelector('.' + elementClass_.itemCTAOn);

    itemBG.style.backgroundColor = "#f7f7f7";
    itemCTAOn.style.opacity =  0;
  }

  return {
    init: init,
    itemMouseOver: itemMouseOver,
    itemMouseOut: itemMouseOut,
    transformDynamicData: transformDynamicData,
    frameAutoplayed: frameAutoplayed,
    autoplayEnded: autoplayEnded
  };

})();
