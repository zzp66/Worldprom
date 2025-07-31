function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}
var dispatchCustomEvent = function dispatchCustomEvent(eventName) {
  var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var detail = {
    detail: data
  };
  var event = new CustomEvent(eventName, data ? detail : null);
  document.dispatchEvent(event);
};
window.recentlyViewedIds = [];

/**
 *  @class
 *  @function Quantity
 */
if (!customElements.get('quantity-selector')) {
  class QuantityInput extends HTMLElement {
    constructor() {
      super();
      this.input = this.querySelector('.qty');
      this.step = this.input.getAttribute('step');
      this.changeEvent = new Event('change', {
        bubbles: true
      });
      // Create buttons
      this.subtract = this.querySelector('.minus');
      this.add = this.querySelector('.plus');

      // Add functionality to buttons
      this.subtract.addEventListener('click', () => this.change_quantity(-1 * this.step));
      this.add.addEventListener('click', () => this.change_quantity(1 * this.step));

    }
    connectedCallback() {
      this.classList.add('buttons_added');
      this.validateQtyRules();
    }
    change_quantity(change) {
      // Get current value
      let quantity = Number(this.input.value);

      // Ensure quantity is a valid number
      if (isNaN(quantity)) quantity = 1;

      // Check for min & max
      if (this.input.getAttribute('min') > (quantity + change)) {
        return;
      }
      if (this.input.getAttribute('max')) {
        if (this.input.getAttribute('max') < (quantity + change)) {
          return;
        }
      }
      // Change quantity
      quantity += change;

      // Ensure quantity is always a number
      quantity = Math.max(quantity, 1);

      // Output number
      this.input.value = quantity;

      this.input.dispatchEvent(this.changeEvent);

      this.validateQtyRules();
    }
    validateQtyRules() {
      const value = parseInt(this.input.value);
      if (this.input.min) {
        const min = parseInt(this.input.min);
        this.subtract.classList.toggle('disabled', value <= min);
      }
      if (this.input.max) {
        const max = parseInt(this.input.max);
        this.add.classList.toggle('disabled', value >= max);
      }
    }
  }
  customElements.define('quantity-selector', QuantityInput);
}

/**
 *  @class
 *  @function ArrowSubMenu
 */
class ArrowSubMenu {

  constructor(self) {
    this.submenu = self.parentNode.querySelector('.sub-menu');
    this.arrow = self;
    // Add functionality to buttons
    self.addEventListener('click', (e) => this.toggle_submenu(e));
  }

  toggle_submenu(e) {
    e.preventDefault();
    let submenu = this.submenu;

    if (!submenu.classList.contains('active')) {
      submenu.classList.add('active');

    } else {
      submenu.classList.remove('active');
      this.arrow.blur();
    }
  }
}
let arrows = document.querySelectorAll('.thb-arrow');
arrows.forEach((arrow) => {
  new ArrowSubMenu(arrow);
});

/**
 *  @class
 *  @function ProductCard
 */
if (!customElements.get('product-card')) {
  class ProductCard extends HTMLElement {
    constructor() {
      super();

    }
    connectedCallback() {
      this.swatches = this.querySelector('.product-card-swatches');
      this.slider = this.querySelector('.product-card--image');
      this.image = this.querySelector('.product-primary-image');
      this.additional_images = this.querySelectorAll('.product-secondary-image');
      this.quick_add = this.querySelector('.product-card--add-to-cart-button-simple');
      this.size_options = this.querySelector('.product-card-sizes');


      this.slideWidth = this.image ? this.image.offsetWidth : 0;
      this.slidesToScroll = 1;
      this.reachedEnd = 0;

      if (this.swatches) {
        this.enableSwatches();
      }
      if (this.additional_images.length > 0) {
        this.enableAdditionalImages();
      }
      if (this.quick_add) {
        this.enableQuickAdd();
      }
      if (this.size_options) {
        this.enableSizeOptions();
      }
    }
    enableAdditionalImages() {
      this.viewport = this.querySelector('.product-card--image-inner');
      this.nav = this.querySelector('.product-card--nav-container');
      this.navPrev = this.querySelector('.product-card--nav-prev');
      this.navNext = this.querySelector('.product-card--nav-next');
      this.resizeObserver = new ResizeObserver((entries) => {
        this.slideWidth = this.image.offsetWidth;
        this.reachedEnd = this.viewport.scrollWidth - this.viewport.offsetWidth == this.viewport.scrollLeft;
        this.onNavDisabled();
      }, {
        root: this.slider
      });
      this.resizeObserver.observe(this.image);
      this.debouncedOnScroll = debounce((event) => {
        this.onScroll(event);
      }, 100);
      this.nav.addEventListener('click', this.onNavClick.bind(this));
      this.slider.addEventListener('scroll', this.debouncedOnScroll.bind(this));
      this.slider.addEventListener('resize', this.debouncedOnScroll.bind(this));
      this.additional_images.forEach((image) => {
        window.addEventListener('load', () => {
          lazySizes.loader.unveil(image);
        });
      });
    }
    onScroll() {
      this.reachedEnd = (this.slider.scrollWidth - this.slider.offsetWidth) - Math.floor(this.slider.scrollLeft) <= 1;
      this.onNavDisabled();
    }
    onNavClick(e) {
      if (!e.target.matches('.product-card--nav')) {
        return;
      }
      if (e.target.name === 'next') {
        this.scrollPos = this.slider.scrollLeft + this.slidesToScroll * this.slideWidth;
      } else if (e.target.name === 'prev') {
        this.scrollPos = this.slider.scrollLeft - this.slidesToScroll * this.slideWidth;
      }

      this.slider.scrollTo({
        left: this.scrollPos,
        behavior: "smooth"
      });
    }
    onNavDisabled() {
      if (this.navPrev) {
        this.navPrev.disabled = this.slider.scrollLeft === 0 ? 1 : 0;
      }
      if (this.navNext) {
        this.navNext.disabled = this.reachedEnd ? 1 : 0;
      }
    }
    enableSwatches() {
      let swatch_list = this.swatches.querySelectorAll('.product-card-swatch');
      this.color_index = this.swatches.dataset.index;
      this.org_srcset = this.image ? this.image.dataset.srcset : '';

      this.addEventListener('change', this.onSwatchChange.bind(this));

      swatch_list.forEach((swatch) => {
        window.addEventListener('load', () => {
          if (swatch.dataset.srcset) {
            let image = new Image();
            image.srcset = swatch.dataset.srcset;
            lazySizes.loader.unveil(image);
          }
        });
        swatch.addEventListener('click', this.onSwatchClick);
        swatch.addEventListener('mouseover', this.onSwatchHover.bind(this, swatch));
      });
    }
    onSwatchClick() {
      window.location.href = this.dataset.href;
    }
    onSwatchHover(swatch) {
      let swatch_input = swatch.previousElementSibling;
      swatch_input.checked = true;
      this.current_options[this.color_index] = swatch.querySelector('span').innerText;
      this.updateMasterId();
      swatch_input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    onSwatchChange(evt) {
      if (this.image) {
        if (evt.target.dataset.srcset) {
          this.image.setAttribute('srcset', evt.target.dataset.srcset);
        } else {
          this.image.setAttribute('srcset', this.org_srcset);
        }
      }
    }
    enableQuickAdd() {
      this.quick_add.addEventListener('click', this.quickAdd.bind(this));
    }
    enableSizeOptions() {
      let size_list = this.size_options.querySelectorAll('.product-card-sizes--size');

      this.size_index = this.size_options.dataset.index;

      this.current_options = this.size_options.dataset.options.split(',');

      this.updateMasterId();
      size_list.forEach((size) => {
        size.addEventListener('click', (evt) => {
          evt.preventDefault();

          if (size.classList.contains('is-disabled')) {
            return;
          }
          this.current_options[this.size_index] = size.querySelector('span').innerText;
          this.updateMasterId();

          size.classList.add('loading');
          size.setAttribute('aria-disabled', true);
          const config = {
            method: 'POST',
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
              'Accept': 'application/javascript'
            }
          };
          let formData = new FormData();

          formData.append('id', this.currentVariant.id);
          formData.append('quantity', 1);
          formData.append('sections', this.getSectionsToRender().map((section) => section.section));
          formData.append('sections_url', window.location.pathname);

          config.body = formData;

          fetch(`${theme.routes.cart_add_url}`, config)
            .then((response) => response.json())
            .then((response) => {
              if (response.status) {
                return;
              }
              this.renderContents(response);

              dispatchCustomEvent('cart:item-added', {
                product: response.hasOwnProperty('items') ? response.items[0] : response
              });
            })
            .catch((e) => {
              console.error(e);
            })
            .finally(() => {
              size.classList.remove('loading');
              size.removeAttribute('aria-disabled');
            });
        });
      });
    }
    updateMasterId() {
      this.currentVariant = this.getVariantData().find((variant) => {
        return !variant.options.map((option, index) => {
          return this.current_options[index].toLowerCase() === option.toLowerCase();
        }).includes(false);
      });
      setTimeout(() => {
        this.setDisabled();
      }, 100);
    }
    getVariantData() {
      this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
      return this.variantData;
    }
    setDisabled() {
      const variant_data = this.getVariantData();

      if (variant_data) {

        if (this.currentVariant) {
          const selected_options = this.currentVariant.options.map((value, index) => {
            return {
              value,
              index: `option${index + 1}`
            };
          });

          const available_options = this.createAvailableOptionsTree(variant_data, selected_options);

          const fieldset_options = Object.values(available_options)[this.size_index];
          if (fieldset_options) {
            if (this.size_options.querySelectorAll('.product-card-sizes--size').length) {
              this.size_options.querySelectorAll('.product-card-sizes--size').forEach((input, input_i) => {
                input.classList.toggle('is-disabled', fieldset_options[input_i].isUnavailable);
              });
            }
          }
        } else {
          if (this.size_options.querySelectorAll('.product-card-sizes--size').length) {
            this.size_options.querySelectorAll('.product-card-sizes--size').forEach((input, input_i) => {
              input.classList.add('is-disabled');
            });
          }
        }

      }
      return true;
    }
    createAvailableOptionsTree(variant_data, selected_options) {
      // Reduce variant array into option availability tree
      return variant_data.reduce((options, variant) => {

        // Check each option group (e.g. option1, option2, option3) of the variant
        Object.keys(options).forEach(index => {

          if (variant[index] === null) return;

          let entry = options[index].find(option => option.value === variant[index]);

          if (typeof entry === 'undefined') {
            // If option has yet to be added to the options tree, add it
            entry = {
              value: variant[index],
              isUnavailable: true
            };
            options[index].push(entry);
          }

          // Check how many selected option values match a variant
          const countVariantOptionsThatMatchCurrent = selected_options.reduce((count, {
            value,
            index
          }) => {
            return variant[index] === value ? count + 1 : count;
          }, 0);

          // Only enable an option if an available variant matches all but one current selected value
          if (countVariantOptionsThatMatchCurrent >= selected_options.length - 1) {
            entry.isUnavailable = entry.isUnavailable && variant.available ? false : entry.isUnavailable;
          }

          // Make sure if a variant is unavailable, disable currently selected option
          if ((!this.currentVariant || !this.currentVariant.available) && selected_options.find((option) => option.value === entry.value && index === option.index)) {
            entry.isUnavailable = true;
          }

          // First option is always enabled
          if (index === 'option1') {
            entry.isUnavailable = entry.isUnavailable && variant.available ? false : entry.isUnavailable;
          }
        });

        return options;
      }, {
        option1: [],
        option2: [],
        option3: []
      });
    }
    quickAdd(evt) {
      evt.preventDefault();
      if (this.quick_add.disabled) {
        return;
      }
      this.quick_add.classList.add('loading');
      this.quick_add.setAttribute('aria-disabled', true);

      const config = {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/javascript'
        }
      };

      let formData = new FormData();

      formData.append('id', this.quick_add.dataset.productId);
      formData.append('quantity', 1);
      formData.append('sections', this.getSectionsToRender().map((section) => section.section));
      formData.append('sections_url', window.location.pathname);

      config.body = formData;

      fetch(`${theme.routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            return;
          }
          this.renderContents(response);

          dispatchCustomEvent('cart:item-added', {
            product: response.hasOwnProperty('items') ? response.items[0] : response
          });
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          this.quick_add.classList.remove('loading');
          this.quick_add.removeAttribute('aria-disabled');
        });

      return false;
    }
    getSectionsToRender() {
      return [{
        id: 'Cart',
        section: 'main-cart',
        selector: '.thb-cart-form'
      },
      {
        id: 'Cart-Drawer',
        section: 'cart-drawer',
        selector: '.cart-drawer'
      },
      {
        id: 'cart-drawer-toggle',
        section: 'cart-bubble',
        selector: '.thb-item-count'
      }];
    }
    renderContents(parsedState) {
      this.getSectionsToRender().forEach((section => {
        if (!document.getElementById(section.id)) {
          return;
        }
        const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
        elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);

        if (section.id === 'Cart-Drawer') {
          document.getElementById('Cart-Drawer')?.notesToggle();
          document.getElementById('Cart-Drawer')?.removeProductEvent();
        }

        if (section.id === 'Cart' && typeof Cart !== 'undefined') {
          new Cart().renderContents(parsedState);
        }
      }));


      document.getElementById('Cart-Drawer')?.open();
    }
    getSectionInnerHTML(html, selector = '.shopify-section') {
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector).innerHTML;
    }
  }
  customElements.define('product-card', ProductCard);
}


/**
 *  @class
 *  @function PanelClose
 */
if (!customElements.get('side-panel-close')) {
  class PanelClose extends HTMLElement {

    constructor() {
      super();

    }
    connectedCallback() {
      this.cc = document.querySelector('.click-capture');

      // Add functionality to buttons
      this.addEventListener('click', (e) => {
        this.close_panel(e);
      });
      document.addEventListener('panel:close', (e) => {
        let panel = document.querySelectorAll('.side-panel.active');
        if (panel.length) {
          this.close_panel(e, panel[0]);
        }
      });
      if (!this.cc.dataset.init) {
        this.cc.addEventListener('click', (e) => {
          let panel = document.querySelectorAll('.side-panel.active');
          if (panel) {
            this.close_panel(e, panel[0]);
          }
        });
        this.cc.dataset.init = true;
      }
    }
    close_panel(e, panel) {
      if (!panel) {
        panel = this.closest('.side-panel');

        if (!panel) {
          return;
        }
      }
      panel.classList.remove('active');
      panel.setAttribute('inert', '');

      if (document.body.classList.contains('open-cc--product')) {
        document.body.classList.remove('open-cc--product');
        setTimeout(() => {
          document.querySelector('#Product-Drawer-Content').innerHTML = '';
        }, 260);
      } else if (panel?.classList.contains('cart-drawer') && document.querySelector('.view-products-panel.active')) {
        return;
      } else {
        document.body.classList.remove('open-cc');
        document.body.classList.remove('overflow-hidden');
      }

    }
  }
  customElements.define('side-panel-close', PanelClose);

  document.addEventListener('keyup', (e) => {
    if (e.code) {
      if (e.code.toUpperCase() === 'ESCAPE') {
        dispatchCustomEvent('panel:close');
      }
    }
  });
}
/**
 *  @class
 *  @function CartDrawer
 */
if (!customElements.get('cart-drawer')) {
  class CartDrawer extends HTMLElement {

    constructor() {
      super();
    }

    connectedCallback() {

      this.isOpen = false;
      let button = document.getElementById('cart-drawer-toggle');


      // Add functionality to buttons
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });

      this.debouncedOnChange = debounce((event) => {
        this.onChange(event);
      }, 300);

      document.addEventListener('cart:refresh', (event) => {
        this.refresh();
      });

      this.addEventListener('change', this.debouncedOnChange.bind(this));

      this.notesToggle();
      this.removeProductEvent();
    }
    onChange(event) {
      if (event.target.classList.contains('qty')) {
        this.updateQuantity(event.target.dataset.index, event.target.value);
      }
    }
    open() {
      document.body.classList.add('open-cc');
      this.classList.add('active');
      this.removeAttribute('inert');
      this.focus();
      this.isOpen = true;
      dispatchCustomEvent('cart-drawer:open');
    }
    close() {
      document.body.classList.remove('open-cc');
      this.classList.remove('active');
      this.setAttribute('inert', '');
      this.isOpen = false;
    }
    removeProductEvent() {
      let removes = this.querySelectorAll('.remove');

      removes.forEach((remove) => {
        remove.addEventListener('click', (event) => {
          this.updateQuantity(event.target.dataset.index, '0');

          event.preventDefault();
        });
      });
    }
    getSectionsToRender() {
      return [{
        id: 'Cart-Drawer',
        section: 'cart-drawer',
        selector: '.cart-drawer'
      },
      {
        id: 'cart-drawer-toggle',
        section: 'cart-bubble',
        selector: '.thb-item-count'
      }];
    }
    getSectionInnerHTML(html, selector) {
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector).innerHTML;
    }
    notesToggle() {
      let notes_toggle = document.getElementById('order-note-toggle');

      if (!notes_toggle) {
        return;
      }

      notes_toggle.addEventListener('click', (event) => {
        notes_toggle.nextElementSibling.classList.add('active');
      });
      notes_toggle.nextElementSibling.querySelectorAll('.button, .order-note-toggle__content-overlay').forEach((el) => {
        el.addEventListener('click', (event) => {
          notes_toggle.nextElementSibling.classList.remove('active');
          this.saveNotes();
        });
      });
    }
    saveNotes() {
      fetch(`${theme.routes.cart_update_url}.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': `application/json`
        },
        body: JSON.stringify({
          'note': document.getElementById('mini-cart__notes').value
        })
      });
    }
    updateQuantity(line, quantity) {
      this.querySelector(`#CartDrawerItem-${line}`)?.classList.add('thb-loading');
      const body = JSON.stringify({
        line,
        quantity,
        sections: this.getSectionsToRender().map((section) => section.section),
        sections_url: window.location.pathname
      });

      dispatchCustomEvent('line-item:change:start', {
        quantity: quantity
      });

      fetch(`${theme.routes.cart_change_url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': `application/json`
        },
        ...{
          body
        }
      })
        .then((response) => {
          return response.text();
        })
        .then((state) => {
          const parsedState = JSON.parse(state);

          this.getSectionsToRender().forEach((section => {
            const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);

            if (parsedState.sections) {
              elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
            }
          }));

          this.removeProductEvent();
          this.notesToggle();
          dispatchCustomEvent('line-item:change:end', {
            quantity: quantity,
            cart: parsedState
          });

          this.querySelector(`#CartDrawerItem-${line}`)?.classList.remove('thb-loading');
        });
    }
    refresh() {
      let sections = 'cart-drawer,cart-bubble';
      fetch(`${window.location.pathname}?sections=${sections}`)
        .then((response) => {
          return response.text();
        })
        .then((state) => {
          const parsedState = JSON.parse(state);

          this.getSectionsToRender().forEach((section => {
            const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);

            elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState[section.section], section.selector);
          }));

          this.removeProductEvent();
          this.notesToggle();
        });
    }
  }
  customElements.define('cart-drawer', CartDrawer);
}

/**
 *  @class
 *  @function ResizeSelect
 */
if (!customElements.get('resize-select')) {
  class ResizeSelect extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.select = this.querySelector('select');
      this.resizeSelect();
      this.addEventListeners();
    }
    addEventListeners() {
      this.addEventListener('change', this.resizeSelect.bind(this));
      window.addEventListener('load', this.resizeSelect.bind(this));
      window.addEventListener('resize-select', this.resizeSelect.bind(this));
    }
    resizeSelect() {
      let tempOption = document.createElement('option');
      tempOption.textContent = this.select.selectedOptions[0].textContent;

      let tempSelect = document.createElement('select'),
        offset = 10;
      tempSelect.style.visibility = 'hidden';
      tempSelect.style.position = 'fixed';
      tempSelect.appendChild(tempOption);
      this.after(tempSelect);
      if (tempSelect.clientWidth > 0) {
        this.select.style.width = `${+tempSelect.clientWidth + offset}px`;
      }
      tempSelect.remove();
    }
  }
  customElements.define('resize-select', ResizeSelect);
}

/**
 *  @class
 *  @function QuickView
 */
if (!customElements.get('quick-view')) {
  class QuickView extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {
      this.cc = document.querySelector('.click-capture--product');
      this.drawer = document.getElementById('Product-Drawer');
      this.body = document.body;
      this.addEventListener('click', this.setupEventListener.bind(this));
      this.cc.addEventListener('click', this.setupCCEventListener.bind(this));
    }
    setupCCEventListener(e) {
      this.body.classList.remove('open-cc--product');
      this.drawer.classList.remove('active');
      this.drawer.setAttribute('inert', '');

      setTimeout(() => {
        this.drawer.querySelector('#Product-Drawer-Content').innerHTML = '';
      }, 260);

    }
    setupEventListener(e) {
      e.preventDefault();
      let productHandle = this.dataset.productHandle,
        href = `${theme.routes.root_url}/products/${productHandle}?view=quick-view`;

      // remove double `/` in case shop might have /en or language in URL
      href = href.replace('//', '/');
      if (!href || !productHandle) {
        return;
      }
      if (this.classList.contains('loading')) {
        return;
      }
      this.classList.add('loading');
      fetch(href, {
        method: 'GET'
      })
        .then((response) => {
          this.classList.remove('loading');
          return response.text();
        })
        .then(text => {
          const sectionInnerHTML = new DOMParser()
            .parseFromString(text, 'text/html')
            .querySelector('#Product-Drawer-Content').innerHTML;

          this.renderQuickview(sectionInnerHTML, href, productHandle);

        });
    }
    renderQuickview(sectionInnerHTML, href, productHandle) {
      if (sectionInnerHTML) {

        this.drawer.querySelector('#Product-Drawer-Content').innerHTML = sectionInnerHTML;

        let js_files = this.drawer.querySelector('#Product-Drawer-Content').querySelectorAll('script');

        if (js_files.length > 0) {
          var head = document.getElementsByTagName('head')[0];
          js_files.forEach((js_file, i) => {
            let script = document.createElement('script');
            script.src = js_file.src;
            head.appendChild(script);
          });
        }

        setTimeout(() => {
          if (Shopify && Shopify.PaymentButton) {
            Shopify.PaymentButton.init();
          }
          if (window.ProductModel) {
            window.ProductModel.loadShopifyXR();
          }
        }, 300);

        this.body.classList.add('open-cc--product');
        this.drawer.classList.add('active');
        this.drawer.removeAttribute('inert');

        this.drawer.focus();

        dispatchCustomEvent('quick-view:open', {
          productUrl: href,
          productHandle: productHandle
        });
        addIdToRecentlyViewed(productHandle);
      }
    }
  }
  customElements.define('quick-view', QuickView);
}


/**
 *  @class
 *  @function ThemeScroll
 */
if (!customElements.get('theme-scroll')) {
  class ThemeScroll extends HTMLElement {
    constructor() {
      super();

      this.viewport = this.querySelector('.theme-scroll--inner');
      this.slideWidth = 274;
      this.slidesToScroll = 1;
    }
    connectedCallback() {
      window.OverlayScrollbarsGlobal.OverlayScrollbars({
        target: this,
        elements: {
          viewport: this.viewport,
        },
        overflow: {
          y: 'hidden'
        }
      }, {});

      this.init();
    }
    init() {
      this.setSlides();
      this.reachedEnd = 0;

      if (this.slides.length < 1) {
        return;
      }
      this.nav = this.querySelector('.theme-scroll-nav');
      this.navPrev = this.querySelector('.flickity-prev');
      this.navNext = this.querySelector('.flickity-next');
      this.resizeObserver = new ResizeObserver((entries) => {
        this.slideWidth = this.slides[1].offsetLeft - this.slides[0].offsetLeft;
        this.reachedEnd = this.viewport.scrollWidth - this.viewport.offsetWidth == this.viewport.scrollLeft;
        this.onNavDisabled();
      }, {
        root: this
      });
      this.debouncedOnScroll = debounce((event) => {
        this.onScroll(event);
      }, 100);
      this.insertBefore(this.nav, this.querySelector('.os-scrollbar-vertical'));
      this.setListeners();
    }
    setSlides() {
      this.slides = this.querySelectorAll('.carousel__slide');
    }
    setListeners() {
      this.nav.addEventListener('click', this.onNavClick.bind(this));
      this.viewport.addEventListener('scroll', this.debouncedOnScroll.bind(this));
      this.viewport.addEventListener('resize', this.debouncedOnScroll.bind(this));
      this.resizeObserver.observe(this.slides[0]);
    }
    onScroll() {
      this.reachedEnd = (this.viewport.scrollWidth - this.viewport.offsetWidth) - Math.floor(this.viewport.scrollLeft) <= 1;
      this.onNavDisabled();
    }
    onNavClick(e) {
      if (!e.target.matches('.flickity-nav')) {
        return;
      }
      if (e.target.name === 'next') {
        this.scrollPos = this.viewport.scrollLeft + this.slidesToScroll * this.slideWidth;
      } else if (e.target.name === 'prev') {
        this.scrollPos = this.viewport.scrollLeft - this.slidesToScroll * this.slideWidth;
      }
      this.viewport.scrollTo({
        left: this.scrollPos,
        behavior: "smooth"
      });
    }
    onNavDisabled() {
      if (this.navPrev) {
        this.navPrev.disabled = this.viewport.scrollLeft === 0 ? 1 : 0;
      }
      if (this.navNext) {
        this.navNext.disabled = this.reachedEnd ? 1 : 0;
      }
    }
  }
  customElements.define('theme-scroll', ThemeScroll);
}

/**
 *  @class
 *  @function CollapsibleRow
 */
if (!customElements.get('collapsible-row')) {
  // https://css-tricks.com/how-to-animate-the-details-element/
  class CollapsibleRow extends HTMLElement {
    constructor() {
      super();

      this.details = this.querySelector('details');
      this.summary = this.querySelector('summary');
      this.content = this.querySelector('.collapsible__content');
      this.collapsed_mobile = this.classList.contains('accordion--collapsed-mobile');

      // Store the animation object (so we can cancel it if needed)
      this.animation = null;
      // Store if the element is closing
      this.isClosing = false;
      // Store if the element is expanding
      this.isExpanding = false;
    }
    connectedCallback() {
      this.setListeners();
    }
    setListeners() {
      if (this.initialized) { return; }
      this.querySelector('summary').addEventListener('click', (e) => this.onClick(e));

      this.initialized = true;
      if (this.collapsed_mobile) {
        window.addEventListener('resize', () => {
          this.details.open = window.innerWidth > 768;
        });
        window.dispatchEvent(new Event('resize'));
      }
    }
    onClick(e) {
      // Stop default behaviour from the browser
      e.preventDefault();
      // Add an overflow on the <details> to avoid content overflowing
      this.details.style.overflow = 'hidden';

      // Check if the element is being closed or is already closed
      if (this.isClosing || !this.details.open) {
        this.open();
        // Check if the element is being openned or is already open
      } else if (this.isExpanding || this.details.open) {
        this.shrink();
      }
    }
    shrink() {
      // Set the element as "being closed"
      this.isClosing = true;

      // Store the current height of the element
      const startHeight = `${this.details.offsetHeight}px`;
      // Calculate the height of the summary
      const endHeight = `${this.summary.offsetHeight}px`;

      // If there is already an animation running
      if (this.animation) {
        // Cancel the current animation
        this.animation.cancel();
      }

      // Start a WAAPI animation
      this.animation = this.details.animate({
        // Set the keyframes from the startHeight to endHeight
        height: [startHeight, endHeight]
      }, {
        duration: 250,
        easing: 'ease'
      });

      // When the animation is complete, call onAnimationFinish()
      this.animation.onfinish = () => this.onAnimationFinish(false);
      // If the animation is cancelled, isClosing variable is set to false
      this.animation.oncancel = () => this.isClosing = false;
    }

    open() {
      // Apply a fixed height on the element
      this.details.style.height = `${this.details.offsetHeight}px`;
      // Force the [open] attribute on the details element
      this.details.open = true;
      // Wait for the next frame to call the expand function
      window.requestAnimationFrame(() => this.expand());
    }

    expand() {
      // Set the element as "being expanding"
      this.isExpanding = true;
      // Get the current fixed height of the element
      const startHeight = `${this.details.offsetHeight}px`;
      // Calculate the open height of the element (summary height + content height)
      const endHeight = `${this.summary.offsetHeight + this.content.offsetHeight}px`;

      // If there is already an animation running
      if (this.animation) {
        // Cancel the current animation
        this.animation.cancel();
      }

      // Start a WAAPI animation
      this.animation = this.details.animate({
        // Set the keyframes from the startHeight to endHeight
        height: [startHeight, endHeight]
      }, {
        duration: 250,
        easing: 'ease-out'
      });
      // When the animation is complete, call onAnimationFinish()
      this.animation.onfinish = () => this.onAnimationFinish(true);
      // If the animation is cancelled, isExpanding variable is set to false
      this.animation.oncancel = () => this.isExpanding = false;
    }

    onAnimationFinish(open) {
      // Set the open attribute based on the parameter
      this.details.open = open;
      // Clear the stored animation
      this.animation = null;
      // Reset isClosing & isExpanding
      this.isClosing = false;
      this.isExpanding = false;
      // Remove the overflow hidden and the fixed height
      this.details.style.height = this.details.style.overflow = '';

      this.dispatchEvent(new Event('animationend', { bubbles: false }));
    }
  }
  customElements.define('collapsible-row', CollapsibleRow);
}

/**
 *  @function addIdToRecentlyViewed
 */
function addIdToRecentlyViewed(handle) {

  if (!handle) {
    let product = document.querySelector('.thb-product-detail');

    if (product) {
      handle = product.dataset.handle;
    }
  }
  if (!handle) {
    return;
  }
  if (window.localStorage) {
    let recentIds = window.localStorage.getItem('recently-viewed');
    if (recentIds != 'undefined' && recentIds != null) {
      window.recentlyViewedIds = JSON.parse(recentIds);
    }
  }
  // Remove current product if already in recently viewed array
  var i = window.recentlyViewedIds.indexOf(handle);

  if (i > -1) {
    window.recentlyViewedIds.splice(i, 1);
  }

  // Add id to array
  window.recentlyViewedIds.unshift(handle);

  if (window.localStorage) {
    window.localStorage.setItem('recently-viewed', JSON.stringify(window.recentlyViewedIds));
  }
}

/**
 *  Animations
 */
window.theme_animation_instances = createThemeAnimations();

function createThemeAnimations() {
  if (!document.body.classList.contains('animations-true')) {
    return false;
  }
  return ScrollTrigger.batch('.products .product-card--image-primary, .collection-card--link, .blog-post .featured-image--link, .image-with-text .image-with-text--image, .gallery .gallery-item--image, .multiple-media-with-text .multiple-media-with-text--image, .layered-images-with-text .layered-images-media', {
    start: "top 90%",
    onEnter: (elements) => {
      gsap.to(elements, { scale: 1, opacity: 1, stagger: 0.15, ease: window.theme.settings.animation_easing });
    }
  });
}
document.addEventListener('theme:reload_animations', () => {
  window.theme_animation_instances = createThemeAnimations();
});

document.addEventListener('DOMContentLoaded', () => {
  let scrollbarWidth = window.innerWidth - document.body.clientWidth;
  document.documentElement.style.setProperty('--scrollbar-width', scrollbarWidth + 'px');
});